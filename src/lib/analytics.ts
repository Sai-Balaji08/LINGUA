import { addDays, average, computeStreak, dayKey, lastDays, secondsByDay } from "@/lib/stats";
import type { Skill } from "@/lib/types";

/**
 * Pure aggregation for the progress page.
 * Two families of numbers are kept deliberately separate:
 *  - skill assessment: accuracy on exercises that actually measured a skill
 *  - engagement: minutes, streaks and XP, which say how much someone practised, not how well they can use the language
 */

export const SKILLS: Skill[] = ["reading", "listening", "writing", "speaking", "grammar", "vocabulary"];
/** Below this many measured answers a skill shows "not enough data" instead of a percentage. */
export const MIN_ATTEMPTS_FOR_SCORE = 5;

export interface SkillAttempt {
  skill: Skill;
  score: number | string; // numeric columns can arrive as strings
  measured: boolean;
  created_at: string;
}

export interface SkillSummary {
  skill: Skill;
  /** Measured answers only. */
  attempts: number;
  /** Answers that were recorded but not assessed (e.g. self-rated speaking). */
  unmeasured: number;
  /** 0..100, or null when nothing was measured. */
  accuracy: number | null;
  enough: boolean;
}

export function summarizeSkills(rows: SkillAttempt[]): SkillSummary[] {
  return SKILLS.map((skill) => {
    const mine = rows.filter((r) => r.skill === skill);
    const measured = mine.filter((r) => r.measured);
    const avg = average(measured.map((r) => Number(r.score)));
    return {
      skill,
      attempts: measured.length,
      unmeasured: mine.length - measured.length,
      accuracy: avg === null ? null : Math.round(avg * 100),
      enough: measured.length >= MIN_ATTEMPTS_FOR_SCORE,
    };
  });
}

export interface TrendPoint {
  /** First and last calendar day of the week bucket (YYYY-MM-DD). */
  start: string;
  end: string;
  attempts: number;
  accuracy: number | null;
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Average measured accuracy for each of the last `weeks` 7-day windows ending today, oldest first. */
export function weeklyTrend(rows: SkillAttempt[], tz = "UTC", now: Date = new Date(), weeks = 8): TrendPoint[] {
  const today = dayKey(now, tz);
  const buckets = Array.from({ length: weeks }, () => ({ sum: 0, n: 0 }));
  for (const r of rows) {
    if (!r.measured) continue;
    const diff = daysBetween(dayKey(r.created_at, tz), today);
    if (diff < 0 || diff >= weeks * 7) continue;
    const bucket = buckets[weeks - 1 - Math.floor(diff / 7)];
    bucket.sum += Number(r.score);
    bucket.n += 1;
  }
  return buckets.map((b, i) => ({
    start: addDays(today, -(weeks - i) * 7 + 1),
    end: addDays(today, -(weeks - 1 - i) * 7),
    attempts: b.n,
    accuracy: b.n ? Math.round((b.sum / b.n) * 100) : null,
  }));
}

/** One honest sentence about the trend, or null when there are fewer than two weeks with data. */
export function trendSummary(points: TrendPoint[]): string | null {
  const withData = points.filter((p) => p.accuracy !== null);
  if (withData.length < 2) return null;
  const first = withData[0];
  const last = withData[withData.length - 1];
  const delta = (last.accuracy as number) - (first.accuracy as number);
  if (Math.abs(delta) < 3) return "Your accuracy has been steady.";
  return delta > 0
    ? `Accuracy is up ${delta} points since your first week with data.`
    : `Accuracy is down ${Math.abs(delta)} points since your first week with data.`;
}

export interface DayMinutes {
  day: string;
  minutes: number;
  seconds: number;
}

export interface ActivitySummary {
  byDay: DayMinutes[];
  weekMinutes: number;
  totalMinutes: number;
  streak: { current: number; longest: number };
}

export function summarizeActivity(
  sessions: { started_at: string; duration_seconds: number }[],
  tz = "UTC",
  now: Date = new Date(),
): ActivitySummary {
  const perDay = secondsByDay(sessions, tz);
  const byDay = lastDays(7, tz, now).map((day) => {
    const seconds = perDay.get(day) ?? 0;
    return { day, seconds, minutes: Math.round(seconds / 60) };
  });
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  return {
    byDay,
    weekMinutes: Math.round(byDay.reduce((sum, d) => sum + d.seconds, 0) / 60),
    totalMinutes: Math.round(totalSeconds / 60),
    streak: computeStreak(perDay.keys(), dayKey(now, tz)),
  };
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
