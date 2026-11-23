import type { Exercise } from "@/lib/types";
import type { Response } from "@/lib/exercises/validate";

/** Small deterministic shuffle so server and browser agree and the order is stable between renders. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** True when the learner has given enough of an answer to press "Check". */
export function isAnswered(exercise: Exercise, response: Response | null): boolean {
  if (!response) return false;
  switch (response.kind) {
    case "choice":
      return Boolean(response.optionId);
    case "text":
      return response.text.trim().length > 0;
    case "order":
      return response.tokens.length > 0;
    case "pairs": {
      const needed = exercise.exercise_options?.length ?? 0;
      return needed > 0 && Object.keys(response.pairs).length >= needed;
    }
    case "speech":
      return response.mode === "self" ? true : response.transcript.trim().length > 0;
  }
}

export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** The tapable words for a word-arrangement exercise, shuffled. Uses `content.bank` when the answer has been stripped. */
export function wordBank(exercise: Exercise): string[] {
  const bank = strings(exercise.content.bank);
  if (bank.length) return bank;
  return seededShuffle([...strings(exercise.content.answer), ...strings(exercise.content.distractors)], exercise.id);
}

/** Hides the right answers before exercises are sent to a screen that does not give instant feedback. */
export function stripAnswers(exercise: Exercise): Exercise {
  const content: Record<string, unknown> = { ...exercise.content };
  delete content.accepted;
  delete content.sample;
  if (exercise.type === "word_arrangement") {
    content.bank = wordBank(exercise);
    delete content.answer;
    delete content.distractors;
  }
  return {
    ...exercise,
    explanation: "",
    exercise_options: (exercise.exercise_options ?? []).map((o) => ({ ...o, is_correct: false })),
    content,
  };
}
