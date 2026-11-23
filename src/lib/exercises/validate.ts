import type { Exercise, ExerciseOption } from "@/lib/types";

/**
 * Answer validation for every exercise type.
 * Pure functions with no browser or database access, so the same code runs in the lesson player
 * (instant feedback) and in the server action that records the attempt (the score that is stored).
 */

export type Response =
  | { kind: "choice"; optionId: string }
  | { kind: "text"; text: string }
  | { kind: "order"; tokens: string[] }
  | { kind: "pairs"; pairs: Record<string, string> } // option.text -> chosen match_text
  | { kind: "speech"; mode: "recognized"; transcript: string }
  | { kind: "speech"; mode: "self"; rating: 1 | 2 | 3 };

export interface Verdict {
  correct: boolean;
  /** 0..1. Partial credit is possible for matching and writing. */
  score: number;
  /** false when the skill could not actually be assessed (self-rated speaking). */
  measured: boolean;
  /** Short, specific message shown under the answer. */
  feedback: string;
  /** What a good answer looks like, shown when the learner is wrong. */
  expected?: string;
}

/** Lowercase, trim, collapse spaces, drop punctuation. Keeps letters from every script. */
export function normalize(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC`\u00B4]/g, "'") // typographic apostrophes -> plain
    .replace(/[^\p{L}\p{M}\p{N}\s']/gu, " ") // \p{M} keeps Devanagari vowel signs and other combining marks
    .replace(/\s+/g, " ")
    .trim();
}

/** Same as normalize but also removes accents, used to detect "right words, wrong accents". */
export function stripAccents(input: string): string {
  // Only Latin accents are stripped; marks in other scripts (e.g. Devanagari vowel signs) change the word.
  return normalize(input).normalize("NFD").replace(/(?<=\p{Script=Latin})\p{M}+/gu, "").normalize("NFC");
}

export function wordCount(input: string): number {
  const t = input.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Levenshtein-based similarity between 0 and 1. */
export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const m = x.length;
  const n = y.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)] as number[]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function checkText(accepted: string[], text: string): Verdict {
  const given = normalize(text);
  if (!given) return { correct: false, score: 0, measured: true, feedback: "Type an answer first." };
  const expected = accepted[0];
  if (accepted.some((a) => normalize(a) === given)) {
    return { correct: true, score: 1, measured: true, feedback: "Correct." };
  }
  if (accepted.some((a) => stripAccents(a) === stripAccents(text))) {
    return {
      correct: false,
      score: 0.5,
      measured: true,
      feedback: "Right words, but check the accents.",
      expected,
    };
  }
  return { correct: false, score: 0, measured: true, feedback: "Not quite.", expected };
}

export function validateAnswer(exercise: Exercise, response: Response | null): Verdict {
  const options: ExerciseOption[] = [...(exercise.exercise_options ?? [])].sort((a, b) => a.position - b.position);
  const content = exercise.content ?? {};

  if (!response) {
    return { correct: false, score: 0, measured: true, feedback: "No answer given." };
  }

  switch (exercise.type) {
    case "multiple_choice":
    case "listening":
    case "reading":
    case "grammar": {
      if (response.kind !== "choice") return invalid();
      const chosen = options.find((o) => o.id === response.optionId);
      const right = options.find((o) => o.is_correct);
      if (chosen?.is_correct) return { correct: true, score: 1, measured: true, feedback: "Correct." };
      return { correct: false, score: 0, measured: true, feedback: "Not quite.", expected: right?.text };
    }

    case "translation":
    case "fill_blank": {
      if (response.kind !== "text") return invalid();
      return checkText(strings(content.accepted), response.text);
    }

    case "word_arrangement": {
      if (response.kind !== "order") return invalid();
      const answer = strings(content.answer);
      const expected = answer.join(" ");
      const given = response.tokens.join(" ");
      if (!response.tokens.length) return { correct: false, score: 0, measured: true, feedback: "Tap the words to build the sentence." };
      if (normalize(given) === normalize(expected)) return { correct: true, score: 1, measured: true, feedback: "Correct." };
      return { correct: false, score: 0, measured: true, feedback: "The word order is off.", expected };
    }

    case "matching": {
      if (response.kind !== "pairs") return invalid();
      const total = options.length;
      if (!total) return invalid();
      const right = options.filter((o) => response.pairs[o.text] === o.match_text).length;
      const score = right / total;
      return {
        correct: right === total,
        score,
        measured: true,
        feedback: right === total ? "All pairs match." : `${right} of ${total} pairs match.`,
        expected: right === total ? undefined : options.map((o) => `${o.text} = ${o.match_text}`).join(", "),
      };
    }

    case "writing": {
      if (response.kind !== "text") return invalid();
      const min = typeof content.minWords === "number" ? content.minWords : 5;
      const keywords = strings(content.keywords);
      const text = normalize(response.text);
      const words = wordCount(response.text);
      const used = keywords.filter((k) => text.includes(normalize(k)));
      const lengthOk = words >= min;
      const needed = Math.min(keywords.length, Math.max(1, Math.ceil(keywords.length / 2)));
      const keywordOk = keywords.length === 0 || used.length >= needed;
      const lengthScore = Math.min(words / min, 1);
      const keywordScore = keywords.length === 0 ? 1 : Math.min(used.length / needed, 1);
      const score = Number(((lengthScore + keywordScore) / 2).toFixed(3));
      const sample = typeof content.sample === "string" ? content.sample : undefined;
      const missing = keywords.filter((k) => !used.includes(k));
      return {
        correct: lengthOk && keywordOk,
        score,
        measured: true,
        feedback: lengthOk && keywordOk
          ? "Good. You wrote enough and used the target words."
          : !lengthOk
            ? `Write at least ${min} words (you wrote ${words}).`
            : `Try to use: ${missing.slice(0, 3).join(", ")}.`,
        expected: sample,
      };
    }

    case "speaking": {
      if (response.kind !== "speech") return invalid();
      const target = typeof content.target === "string" ? content.target : "";
      if (response.mode === "self") {
        // Self-rated: recorded, but excluded from speaking analytics because nothing was measured.
        return {
          correct: response.rating >= 2,
          score: response.rating / 3,
          measured: false,
          feedback: "Recorded as self-assessed. It will not count toward your speaking score.",
        };
      }
      const sim = similarity(target, response.transcript);
      const correct = sim >= 0.75;
      return {
        correct,
        score: Number(sim.toFixed(3)),
        measured: true,
        feedback: correct ? "Clear. That matched the target phrase." : `We heard "${response.transcript}".`,
        expected: correct ? undefined : target,
      };
    }
  }
}

function invalid(): Verdict {
  return { correct: false, score: 0, measured: true, feedback: "That answer format does not fit this exercise." };
}

/** XP is an engagement stat only. It is never used in skill analytics. */
export function xpForScore(score: number, totalExercises: number): number {
  return Math.round(totalExercises * 2 + score * totalExercises * 3);
}

export const PASS_MARK = 70;
