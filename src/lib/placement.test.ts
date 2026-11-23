import { describe, expect, it } from "vitest";
import { evenlySpaced, placeLearner } from "@/lib/placement";

describe("evenlySpaced", () => {
  it("returns everything for short lists", () => {
    expect(evenlySpaced(3, 8)).toEqual([0, 1, 2]);
    expect(evenlySpaced(0, 8)).toEqual([]);
  });
  it("includes first and last", () => {
    const r = evenlySpaced(40, 8);
    expect(r).toHaveLength(8);
    expect(r[0]).toBe(0);
    expect(r[r.length - 1]).toBe(39);
  });
});

describe("placeLearner", () => {
  const q = (...c: boolean[]) => c.map((correct, i) => ({ lessonId: `l${i}`, correct }));
  it("starts at the beginning when the first answer is wrong", () => {
    expect(placeLearner(q(false, true, true))).toEqual({ startLessonId: null, score: 67 });
  });
  it("starts where the learner first slipped", () => {
    expect(placeLearner(q(true, true, false, true)).startLessonId).toBe("l2");
  });
  it("starts at the last sampled lesson when everything is right", () => {
    expect(placeLearner(q(true, true, true))).toEqual({ startLessonId: "l2", score: 100 });
  });
  it("handles an empty placement", () => {
    expect(placeLearner([])).toEqual({ startLessonId: null, score: 0 });
  });
});
