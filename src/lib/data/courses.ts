import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, Language, Lesson, Level, Unit, UserLanguage, UserProgress } from "@/lib/types";

/** Read-side helpers for the content hierarchy: Language → Course → Level → Unit → Lesson. */

export interface OutlineUnit {
  unit: Unit;
  lessons: Lesson[];
}
export interface OutlineLevel {
  level: Level;
  units: OutlineUnit[];
}
export interface CourseOutline {
  language: Language;
  course: Course;
  levels: OutlineLevel[];
}
export interface FlatLesson {
  lesson: Lesson;
  unit: Unit;
  level: Level;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Published languages, in display order. */
export async function getLanguages(supabase: SupabaseClient): Promise<Language[]> {
  const { data, error } = await supabase.from("languages").select("*").eq("published", true).order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as Language[];
}

/**
 * The published course for a language with its published levels, units and lessons, in one query.
 * Unpublished rows are filtered here as well as by RLS, because admins can read unpublished rows
 * and should still see the learner view on learner pages.
 */
export async function getCourseOutline(supabase: SupabaseClient, languageId: string): Promise<CourseOutline | null> {
  const { data: language } = await supabase.from("languages").select("*").eq("id", languageId).maybeSingle();
  if (!language || !(language as Language).published) return null;

  const { data, error } = await supabase
    .from("courses")
    .select("*, levels(*, units(*, lessons(*)))")
    .eq("language_id", languageId)
    .eq("published", true)
    .order("position")
    .limit(1);
  if (error) throw new Error(error.message);
  const raw = (data ?? [])[0] as
    | (Course & { levels: (Level & { units: (Unit & { lessons: Lesson[] })[] })[] })
    | undefined;
  if (!raw) return null;

  const { levels, ...course } = raw;
  return {
    language: language as Language,
    course: course as Course,
    levels: (levels ?? [])
      .filter((l) => l.published)
      .sort(byPosition)
      .map(({ units, ...level }) => ({
        level: level as Level,
        units: (units ?? [])
          .filter((u) => u.published)
          .sort(byPosition)
          .map(({ lessons, ...unit }) => ({
            unit: unit as Unit,
            lessons: (lessons ?? []).filter((x) => x.published).sort(byPosition),
          }))
          .filter((u) => u.lessons.length > 0),
      }))
      .filter((l) => l.units.length > 0),
  };
}

export function flattenLessons(outline: CourseOutline | null): FlatLesson[] {
  if (!outline) return [];
  return outline.levels.flatMap(({ level, units }) => units.flatMap(({ unit, lessons }) => lessons.map((lesson) => ({ lesson, unit, level }))));
}

/** Every lesson the user has started or completed, keyed by lesson id. */
export async function getProgressMap(supabase: SupabaseClient, userId: string): Promise<Map<string, UserProgress>> {
  const { data, error } = await supabase.from("user_progress").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as UserProgress[]).map((p) => [p.lesson_id, p]));
}

/**
 * The lesson to recommend next: the first one not yet completed, looking from the learner's start marker
 * (set by the placement check) onward. If everything after the marker is done, it looks from the beginning,
 * and when the whole course is done it falls back to the first lesson so the learner can review.
 */
export function pickNextLesson(flat: FlatLesson[], progress: Map<string, UserProgress>, startLessonId?: string | null): FlatLesson | null {
  if (!flat.length) return null;
  const notDone = (f: FlatLesson) => progress.get(f.lesson.id)?.status !== "completed";
  const startIndex = startLessonId ? Math.max(0, flat.findIndex((f) => f.lesson.id === startLessonId)) : 0;
  return flat.slice(startIndex).find(notDone) ?? flat.find(notDone) ?? flat[0];
}

export function countCompleted(flat: FlatLesson[], progress: Map<string, UserProgress>): number {
  return flat.filter((f) => progress.get(f.lesson.id)?.status === "completed").length;
}

export async function getUserLanguage(supabase: SupabaseClient, userId: string, languageId: string): Promise<UserLanguage | null> {
  const { data, error } = await supabase.from("user_languages").select("*").eq("user_id", userId).eq("language_id", languageId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as UserLanguage | null) ?? null;
}
