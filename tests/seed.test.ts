import { describe, expect, it } from "vitest";
import { buildRows } from "../scripts/seed-data.mjs";
import { validateAnswer, type Response } from "@/lib/exercises/validate";
import { buildExercisePayload } from "@/lib/admin/exercise";
import type { Exercise, ExerciseOption } from "@/lib/types";

const rows = buildRows();

function exerciseWithOptions(id: string): Exercise {
  const e = rows.exercises.find((x) => x.id === id)!;
  const options = rows.options.filter((o) => o.exercise_id === id) as ExerciseOption[];
  return { ...(e as unknown as Exercise), exercise_options: options };
}

/** The answer a perfect learner would give. */
function perfectResponse(ex: Exercise): Response {
  const c = ex.content as Record<string, unknown>;
  const options = ex.exercise_options ?? [];
  switch (ex.type) {
    case "multiple_choice":
    case "listening":
    case "reading":
    case "grammar":
      return { kind: "choice", optionId: options.find((o) => o.is_correct)!.id };
    case "translation":
    case "fill_blank":
      return { kind: "text", text: (c.accepted as string[])[0] };
    case "word_arrangement":
      return { kind: "order", tokens: c.answer as string[] };
    case "matching":
      return { kind: "pairs", pairs: Object.fromEntries(options.map((o) => [o.text, o.match_text as string])) };
    case "writing":
      return { kind: "text", text: c.sample as string };
    case "speaking":
      return { kind: "speech", mode: "recognized", transcript: c.target as string };
  }
}

describe("seed curriculum", () => {
  it("has content for every language", () => {
    expect(rows.languages.length).toBeGreaterThanOrEqual(3);
    expect(rows.lessons.length).toBeGreaterThanOrEqual(6);
  });

  it("every exercise can be answered correctly", () => {
    for (const e of rows.exercises) {
      const ex = exerciseWithOptions(e.id);
      const verdict = validateAnswer(ex, perfectResponse(ex));
      expect(verdict.correct, `${e.type}: ${e.prompt}`).toBe(true);
      expect(verdict.score, e.prompt).toBe(1);
    }
  });

  it("every exercise has an explanation and a prompt", () => {
    for (const e of rows.exercises) {
      expect(e.prompt.trim().length, e.id).toBeGreaterThan(0);
      expect(e.explanation.trim().length, e.prompt).toBeGreaterThan(0);
    }
  });

  it("choice exercises have exactly one correct option and no duplicate options", () => {
    for (const e of rows.exercises.filter((x) => ["multiple_choice", "listening", "reading", "grammar"].includes(x.type))) {
      const opts = rows.options.filter((o) => o.exercise_id === e.id);
      expect(opts.filter((o) => o.is_correct), e.prompt).toHaveLength(1);
      expect(new Set(opts.map((o) => o.text)).size, e.prompt).toBe(opts.length);
    }
  });

  it("matching exercises have distinct pairs", () => {
    for (const e of rows.exercises.filter((x) => x.type === "matching")) {
      const opts = rows.options.filter((o) => o.exercise_id === e.id);
      expect(opts.length, e.prompt).toBeGreaterThanOrEqual(3);
      expect(new Set(opts.map((o) => o.text)).size, e.prompt).toBe(opts.length);
      expect(new Set(opts.map((o) => o.match_text)).size, e.prompt).toBe(opts.length);
    }
  });

  it("lessons mix exercise types (not only multiple choice)", () => {
    for (const l of rows.lessons) {
      const types = new Set(rows.exercises.filter((e) => e.lesson_id === l.id).map((e) => e.type));
      expect(types.size, String(l.title)).toBeGreaterThanOrEqual(4);
    }
  });

  it("ids are unique", () => {
    for (const key of ["languages", "courses", "levels", "units", "lessons", "exercises", "options", "vocabulary"] as const) {
      const ids = (rows[key] as { id: string }[]).map((r) => r.id);
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });
});

describe("admin exercise builder", () => {
  it("rejects a multiple choice without a correct answer", () => {
    const form = new FormData();
    form.set("type", "multiple_choice");
    form.set("skill", "vocabulary");
    form.set("prompt", "Pick one");
    ["a", "b", "c"].forEach((o) => form.append("option_text", o));
    const r = buildExercisePayload(form);
    expect(r.ok).toBe(false);
  });

  it("builds a valid translation exercise", () => {
    const form = new FormData();
    form.set("type", "translation");
    form.set("skill", "writing");
    form.set("prompt", "Thank you");
    form.set("accepted", "gracias\nmuchas gracias");
    const r = buildExercisePayload(form);
    expect(r.ok).toBe(true);
  });
});
