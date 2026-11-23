import type { EntityKind } from "@/lib/admin/schemas";

/** Which inputs the admin form shows for each content level. Matches the zod schemas in schemas.ts. */
export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number";
  hint?: string;
  placeholder?: string;
}

export const ENTITY_FIELDS: Record<EntityKind, FieldDef[]> = {
  language: [
    { name: "code", label: "Language code", hint: "2 or 3 letters, for example es or hi.", placeholder: "es" },
    { name: "name", label: "Name in English", placeholder: "Spanish" },
    { name: "native_name", label: "Name in the language itself", placeholder: "Español" },
    { name: "greeting", label: "Greeting", hint: "Shown on the landing page.", placeholder: "Hola" },
    { name: "speech_locale", label: "Speech locale", hint: "Used for browser voices, for example es-ES or hi-IN.", placeholder: "es-ES" },
  ],
  course: [
    { name: "title", label: "Course title" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "taught_in", label: "Explained in (language code)", hint: "The language the course instructions are written in.", placeholder: "en" },
  ],
  level: [
    { name: "code", label: "Level code", hint: "For example A1 or B2.", placeholder: "A1" },
    { name: "title", label: "Title", placeholder: "Beginner" },
  ],
  unit: [
    { name: "title", label: "Unit title" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  lesson: [
    { name: "title", label: "Lesson title" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "grammar_note", label: "Grammar or teaching note", type: "textarea", hint: "Shown before the exercises. Optional." },
    { name: "estimated_minutes", label: "Estimated minutes", type: "number", placeholder: "5" },
  ],
};

export const KIND_LABEL: Record<EntityKind, string> = {
  language: "Language",
  course: "Course",
  level: "Level",
  unit: "Unit",
  lesson: "Lesson",
};

export const KIND_PLURAL: Record<EntityKind, string> = {
  language: "Languages",
  course: "Courses",
  level: "Levels",
  unit: "Units",
  lesson: "Lessons",
};

/** One-line label for a row, used in lists and breadcrumbs. */
export function labelOf(kind: EntityKind, row: Record<string, unknown>): string {
  if (kind === "language") return String(row.name ?? "");
  if (kind === "level") return `${row.code ?? ""} · ${row.title ?? ""}`;
  return String(row.title ?? "");
}
