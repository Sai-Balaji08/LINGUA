import type { ExerciseType, Skill } from "@/lib/types";
import { parseAudioUrl } from "@/lib/admin/schemas";

/**
 * Turns the exercise editor form into the rows stored in the database.
 * Pure (no framework or database access) so it is unit-tested against validateAnswer: whatever this
 * builds must be answerable by the lesson player exactly as the admin intended.
 */

export const EXERCISE_TYPES: ExerciseType[] = [
  "multiple_choice",
  "translation",
  "fill_blank",
  "word_arrangement",
  "listening",
  "reading",
  "matching",
  "grammar",
  "writing",
  "speaking",
];
export const SKILLS: Skill[] = ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"];
export const CHOICE_TYPES: ExerciseType[] = ["multiple_choice", "listening", "reading", "grammar"];

export const TYPE_LABELS: Record<ExerciseType, string> = {
  multiple_choice: "Multiple choice",
  translation: "Translation",
  fill_blank: "Fill in the blank",
  word_arrangement: "Word arrangement",
  listening: "Listening",
  reading: "Reading",
  matching: "Matching",
  grammar: "Grammar",
  writing: "Writing",
  speaking: "Speaking",
};

export const DEFAULT_SKILL: Record<ExerciseType, Skill> = {
  multiple_choice: "vocabulary",
  translation: "vocabulary",
  fill_blank: "grammar",
  word_arrangement: "grammar",
  listening: "listening",
  reading: "reading",
  matching: "vocabulary",
  grammar: "grammar",
  writing: "writing",
  speaking: "speaking",
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MIN_PAIRS = 3;
export const MAX_PAIRS = 6;

export interface ExercisePayload {
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  instructions: string;
  explanation: string;
  audio_url: string | null;
  content: Record<string, unknown>;
}
export interface OptionPayload {
  text: string;
  match_text: string | null;
  is_correct: boolean;
  position: number;
}
export type BuildResult =
  | { ok: true; exercise: ExercisePayload; options: OptionPayload[] }
  | { ok: false; fieldErrors: Record<string, string> };

type FormLike = Pick<FormData, "get" | "getAll">;

const str = (f: FormLike, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const all = (f: FormLike, k: string) => f.getAll(k).map((v) => (typeof v === "string" ? v.trim() : ""));
const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function buildExercisePayload(form: FormLike): BuildResult {
  const errors: Record<string, string> = {};

  const type = str(form, "type") as ExerciseType;
  if (!EXERCISE_TYPES.includes(type)) errors.type = "Choose an exercise type.";
  const skill = str(form, "skill") as Skill;
  if (!SKILLS.includes(skill)) errors.skill = "Choose the skill this exercise assesses.";

  const prompt = str(form, "prompt");
  if (!prompt) errors.prompt = "The prompt is required.";
  else if (prompt.length > 500) errors.prompt = "The prompt must be at most 500 characters.";
  const instructions = str(form, "instructions");
  if (instructions.length > 300) errors.instructions = "Instructions must be at most 300 characters.";
  const explanation = str(form, "explanation");
  if (explanation.length > 1000) errors.explanation = "The explanation must be at most 1000 characters.";

  const audio = parseAudioUrl(str(form, "audio_url"));
  let audio_url: string | null = null;
  if (!audio.ok) errors.audio_url = audio.error;
  else audio_url = audio.url;

  const content: Record<string, unknown> = {};
  let options: OptionPayload[] = [];

  if (CHOICE_TYPES.includes(type)) {
    const rows = all(form, "option_text").map((text, index) => ({ text, index }));
    const kept = rows.filter((r) => r.text !== "");
    const rawCorrect = str(form, "correct");
    const correct = rawCorrect === "" ? NaN : Number(rawCorrect); // Number("") would be 0 and silently pick option 1
    if (kept.length < MIN_OPTIONS || kept.length > MAX_OPTIONS) {
      errors.options = `Add between ${MIN_OPTIONS} and ${MAX_OPTIONS} answer options.`;
    } else if (kept.some((r) => r.text.length > 200)) {
      errors.options = "Each option must be at most 200 characters.";
    } else if (new Set(kept.map((r) => norm(r.text))).size !== kept.length) {
      errors.options = "Options must all be different.";
    } else if (!Number.isInteger(correct) || !kept.some((r) => r.index === correct)) {
      errors.options = "Mark exactly one filled-in option as the correct answer.";
    } else {
      options = kept.map((r, position) => ({ text: r.text, match_text: null, is_correct: r.index === correct, position }));
    }

    if (type === "listening") {
      const speak = str(form, "speak");
      if (speak.length > 500) errors.speak = "The spoken text must be at most 500 characters.";
      else if (!speak && !audio_url) errors.speak = "Add text to be spoken aloud, or an audio file or link.";
      if (speak) content.speak = speak;
    }
    if (type === "reading") {
      const passage = str(form, "passage");
      if (!passage) errors.passage = "The reading passage is required.";
      else if (passage.length > 3000) errors.passage = "The passage must be at most 3000 characters.";
      else content.passage = passage;
    }
  } else if (type === "translation" || type === "fill_blank") {
    const accepted = lines(str(form, "accepted"));
    if (accepted.length === 0) errors.accepted = "Add at least one accepted answer (one per line).";
    else if (accepted.length > 20) errors.accepted = "At most 20 accepted answers.";
    else if (accepted.some((a) => a.length > 300)) errors.accepted = "Each accepted answer must be at most 300 characters.";
    else content.accepted = accepted;
  } else if (type === "word_arrangement") {
    const answer = str(form, "answer").split(/\s+/).filter(Boolean);
    const distractors = str(form, "distractors").split(/[\s,]+/).filter(Boolean);
    if (answer.length < 2) errors.answer = "Write the correct sentence with at least two words.";
    else if (answer.length > 20) errors.answer = "At most 20 words.";
    else content.answer = answer;
    if (distractors.length > 8) errors.distractors = "At most 8 extra words.";
    else content.distractors = distractors;
  } else if (type === "matching") {
    const left = all(form, "pair_left");
    const right = all(form, "pair_right");
    const pairs: { l: string; r: string }[] = [];
    let half = false;
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const l = left[i] ?? "";
      const r = right[i] ?? "";
      if (!l && !r) continue;
      if (!l || !r) half = true;
      else pairs.push({ l, r });
    }
    if (half) errors.pairs = "Complete or clear every pair.";
    else if (pairs.length < MIN_PAIRS || pairs.length > MAX_PAIRS) errors.pairs = `Add between ${MIN_PAIRS} and ${MAX_PAIRS} pairs.`;
    else if (pairs.some((p) => p.l.length > 100 || p.r.length > 100)) errors.pairs = "Each side must be at most 100 characters.";
    else if (new Set(pairs.map((p) => norm(p.l))).size !== pairs.length) errors.pairs = "The left-hand words must all be different.";
    else options = pairs.map((p, position) => ({ text: p.l, match_text: p.r, is_correct: false, position }));
  } else if (type === "writing") {
    const rawMin = str(form, "min_words");
    const minWords = rawMin === "" ? 5 : Number(rawMin);
    if (!Number.isInteger(minWords) || minWords < 1 || minWords > 500) errors.min_words = "Enter a whole number from 1 to 500.";
    else content.minWords = minWords;
    const keywords = str(form, "keywords")
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length > 10) errors.keywords = "At most 10 keywords.";
    else content.keywords = keywords;
    const sample = str(form, "sample");
    if (sample.length > 1000) errors.sample = "The sample answer must be at most 1000 characters.";
    else if (sample) content.sample = sample;
  } else if (type === "speaking") {
    const target = str(form, "target");
    if (!target) errors.target = "The phrase to say is required.";
    else if (target.length > 300) errors.target = "The phrase must be at most 300 characters.";
    else content.target = target;
    const hint = str(form, "hint");
    if (hint.length > 300) errors.hint = "The hint must be at most 300 characters.";
    else if (hint) content.hint = hint;
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, exercise: { type, skill, prompt, instructions, explanation, audio_url, content }, options };
}

/** Inverse of buildExercisePayload: the string values the editor form starts with when editing. */
export interface ExerciseFormValues {
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  instructions: string;
  explanation: string;
  audio_url: string;
  speak: string;
  passage: string;
  accepted: string;
  answer: string;
  distractors: string;
  min_words: string;
  keywords: string;
  sample: string;
  target: string;
  hint: string;
  options: string[];
  correct: number;
  pairs: { left: string; right: string }[];
}

export function emptyFormValues(type: ExerciseType = "multiple_choice"): ExerciseFormValues {
  return {
    type,
    skill: DEFAULT_SKILL[type],
    prompt: "",
    instructions: "",
    explanation: "",
    audio_url: "",
    speak: "",
    passage: "",
    accepted: "",
    answer: "",
    distractors: "",
    min_words: "5",
    keywords: "",
    sample: "",
    target: "",
    hint: "",
    options: ["", "", "", ""],
    correct: 0,
    pairs: [
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
    ],
  };
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export function exerciseToFormValues(
  ex: { type: ExerciseType; skill: Skill; prompt: string; instructions: string; explanation: string; audio_url: string | null; content: Record<string, unknown> },
  options: { text: string; match_text: string | null; is_correct: boolean; position: number }[],
): ExerciseFormValues {
  const base = emptyFormValues(ex.type);
  const sorted = [...options].sort((a, b) => a.position - b.position);
  const c = ex.content ?? {};
  const out: ExerciseFormValues = {
    ...base,
    skill: ex.skill,
    prompt: ex.prompt,
    instructions: ex.instructions ?? "",
    explanation: ex.explanation ?? "",
    audio_url: ex.audio_url ?? "",
    speak: asString(c.speak),
    passage: asString(c.passage),
    accepted: asStrings(c.accepted).join("\n"),
    answer: asStrings(c.answer).join(" "),
    distractors: asStrings(c.distractors).join(", "),
    min_words: typeof c.minWords === "number" ? String(c.minWords) : "5",
    keywords: asStrings(c.keywords).join(", "),
    sample: asString(c.sample),
    target: asString(c.target),
    hint: asString(c.hint),
  };
  if (CHOICE_TYPES.includes(ex.type) && sorted.length) {
    const texts = sorted.map((o) => o.text);
    while (texts.length < 4) texts.push("");
    out.options = texts;
    out.correct = Math.max(0, sorted.findIndex((o) => o.is_correct));
  }
  if (ex.type === "matching" && sorted.length) {
    const pairs = sorted.map((o) => ({ left: o.text, right: o.match_text ?? "" }));
    while (pairs.length < MIN_PAIRS) pairs.push({ left: "", right: "" });
    out.pairs = pairs;
  }
  return out;
}
