import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, Exercise, Language, Lesson, Level, Unit, VocabularyWord } from "@/lib/types";

/** Everything the lesson page needs, loaded in three queries. Returns null unless every ancestor is published. */

export interface LessonBundle {
  lesson: Lesson;
  unit: Unit;
  level: Level;
  course: Course;
  language: Language;
  exercises: Exercise[];
  vocabulary: VocabularyWord[];
}

type LessonRow = Lesson & { units: Unit & { levels: Level & { courses: Course & { languages: Language } } } };

export async function getLessonBundle(supabase: SupabaseClient, lessonId: string): Promise<LessonBundle | null> {
  const [lessonRes, exerciseRes, vocabRes] = await Promise.all([
    supabase.from("lessons").select("*, units!inner(*, levels!inner(*, courses!inner(*, languages!inner(*))))").eq("id", lessonId).maybeSingle(),
    supabase.from("exercises").select("*, exercise_options(*)").eq("lesson_id", lessonId).order("position"),
    supabase.from("lesson_vocabulary").select("vocabulary(*)").eq("lesson_id", lessonId),
  ]);
  if (lessonRes.error) throw new Error(lessonRes.error.message);
  if (exerciseRes.error) throw new Error(exerciseRes.error.message);
  if (vocabRes.error) throw new Error(vocabRes.error.message);

  const row = lessonRes.data as LessonRow | null;
  if (!row) return null;
  const { units, ...lesson } = row;
  const { levels, ...unit } = units;
  const { courses, ...level } = levels;
  const { languages, ...course } = courses;

  // Admins can read unpublished rows through RLS; the learner view still hides them.
  if (!lesson.published || !unit.published || !level.published || !course.published || !languages.published) return null;

  const exercises = ((exerciseRes.data ?? []) as Exercise[]).map((e) => ({
    ...e,
    exercise_options: [...(e.exercise_options ?? [])].sort((a, b) => a.position - b.position),
  }));
  const vocabulary = ((vocabRes.data ?? []) as unknown as { vocabulary: VocabularyWord | null }[])
    .map((r) => r.vocabulary)
    .filter((v): v is VocabularyWord => v !== null);

  return { lesson: lesson as Lesson, unit: unit as Unit, level: level as Level, course: course as Course, language: languages, exercises, vocabulary };
}
