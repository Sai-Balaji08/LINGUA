import { describe, expect, it } from "vitest";
import { MASTERED_INTERVAL_DAYS, MIN_EASE, isDifficult, isDue, isMastered, nextReview, previewInterval, type CardState } from "@/lib/srs";

const fresh: CardState = { ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0 };
const NOW = new Date("2026-10-30T12:00:00Z");

describe("nextReview", () => {
  it("again resets to a 1 day step, counts a lapse and lowers ease", () => {
    const r = nextReview({ ease_factor: 2.5, interval_days: 12, repetitions: 4, lapses: 0 }, 0, NOW);
    expect(r).toMatchObject({ interval_days: 1, repetitions: 0, lapses: 1, ease_factor: 2.3 });
    expect(r.due_at.toISOString()).toBe("2026-10-31T12:00:00.000Z");
  });

  it("first successful review: 1 day, or 3 days when easy", () => {
    expect(nextReview(fresh, 1, NOW).interval_days).toBe(1);
    expect(nextReview(fresh, 2, NOW).interval_days).toBe(1);
    expect(nextReview(fresh, 3, NOW).interval_days).toBe(3);
    expect(nextReview(fresh, 3, NOW).ease_factor).toBe(2.65);
  });

  it("second review steps: hard 2, good 3, easy 6", () => {
    const second: CardState = { ease_factor: 2.5, interval_days: 1, repetitions: 1, lapses: 0 };
    expect(nextReview(second, 1, NOW)).toMatchObject({ interval_days: 2, repetitions: 2, ease_factor: 2.35 });
    expect(nextReview(second, 2, NOW).interval_days).toBe(3);
    expect(nextReview(second, 3, NOW).interval_days).toBe(6);
  });

  it("later reviews grow the interval by ease, and always by at least a day", () => {
    const third: CardState = { ease_factor: 2.5, interval_days: 3, repetitions: 2, lapses: 0 };
    expect(nextReview(third, 2, NOW)).toMatchObject({ interval_days: 8, repetitions: 3, ease_factor: 2.5 });
    expect(nextReview(third, 1, NOW).interval_days).toBe(4);
    expect(nextReview(third, 3, NOW).interval_days).toBe(10);
    const tiny: CardState = { ease_factor: 1.3, interval_days: 1, repetitions: 2, lapses: 0 };
    expect(nextReview(tiny, 1, NOW).interval_days).toBeGreaterThan(1);
  });

  it("never lets ease drop below the floor", () => {
    let card: CardState = { ease_factor: 1.35, interval_days: 5, repetitions: 3, lapses: 0 };
    for (let i = 0; i < 5; i++) card = nextReview(card, 0, NOW);
    expect(card.ease_factor).toBe(MIN_EASE);
    expect(nextReview({ ...fresh, ease_factor: 1.3 }, 1, NOW).ease_factor).toBe(MIN_EASE);
  });

  it("does not mutate the input card", () => {
    const card = { ...fresh };
    nextReview(card, 3, NOW);
    expect(card).toEqual(fresh);
  });
});

describe("card status", () => {
  it("mastered starts at the configured interval", () => {
    expect(isMastered({ interval_days: MASTERED_INTERVAL_DAYS })).toBe(true);
    expect(isMastered({ interval_days: MASTERED_INTERVAL_DAYS - 1 })).toBe(false);
  });

  it("difficult means repeated lapses or low ease", () => {
    expect(isDifficult({ lapses: 2, ease_factor: 2.5 })).toBe(true);
    expect(isDifficult({ lapses: 0, ease_factor: 1.7 })).toBe(true);
    expect(isDifficult({ lapses: 1, ease_factor: 2.5 })).toBe(false);
  });

  it("isDue compares against now", () => {
    expect(isDue("2026-10-30T11:59:59Z", NOW)).toBe(true);
    expect(isDue("2026-10-30T12:00:01Z", NOW)).toBe(false);
  });

  it("previewInterval labels days", () => {
    expect(previewInterval(fresh, 0)).toBe("1 day");
    expect(previewInterval(fresh, 3)).toBe("3 days");
  });
});
