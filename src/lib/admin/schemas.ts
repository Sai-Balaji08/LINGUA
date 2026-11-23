import { z } from "zod";
import { fieldErrorsFrom } from "@/lib/action-state";

/** Validation for the admin forms. Everything an admin submits is re-validated here on the server. */

export const idSchema = z.guid("Invalid id."); // guid, not uuid: seed ids are hash-based and zod 4 uuid() demands RFC version bits

export const ENTITY_KINDS = ["language", "course", "level", "unit", "lesson"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];
export const ORDERED_KINDS = [...ENTITY_KINDS, "exercise"] as const;
export type OrderedKind = (typeof ORDERED_KINDS)[number];

export const ENTITY_CONFIG: Record<OrderedKind, { table: string; parent: string | null; label: string }> = {
  language: { table: "languages", parent: null, label: "language" },
  course: { table: "courses", parent: "language_id", label: "course" },
  level: { table: "levels", parent: "course_id", label: "level" },
  unit: { table: "units", parent: "level_id", label: "unit" },
  lesson: { table: "lessons", parent: "unit_id", label: "lesson" },
  exercise: { table: "exercises", parent: "lesson_id", label: "exercise" },
};

export const CHILD_OF: Record<EntityKind, EntityKind | null> = {
  language: "course",
  course: "level",
  level: "unit",
  unit: "lesson",
  lesson: null,
};

const req = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters.`)
    .transform((v) => (v === "" ? null : v));
const optText = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters.`);

const languageSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}$/, "Use a 2 or 3 letter language code, for example es."),
  name: req("Name", 60),
  native_name: req("Native name", 60),
  greeting: optText(60).transform((v) => v || "Hello"),
  speech_locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}-[A-Za-z0-9]{2,8}$/, "Use a locale such as es-ES or hi-IN."),
});

const courseSchema = z.object({
  title: req("Title", 120),
  description: optText(500),
  taught_in: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || "en")
    .pipe(z.string().regex(/^[a-z]{2,3}$/, "Use a 2 or 3 letter language code, for example en.")),
});

const levelSchema = z.object({
  code: req("Code", 10),
  title: req("Title", 80),
});

const unitSchema = z.object({
  title: req("Title", 120),
  description: optText(500),
});

const lessonSchema = z.object({
  title: req("Title", 120),
  description: optText(500),
  grammar_note: opt(2000),
  estimated_minutes: z.coerce
    .number({ message: "Enter a number of minutes." })
    .int("Whole minutes only.")
    .min(1, "At least 1 minute.")
    .max(60, "At most 60 minutes."),
});

const SCHEMAS = {
  language: { schema: languageSchema, fields: ["code", "name", "native_name", "greeting", "speech_locale"] },
  course: { schema: courseSchema, fields: ["title", "description", "taught_in"] },
  level: { schema: levelSchema, fields: ["code", "title"] },
  unit: { schema: unitSchema, fields: ["title", "description"] },
  lesson: { schema: lessonSchema, fields: ["title", "description", "grammar_note", "estimated_minutes"] },
} as const;

type Parsed = { ok: true; data: Record<string, unknown> } | { ok: false; fieldErrors: Record<string, string> };

/** Validates the form for one entity kind. Only the known fields are read, so extra fields are ignored. */
export function parseEntity(kind: EntityKind, form: Pick<FormData, "get">): Parsed {
  const { schema, fields } = SCHEMAS[kind];
  const raw: Record<string, string> = {};
  for (const f of fields) {
    const v = form.get(f);
    raw[f] = typeof v === "string" ? v : "";
  }
  const result = schema.safeParse(raw);
  if (!result.success) return { ok: false, fieldErrors: fieldErrorsFrom(result.error.issues) };
  return { ok: true, data: result.data as Record<string, unknown> };
}

const vocabSchema = z.object({
  term: req("Word", 100),
  translation: req("Translation", 150),
  transliteration: opt(100),
  part_of_speech: opt(30),
  definition: opt(300),
  example_sentence: opt(300),
  example_translation: opt(300),
});

export function parseVocabulary(form: Pick<FormData, "get">): Parsed {
  const raw: Record<string, string> = {};
  for (const f of Object.keys(vocabSchema.shape)) {
    const v = form.get(f);
    raw[f] = typeof v === "string" ? v : "";
  }
  const result = vocabSchema.safeParse(raw);
  if (!result.success) return { ok: false, fieldErrors: fieldErrorsFrom(result.error.issues) };
  return { ok: true, data: result.data as Record<string, unknown> };
}

export const AUDIO_MAX_BYTES = 5 * 1024 * 1024;
export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

/** An audio reference must be an https URL. Returns null for an empty value. */
export function parseAudioUrl(value: string): { ok: true; url: string | null } | { ok: false; error: string } {
  const v = value.trim();
  if (!v) return { ok: true, url: null };
  if (v.length > 500) return { ok: false, error: "The audio URL is too long." };
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return { ok: false, error: "Audio links must start with https://" };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "That does not look like a valid URL." };
  }
}
