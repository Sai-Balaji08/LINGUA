import { describe, expect, it } from "vitest";
import { pickNextLesson, type FlatLesson } from "@/lib/data/courses";
import type { UserProgress } from "@/lib/types";

const flat = ["a", "b", "c", "d"].map((id) => ({ lesson: { id }, unit: {}, level: {} }) as unknown as FlatLesson);
const done = (...ids: string[]) =>
  new Map(ids.map((id) => [id, { lesson_id: id, status: "completed" } as UserProgress]));

describe("pickNextLesson", () => {
  it("returns the first lesson for a new learner", () => {
    expect(pickNextLesson(flat, new Map())?.lesson.id).toBe("a");
  });
  it("skips completed lessons", () => {
    expect(pickNextLesson(flat, done("a", "b"))?.lesson.id).toBe("c");
  });
  it("starts from the placement marker", () => {
    expect(pickNextLesson(flat, new Map(), "c")?.lesson.id).toBe("c");
  });
  it("wraps to earlier unfinished lessons when everything after the marker is done", () => {
    expect(pickNextLesson(flat, done("c", "d"), "c")?.lesson.id).toBe("a");
  });
  it("falls back to the first lesson when the course is finished", () => {
    expect(pickNextLesson(flat, done("a", "b", "c", "d"))?.lesson.id).toBe("a");
  });
  it("returns null for an empty course", () => {
    expect(pickNextLesson([], new Map())).toBeNull();
  });
});
