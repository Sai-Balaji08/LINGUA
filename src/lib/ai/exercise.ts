import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/lib/types";
import { strings } from "@/lib/exercises/helpers";

/** Small helpers for AI routes that work from a stored exercise. */

export function referenceAnswers(exercise: Exercise): string[] {
  const c = exercise.content ?? {};
  switch (exercise.type) {
    case "translation":
    case "fill_blank":
      return strings(c.accepted);
    case "word_arrangement":
      return [strings(c.answer).join(" ")];
    case "speaking":
      return typeof c.target === "string" ? [c.target] : [];
    case "writing":
      return typeof c.sample === "string" ? [c.sample] : [];
    case "matching":
      return (exercise.exercise_options ?? []).map((o) => `${o.text} = ${o.match_text}`);
    default:
      return (exercise.exercise_options ?? []).filter((o) => o.is_correct).map((o) => o.text);
  }
}

export function referenceAnswer(exercise: Exercise): string {
  return referenceAnswers(exercise).join("; ") || "(see the course note)";
}

export async function getLessonLanguageId(supabase: SupabaseClient, lessonId: string): Promise<string | null> {
  const { data } = await supabase.from("lessons").select("units(levels(courses(language_id)))").eq("id", lessonId).maybeSingle();
  const row = data as unknown as { units?: { levels?: { courses?: { language_id?: string } } } } | null;
  return row?.units?.levels?.courses?.language_id ?? null;
}
