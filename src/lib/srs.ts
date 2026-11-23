/**
 * Spaced repetition, a simplified SM-2.
 *
 * Ratings: 0 = again, 1 = hard, 2 = good, 3 = easy.
 * - "again" resets the card to a 1-day step and counts as a lapse.
 * - Otherwise the interval grows: 1 day, then 3 days, then interval * ease.
 * - Ease drifts with the rating and never drops below 1.3.
 */

export type Rating = 0 | 1 | 2 | 3;

export interface CardState {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
}

export interface Scheduled extends CardState {
  due_at: Date;
}

export const MIN_EASE = 1.3;
export const MASTERED_INTERVAL_DAYS = 21;
const DAY_MS = 86_400_000;

export function nextReview(card: CardState, rating: Rating, now: Date = new Date()): Scheduled {
  let { ease_factor: ease, interval_days: interval, repetitions: reps, lapses } = card;

  if (rating === 0) {
    reps = 0;
    lapses += 1;
    interval = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = rating === 3 ? 3 : 1;
    else if (reps === 2) interval = rating === 1 ? 2 : rating === 3 ? 6 : 3;
    else {
      const multiplier = rating === 1 ? 1.2 : rating === 3 ? ease * 1.3 : ease;
      interval = Math.max(interval + 1, Math.round(interval * multiplier));
    }
    ease = Math.max(MIN_EASE, ease + (rating === 3 ? 0.15 : rating === 1 ? -0.15 : 0));
  }

  ease = Number(ease.toFixed(2));
  return {
    ease_factor: ease,
    interval_days: interval,
    repetitions: reps,
    lapses,
    due_at: new Date(now.getTime() + interval * DAY_MS),
  };
}

export function isDue(dueAt: string | Date, now: Date = new Date()): boolean {
  return new Date(dueAt).getTime() <= now.getTime();
}

export function isMastered(card: Pick<CardState, "interval_days">): boolean {
  return card.interval_days >= MASTERED_INTERVAL_DAYS;
}

/** Words the learner keeps forgetting or finds hard. */
export function isDifficult(card: Pick<CardState, "lapses" | "ease_factor">): boolean {
  return card.lapses >= 2 || card.ease_factor < 1.8;
}

/** Human label for what each button will do, shown on flashcard buttons. */
export function previewInterval(card: CardState, rating: Rating): string {
  const days = nextReview(card, rating).interval_days;
  return days === 1 ? "1 day" : `${days} days`;
}
