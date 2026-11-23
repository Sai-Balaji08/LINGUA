import { describe, expect, it } from "vitest";
import { addDays, average, computeStreak, dayKey, isValidTimeZone, lastDays, minutes, percent, secondsByDay } from "@/lib/stats";

describe("dayKey", () => {
  it("uses the learner's own calendar day across midnight", () => {
    const instant = "2026-10-30T19:00:00Z"; // 00:30 on 31 Oct in India
    expect(dayKey(instant, "UTC")).toBe("2026-10-30");
    expect(dayKey(instant, "Asia/Calcutta")).toBe("2026-10-31");
    expect(dayKey(instant, "America/Los_Angeles")).toBe("2026-10-30");
  });

  it("validates time zones", () => {
    expect(isValidTimeZone("Asia/Calcutta")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

describe("addDays / lastDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("is not affected by daylight saving changes", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("lists the last n days oldest first", () => {
    expect(lastDays(3, "UTC", new Date("2026-10-30T10:00:00Z"))).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(lastDays(2, "Asia/Calcutta", new Date("2026-10-30T19:00:00Z"))).toEqual(["2026-10-30", "2026-10-31"]);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-10-28", "2026-10-29", "2026-10-30"], "2026-10-30").current).toBe(3);
  });

  it("stays alive when only yesterday has activity", () => {
    expect(computeStreak(["2026-10-28", "2026-10-29"], "2026-10-30").current).toBe(2);
  });

  it("breaks after a whole missed day", () => {
    expect(computeStreak(["2026-10-27", "2026-10-28"], "2026-10-30").current).toBe(0);
    expect(computeStreak([], "2026-10-30")).toEqual({ current: 0, longest: 0 });
  });

  it("tracks the longest run separately", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-10", "2026-10-11"];
    expect(computeStreak(days, "2026-10-11")).toEqual({ current: 2, longest: 3 });
  });

  it("ignores duplicate days", () => {
    expect(computeStreak(["2026-10-30", "2026-10-30"], "2026-10-30").current).toBe(1);
  });
});

describe("small helpers", () => {
  it("sums seconds per local day", () => {
    const map = secondsByDay(
      [
        { started_at: "2026-10-30T19:00:00Z", duration_seconds: 60 },
        { started_at: "2026-10-30T20:00:00Z", duration_seconds: 120 },
        { started_at: "2026-10-30T10:00:00Z", duration_seconds: 30 },
      ],
      "Asia/Calcutta",
    );
    expect(map.get("2026-10-31")).toBe(180);
    expect(map.get("2026-10-30")).toBe(30);
  });

  it("average, percent and minutes", () => {
    expect(average([])).toBeNull();
    expect(average([1, 2, 3])).toBe(2);
    expect(percent(1, 4)).toBe(25);
    expect(percent(1, 0)).toBe(0);
    expect(minutes(90)).toBe(2);
  });
});
