import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { requireOnboarded } from "@/lib/auth";
import { flattenLessons, getCourseOutline } from "@/lib/data/courses";
import { getLessonBundle } from "@/lib/data/lesson";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!z.guid().safeParse(lessonId).success) notFound();

  const { supabase, profile } = await requireOnboarded();
  const bundle = await getLessonBundle(supabase, lessonId);
  if (!bundle || bundle.exercises.length === 0) notFound();

  const outline = await getCourseOutline(supabase, bundle.language.id);
  const flat = flattenLessons(outline);
  const at = flat.findIndex((f) => f.lesson.id === lessonId);
  const next = at >= 0 ? flat[at + 1] : undefined;

  return (
    <LessonPlayer
      key={lessonId}
      lessonId={lessonId}
      title={bundle.lesson.title}
      description={bundle.lesson.description}
      grammarNote={bundle.lesson.grammar_note}
      estimatedMinutes={bundle.lesson.estimated_minutes}
      exercises={bundle.exercises}
      vocabulary={bundle.vocabulary}
      locale={bundle.language.speech_locale}
      languageName={bundle.language.name}
      aiEnabled={profile.allow_ai_feedback}
      nextLesson={next ? { id: next.lesson.id, title: next.lesson.title } : null}
    />
  );
}
