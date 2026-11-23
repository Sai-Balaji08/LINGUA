import { describe, expect, it } from "vitest";
import {
  MIN_ATTEMPTS_FOR_SCORE,
  daysBetween,
  formatMinutes,
  summarizeActivity,
  summarizeSkills,
  trendSummary,
  weeklyTrend,
  type SkillAttempt,
} from "@/lib/analytics";

const NOW = new Date("2026-10-30T12:00:00Z");
const row = (skill: SkillAttempt["skill"], score: number, measured = true, created_at = "2026-10-30T08:00:00Z"): SkillAttempt => ({
  skill,
  score,
  measured,
  created_at,
});

describe("summarizeSkills", () => {
  it("excludes unmeasured answers from accuracy and reports them separately", () => {
    const rows = [row("speaking", 1, false), row("speaking", 1, false), row("speaking", 1, false), row("speaking", 0.5), row("speaking", 0.5)];
    const speaking = summarizeSkills(rows).find((s) => s.skill === "speaking")!;
    expect(speaking.attempts).toBe(2);
    expect(speaking.unmeasured).toBe(3);
    expect(speaking.accuracy).toBe(50);
    expect(speaking.enough).toBe(false);
  });

  it("needs a minimum number of measured answers", () => {
    const rows = [1, 1, 1, 0, 0.5].map((s) => row("reading", s));
    const reading = summarizeSkills(rows).find((s) => s.skill === "reading")!;
    expect(reading.attempts).toBe(MIN_ATTEMPTS_FOR_SCORE);
    expect(reading.enough).toBe(true);
    expect(reading.accuracy).toBe(70);
  });

  it("returns every skill, with null accuracy when nothing was measured", () => {
    const result = summarizeSkills([]);
    expect(result).toHaveLength(6);
    expect(result.every((s) => s.accuracy === null && !s.enough && s.attempts === 0)).toBe(true);
  });

  it("accepts numeric strings from the database", () => {
    const listening = summarizeSkills([row("listening", "0.750" as unknown as number)]).find((s) => s.skill === "listening")!;
    expect(listening.accuracy).toBe(75);
  });
});

describe("weeklyTrend", () => {
  it("buckets measured answers into 7-day windows ending today", () => {
    const rows = [
      row("reading", 1, true, "2026-10-30T08:00:00Z"),
      row("reading", 0.5, true, "2026-10-23T08:00:00Z"), // 7 days ago -> previous week
      row("reading", 0, false, "2026-10-30T09:00:00Z"), // unmeasured, ignored
      row("reading", 1, true, "2026-08-01T08:00:00Z"), // outside the 8 weeks
    ];
    const trend = weeklyTrend(rows, "UTC", NOW, 8);
    expect(trend).toHaveLength(8);
    expect(trend[7]).toMatchObject({ accuracy: 100, attempts: 1, end: "2026-10-30", start: "2026-10-24" });
    expect(trend[6]).toMatchObject({ accuracy: 50, attempts: 1 });
    expect(trend.slice(0, 6).every((p) => p.accuracy === null)).toBe(true);
  });

  it("averages several answers in one week", () => {
    const trend = weeklyTrend([row("grammar", 1), row("grammar", 0)], "UTC", NOW, 4);
    expect(trend[3].accuracy).toBe(50);
    expect(trend[3].attempts).toBe(2);
  });
});

describe("trendSummary", () => {
  const point = (accuracy: number | null) => ({ start: "", end: "", attempts: accuracy === null ? 0 : 3, accuracy });
  it("needs two weeks of data", () => {
    expect(trendSummary([point(null), point(80)])).toBeNull();
  });
  it("describes improvement, decline and steadiness", () => {
    expect(trendSummary([point(60), point(null), point(75)])).toContain("up 15");
    expect(trendSummary([point(90), point(70)])).toContain("down 20");
    expect(trendSummary([point(80), point(81)])).toContain("steady");
  });
});

describe("summarizeActivity", () => {
  it("sums minutes for the week, the total and the streak in the learner's time zone", () => {
    const sessions = [
      { started_at: "2026-10-30T08:00:00Z", duration_seconds: 600 },
      { started_at: "2026-10-29T08:00:00Z", duration_seconds: 300 },
      { started_at: "2026-10-01T08:00:00Z", duration_seconds: 1200 },
    ];
    const a = summarizeActivity(sessions, "UTC", NOW);
    expect(a.byDay).toHaveLength(7);
    expect(a.byDay[6]).toMatchObject({ day: "2026-10-30", minutes: 10 });
    expect(a.weekMinutes).toBe(15);
    expect(a.totalMinutes).toBe(35);
    expect(a.streak.current).toBe(2);
  });
});

describe("helpers", () => {
  it("daysBetween and formatMinutes", () => {
    expect(daysBetween("2026-10-23", "2026-10-30")).toBe(7);
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(95)).toBe("1 h 35 min");
  });
});
