/**
 * Pure date and statistics helpers (no framework imports, so they are unit-tested).
 * Days are calendar days in the learner's own time zone, so a late-night lesson counts for "today".
 */

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" for an instant, as seen in the given time zone. */
export function dayKey(input: Date | string, tz = "UTC"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Subtracts whole calendar days from a day key. DST-safe because it works on the calendar, not on 24h blocks. */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** The last n day keys ending today, oldest first. */
export function lastDays(n: number, tz = "UTC", now: Date = new Date()): string[] {
  const today = dayKey(now, tz);
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

/**
 * Consecutive days with activity. The streak is still alive if today has no activity yet
 * but yesterday did, because the day is not over. It breaks only after a whole day is missed.
 */
export function computeStreak(activeDays: Iterable<string>, today: string): { current: number; longest: number } {
  const set = new Set(activeDays);
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { current, longest };
}

/** Sums seconds per day key. */
export function secondsByDay(rows: { started_at: string; duration_seconds: number }[], tz = "UTC"): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.started_at, tz);
    map.set(k, (map.get(k) ?? 0) + r.duration_seconds);
  }
  return map;
}

export function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
