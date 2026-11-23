import { z } from "zod";

/**
 * Schemas for what the model returns. Model output is untrusted too: it is parsed, trimmed and
 * length-bounded here before anything is stored or shown. Over-long strings and lists are truncated, not rejected.
 */

const clip = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const text = (max: number) => clip(max).pipe(z.string().min(1));

/** Keeps the valid items of a list (dropping malformed ones) and caps its length. */
function list<T>(item: z.ZodType<T>, max: number): z.ZodType<T[]> {
  return z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((arr) => {
      const out: T[] = [];
      for (const raw of arr) {
        const r = item.safeParse(raw);
        if (r.success) out.push(r.data);
        if (out.length >= max) break;
      }
      return out;
    });
}

export const correctionSchema = z.object({
  original: text(200),
  corrected: text(200),
  explanation: text(300),
});

export const vocabSchema = z.object({
  term: text(60),
  translation: text(100),
});

export const turnSchema = z.object({
  reply: text(700),
  corrections: list(correctionSchema, 5),
  alternatives: list(text(200), 3),
  vocabulary: list(vocabSchema, 6),
});

export const openerSchema = z.object({
  reply: text(700),
  vocabulary: list(vocabSchema, 6),
});

export const evaluationSchema = z.object({
  acceptable: z.boolean(),
  feedback: text(400),
});

export const explanationSchema = z.object({
  explanation: text(1200),
});

export const writingSchema = z.object({
  summary: text(500),
  strengths: list(text(200), 4),
  corrections: list(correctionSchema, 6),
});

export const suggestionsSchema = z.object({
  suggestions: list(text(240), 3),
});

export type TurnOutput = z.output<typeof turnSchema>;
export type OpenerOutput = z.output<typeof openerSchema>;
export type EvaluationOutput = z.output<typeof evaluationSchema>;
export type ExplanationOutput = z.output<typeof explanationSchema>;
export type WritingOutput = z.output<typeof writingSchema>;
export type SuggestionsOutput = z.output<typeof suggestionsSchema>;

/** Finds the first balanced {...} object in the text, ignoring braces inside strings. */
export function extractJsonObject(input: string): string | null {
  const cleaned = input.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Extracts JSON from raw model text and validates it. Never throws. */
export function parseModelJson<T>(raw: string, schema: z.ZodType<T>): ParseResult<T> {
  const json = extractJsonObject(raw);
  if (!json) return { ok: false, error: "No JSON object found." };
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Unexpected shape." };
  return { ok: true, data: parsed.data };
}
