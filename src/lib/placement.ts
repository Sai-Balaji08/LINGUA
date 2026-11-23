import type { Exercise, ExerciseType } from "@/lib/types";

/**
 * Placement check: a short sample of real exercises from across the course.
 * Nothing is marked complete. The result only moves the "start here" marker.
 */

export const PLACEMENT_TYPES: ExerciseType[] = ["multiple_choice", "grammar", "fill_blank", "translation", "listening", "reading"];
export const PLACEMENT_SIZE = 8;

/** Up to `count` indexes spread evenly from first to last. */
export function evenlySpaced(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const picks = new Set<number>();
  for (let i = 0; i < count; i++) picks.add(Math.round((i * (length - 1)) / (count - 1)));
  return [...picks].sort((a, b) => a - b);
}

/** One auto-checkable exercise per sampled lesson (the one nearest the middle of the lesson). */
export function pickFromLesson(exercises: Exercise[]): Exercise | null {
  const eligible = exercises.filter((e) => PLACEMENT_TYPES.includes(e.type)).sort((a, b) => a.position - b.position);
  if (!eligible.length) return null;
  return eligible[Math.floor((eligible.length - 1) / 2)];
}

export interface PlacementResult {
  /** The lesson at which the learner first slipped. null means "start at the beginning". */
  startLessonId: string | null;
  /** Percentage of sampled questions answered correctly. */
  score: number;
}

/**
 * `results` must be in course order. The learner starts where they first answer wrongly:
 * everything before that was shown to be comfortable. If every answer is right they start at the last sampled lesson.
 */
export function placeLearner(results: { lessonId: string; correct: boolean }[]): PlacementResult {
  if (!results.length) return { startLessonId: null, score: 0 };
  const right = results.filter((r) => r.correct).length;
  const score = Math.round((right / results.length) * 100);
  const firstMiss = results.findIndex((r) => !r.correct);
  if (firstMiss === 0) return { startLessonId: null, score };
  const at = firstMiss === -1 ? results.length - 1 : firstMiss;
  return { startLessonId: results[at].lessonId, score };
}
