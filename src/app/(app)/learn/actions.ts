"use server";

import { z } from "zod";
import { requireOnboarded } from "@/lib/auth";
import { answerSchema } from "@/lib/exercises/schema";
import { PASS_MARK, validateAnswer, xpForScore } from "@/lib/exercises/validate";
import type { Achievement, Exercise, Skill } from "@/lib/types";

/**
 * Records a finished lesson. The browser sends only the raw answers; the score is computed here,
 * from the real exercises, so a learner cannot post themselves a perfect result.
 */

const submitSchema = z.object({
  lessonId: z.guid(),
  answers: z.array(answerSchema).max(40),
  durationSeconds: z.number().int().min(0).max(4 * 3600),
});

export interface LessonResult {
  ok: true;
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  xp: number;
  firstCompletion: boolean;
  bySkill: { skill: Skill; correct: number; total: number }[];
  achievements: Pick<Achievement, "code" | "title" | "description">[];
}
export type SubmitLessonResult = LessonResult | { ok: false; error: string };

export async function submitLesson(input: unknown): Promise<SubmitLessonResult> {
  const { supabase, user } = await requireOnboarded();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That submission was not valid. Please try the lesson again." };
  const { lessonId, answers, durationSeconds } = parsed.data;

  // RLS only returns exercises of lessons whose whole chain is published.
  const { data, error } = await supabase.from("exercises").select("*, exercise_options(*)").eq("lesson_id", lessonId).order("position");
  if (error) return { ok: false, error: "Could not load the lesson to score it. Please try again." };
  const exercises = (data ?? []) as Exercise[];
  if (exercises.length === 0) return { ok: false, error: "This lesson is not available." };

  const byId = new Map(answers.map((a) => [a.exerciseId, a]));
  const scored = exercises.map((ex) => {
    const answer = byId.get(ex.id);
    const verdict = validateAnswer(ex, answer?.response ?? null);
    return { ex, answer, verdict };
  });

  const total = scored.length;
  const correct = scored.filter((s) => s.verdict.correct).length;
  const score = Number(((scored.reduce((sum, s) => sum + s.verdict.score, 0) / total) * 100).toFixed(2));
  const passed = score >= PASS_MARK;
  const xp = xpForScore(score / 100, total);
  // A lesson cannot plausibly take longer than 5 minutes per exercise.
  const duration = Math.min(durationSeconds, total * 300);

  const { data: attempt, error: attemptError } = await supabase
    .from("lesson_attempts")
    .insert({ user_id: user.id, lesson_id: lessonId, score, correct_count: correct, total_count: total, duration_seconds: duration, xp_earned: xp, passed })
    .select("id")
    .single();
  if (attemptError || !attempt) return { ok: false, error: "We could not save your result. Check your connection and try again." };

  const { error: rowsError } = await supabase.from("exercise_attempts").insert(
    scored.map((s) => ({
      attempt_id: attempt.id,
      user_id: user.id,
      exercise_id: s.ex.id,
      skill: s.ex.skill,
      score: s.verdict.score,
      is_correct: s.verdict.correct,
      measured: s.verdict.measured,
      response: s.answer?.response ?? {},
      time_ms: s.answer?.timeMs ?? 0,
    })),
  );
  if (rowsError) return { ok: false, error: "We could not save your answers. Please try again." };

  const { data: existing } = await supabase.from("user_progress").select("status, best_score, attempts, completed_at").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle();
  const wasCompleted = existing?.status === "completed";
  const completedNow = wasCompleted || passed;
  await supabase.from("user_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      status: completedNow ? "completed" : "in_progress",
      best_score: Math.max(Number(existing?.best_score ?? 0), score),
      attempts: (existing?.attempts ?? 0) + 1,
      completed_at: wasCompleted ? existing?.completed_at : passed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  await supabase.from("learning_sessions").insert({ user_id: user.id, activity: "lesson", ref_id: lessonId, duration_seconds: Math.max(duration, 1) });

  const { data: earned } = await supabase.rpc("evaluate_achievements");

  const skills = new Map<Skill, { correct: number; total: number }>();
  for (const s of scored) {
    const cur = skills.get(s.ex.skill) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (s.verdict.correct) cur.correct += 1;
    skills.set(s.ex.skill, cur);
  }

  return {
    ok: true,
    score,
    correct,
    total,
    passed,
    xp,
    firstCompletion: passed && !wasCompleted,
    bySkill: [...skills.entries()].map(([skill, v]) => ({ skill, ...v })),
    achievements: ((earned ?? []) as Achievement[]).map(({ code, title, description }) => ({ code, title, description })),
  };
}

/** Adds the words from a lesson to the learner's review deck. Safe to run twice. */
export async function saveLessonWords(lessonId: string): Promise<{ ok: boolean; added: number; error?: string }> {
  const { supabase, user } = await requireOnboarded();
  const id = z.guid().safeParse(lessonId);
  if (!id.success) return { ok: false, added: 0, error: "Invalid lesson." };

  const { data, error } = await supabase.from("lesson_vocabulary").select("vocabulary_id").eq("lesson_id", id.data);
  if (error) return { ok: false, added: 0, error: "Could not load the words." };
  const ids = (data ?? []).map((r) => r.vocabulary_id as string);
  if (!ids.length) return { ok: true, added: 0 };

  const { data: have } = await supabase.from("user_vocabulary").select("vocabulary_id").eq("user_id", user.id).in("vocabulary_id", ids);
  const already = new Set((have ?? []).map((r) => r.vocabulary_id as string));
  const fresh = ids.filter((v) => !already.has(v));
  if (fresh.length) {
    const { error: insertError } = await supabase.from("user_vocabulary").insert(fresh.map((vocabulary_id) => ({ user_id: user.id, vocabulary_id })));
    if (insertError) return { ok: false, added: 0, error: "Could not save the words." };
  }
  return { ok: true, added: fresh.length };
}
