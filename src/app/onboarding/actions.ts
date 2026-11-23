"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { preferencesSchema } from "@/lib/preferences";
import { answerSchema } from "@/lib/exercises/schema";
import { validateAnswer } from "@/lib/exercises/validate";
import { flattenLessons, getCourseOutline } from "@/lib/data/courses";
import { PLACEMENT_SIZE, evenlySpaced, pickFromLesson, placeLearner } from "@/lib/placement";
import { stripAnswers } from "@/lib/exercises/helpers";
import type { Exercise, Language } from "@/lib/types";

/** Server Actions for onboarding: the placement check and saving the six answers. */

export type PlacementLoad = { ok: true; questions: Exercise[]; locale: string } | { ok: false; error: string };

/** A short sample of real exercises from across the chosen language's course, with the answers removed. */
export async function loadPlacement(languageId: string): Promise<PlacementLoad> {
  const { supabase } = await requireUser();
  const id = z.guid().safeParse(languageId);
  if (!id.success) return { ok: false, error: "Choose a language first." };

  const outline = await getCourseOutline(supabase, id.data);
  const flat = flattenLessons(outline);
  if (!outline || flat.length === 0) return { ok: false, error: "That language does not have lessons yet." };

  const sampled = evenlySpaced(flat.length, PLACEMENT_SIZE).map((i) => flat[i]);
  const { data, error } = await supabase
    .from("exercises")
    .select("*, exercise_options(*)")
    .in("lesson_id", sampled.map((s) => s.lesson.id))
    .order("position");
  if (error) return { ok: false, error: "Could not load the placement check. You can skip it and start from the beginning." };

  const byLesson = new Map<string, Exercise[]>();
  for (const e of (data ?? []) as Exercise[]) byLesson.set(e.lesson_id, [...(byLesson.get(e.lesson_id) ?? []), e]);

  const questions = sampled
    .map((s) => pickFromLesson(byLesson.get(s.lesson.id) ?? []))
    .filter((e): e is Exercise => e !== null)
    .map(stripAnswers);
  if (questions.length < 3) return { ok: false, error: "There are not enough exercises for a placement check yet." };
  return { ok: true, questions, locale: outline.language.speech_locale };
}

const submitSchema = z.object({
  preferences: preferencesSchema,
  placement: z.array(answerSchema).max(PLACEMENT_SIZE).optional(),
});

export type OnboardingResult =
  | { ok: true; placement: { score: number; answered: number; startTitle: string | null } | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Saves preferences, marks the learner onboarded and (optionally) scores the placement check on the server. */
export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  const { supabase, user } = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Something is missing from your answers." };
  }
  const { preferences, placement } = parsed.data;

  const { data: language } = await supabase.from("languages").select("id, published").eq("id", preferences.target_language_id).maybeSingle();
  if (!language || !(language as Pick<Language, "published">).published) return { ok: false, error: "That language is not available." };

  // Score the placement check on the server, from the real exercises.
  let placementOut: { startLessonId: string | null; score: number; answered: number; startTitle: string | null } | null = null;
  if (placement && placement.length > 0) {
    const outline = await getCourseOutline(supabase, preferences.target_language_id);
    const flat = flattenLessons(outline);
    const order = new Map(flat.map((f, i) => [f.lesson.id, i]));
    const { data, error } = await supabase
      .from("exercises")
      .select("*, exercise_options(*)")
      .in("id", placement.map((p) => p.exerciseId));
    if (error) return { ok: false, error: "Could not score the placement check. Please try again." };

    const exercises = new Map(((data ?? []) as Exercise[]).filter((e) => order.has(e.lesson_id)).map((e) => [e.id, e]));
    const results = placement
      .filter((p) => exercises.has(p.exerciseId))
      .map((p) => {
        const ex = exercises.get(p.exerciseId) as Exercise;
        return { lessonId: ex.lesson_id, index: order.get(ex.lesson_id) as number, correct: validateAnswer(ex, p.response).correct };
      })
      .sort((a, b) => a.index - b.index);
    const placed = placeLearner(results);
    const start = flat.find((f) => f.lesson.id === placed.startLessonId);
    placementOut = { ...placed, answered: results.length, startTitle: start?.lesson.title ?? null };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...preferences, onboarded: true })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "We could not save your answers. Please try again." };

  const { error: langError } = await supabase.from("user_languages").upsert(
    {
      user_id: user.id,
      language_id: preferences.target_language_id,
      proficiency: preferences.proficiency,
      placement_score: placementOut?.score ?? null,
      start_lesson_id: placementOut?.startLessonId ?? null,
    },
    { onConflict: "user_id,language_id" },
  );
  if (langError) return { ok: false, error: "We saved your preferences but not your course. Please try again." };

  return {
    ok: true,
    placement: placementOut ? { score: placementOut.score, answered: placementOut.answered, startTitle: placementOut.startTitle } : null,
  };
}

