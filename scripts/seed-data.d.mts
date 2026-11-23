export function uid(key: string): string;
export interface SeedRows {
  languages: Record<string, unknown>[];
  courses: Record<string, unknown>[];
  levels: Record<string, unknown>[];
  units: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  exercises: (Record<string, unknown> & { id: string; lesson_id: string; type: string; skill: string; content: Record<string, unknown>; prompt: string; explanation: string; instructions: string; audio_url: string | null; position: number })[];
  options: { id: string; exercise_id: string; text: string; match_text: string | null; is_correct: boolean; position: number }[];
  vocabulary: Record<string, unknown>[];
  lessonVocabulary: { lesson_id: string; vocabulary_id: string }[];
}
export const languagesData: unknown[];
export function buildRows(langs?: unknown[]): SeedRows;
