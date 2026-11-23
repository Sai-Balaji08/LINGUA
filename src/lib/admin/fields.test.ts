import { describe, expect, it } from "vitest";
import { ENTITY_FIELDS, labelOf } from "@/lib/admin/fields";
import { ENTITY_KINDS, parseEntity } from "@/lib/admin/schemas";

const form = (values: Record<string, string>) => ({ get: (k: string) => (k in values ? values[k] : null) });

describe("admin entity fields", () => {
  it("every form field is read by the matching server validator", () => {
    // An empty form must produce errors only for fields the form actually shows.
    for (const kind of ENTITY_KINDS) {
      const shown = new Set(ENTITY_FIELDS[kind].map((f) => f.name));
      const result = parseEntity(kind, form({}));
      if (!result.ok) for (const name of Object.keys(result.fieldErrors)) expect(shown.has(name), `${kind}.${name}`).toBe(true);
    }
  });

  it("accepts a valid lesson and rejects bad minutes", () => {
    const ok = parseEntity("lesson", form({ title: "Greetings", description: "", grammar_note: "", estimated_minutes: "5" }));
    expect(ok.ok).toBe(true);
    const bad = parseEntity("lesson", form({ title: "Greetings", description: "", grammar_note: "", estimated_minutes: "500" }));
    expect(bad.ok).toBe(false);
  });

  it("validates language codes and locales", () => {
    const base = { name: "Spanish", native_name: "Español", greeting: "Hola" };
    expect(parseEntity("language", form({ ...base, code: "ES", speech_locale: "es-ES" })).ok).toBe(true);
    expect(parseEntity("language", form({ ...base, code: "spanish", speech_locale: "es-ES" })).ok).toBe(false);
    expect(parseEntity("language", form({ ...base, code: "es", speech_locale: "spanish" })).ok).toBe(false);
  });

  it("labels rows for breadcrumbs", () => {
    expect(labelOf("level", { code: "A1", title: "Beginner" })).toBe("A1 · Beginner");
    expect(labelOf("language", { name: "Hindi" })).toBe("Hindi");
  });
});
