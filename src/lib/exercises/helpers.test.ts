import { describe, expect, it } from "vitest";
import { isAnswered, seededShuffle } from "@/lib/exercises/helpers";
import type { Exercise } from "@/lib/types";

const ex = (over: Partial<Exercise>): Exercise => ({
  id: "e", lesson_id: "l", type: "multiple_choice", skill: "vocabulary", prompt: "p", instructions: "", explanation: "",
  audio_url: null, content: {}, position: 1, ...over,
});

describe("seededShuffle", () => {
  it("is deterministic and keeps every item", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6], "seed");
    expect(seededShuffle([1, 2, 3, 4, 5, 6], "seed")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("isAnswered", () => {
  it("needs all matching pairs", () => {
    const e = ex({ type: "matching", exercise_options: [
      { id: "1", exercise_id: "e", text: "a", match_text: "x", is_correct: false, position: 1 },
      { id: "2", exercise_id: "e", text: "b", match_text: "y", is_correct: false, position: 2 },
    ] });
    expect(isAnswered(e, { kind: "pairs", pairs: { a: "x" } })).toBe(false);
    expect(isAnswered(e, { kind: "pairs", pairs: { a: "x", b: "y" } })).toBe(true);
  });
  it("rejects blank text and empty order", () => {
    expect(isAnswered(ex({}), { kind: "text", text: "  " })).toBe(false);
    expect(isAnswered(ex({}), { kind: "order", tokens: [] })).toBe(false);
    expect(isAnswered(ex({}), null)).toBe(false);
  });
});
