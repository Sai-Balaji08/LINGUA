"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { previewInterval, type Rating } from "@/lib/srs";
import type { SavedWord } from "@/lib/data/vocabulary";
import { Notice, ProgressBar } from "@/components/ui/Feedback";
import { SpeakButton } from "@/components/vocab/SpeakButton";
import { finishReview, reviewWord } from "@/app/(app)/vocabulary/actions";

const BUTTONS: { rating: Rating; label: string; tone: string }[] = [
  { rating: 0, label: "Again", tone: "border-coral bg-coral-soft" },
  { rating: 1, label: "Hard", tone: "border-saffron bg-saffron-soft" },
  { rating: 2, label: "Good", tone: "border-cobalt bg-cobalt-soft" },
  { rating: 3, label: "Easy", tone: "border-mint bg-mint-soft" },
];

export function ReviewSession({ cards, locale }: { cards: SavedWord[]; locale: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [finished, setFinished] = useState(false);
  const started = useRef(Date.now());
  const cardStart = useRef(Date.now());
  const card = cards[index];

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || pending) return;
      setPending(true);
      setError(null);
      const res = await reviewWord({ userVocabularyId: card.id, rating, timeMs: Date.now() - cardStart.current });
      if (!res.ok) {
        setError(res.error ?? "Could not save that review.");
        setPending(false);
        return;
      }
      setCounts((c) => ({ ...c, [(["again", "hard", "good", "easy"] as const)[rating]]: c[(["again", "hard", "good", "easy"] as const)[rating]] + 1 }));
      if (index < cards.length - 1) {
        setIndex(index + 1);
        setRevealed(false);
        cardStart.current = Date.now();
      } else {
        await finishReview({ cards: cards.length, durationSeconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)) });
        setFinished(true);
      }
      setPending(false);
    },
    [card, cards.length, index, pending],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        if (t?.tagName === "BUTTON") return;
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) void rate((Number(e.key) - 1) as Rating);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate, revealed]);

  if (finished) {
    return (
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-mint-soft text-mint"><Check size={40} aria-hidden="true" /></div>
        <h1 className="text-3xl font-extrabold">Review done</h1>
        <p className="text-mute">You reviewed {cards.length} {cards.length === 1 ? "word" : "words"}. Words you rated Again will come back tomorrow.</p>
        <ul className="grid grid-cols-4 gap-2 text-sm">
          {BUTTONS.map((b) => (
            <li key={b.label} className={`rounded-xl border-2 p-3 ${b.tone}`}>
              <span className="block font-display text-2xl font-extrabold">{Object.values(counts)[b.rating]}</span>
              {b.label}
            </li>
          ))}
        </ul>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Back to home</Link>
          <Link href="/vocabulary" className="btn-ghost">My words</Link>
        </div>
      </div>
    );
  }

  const w = card.vocabulary;
  const state = { ease_factor: card.ease_factor, interval_days: card.interval_days, repetitions: card.repetitions, lapses: card.lapses };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/vocabulary" className="btn-quiet !px-2.5" aria-label="Stop reviewing">✕</Link>
        <div className="flex-1"><ProgressBar value={(index / cards.length) * 100} label="Review progress" tone="mint" /></div>
        <span className="text-sm font-medium text-mute" aria-live="polite">{index + 1}/{cards.length}</span>
      </div>

      <motion.div key={card.id} {...(reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } })} className="card min-h-72 p-6 text-center sm:p-8" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-wide text-mute">{w.part_of_speech ?? "Word"}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <p lang={locale} className="font-script text-4xl font-bold sm:text-5xl">{w.term}</p>
          <SpeakButton text={w.term} locale={locale} />
        </div>
        {w.transliteration && <p className="mt-1 text-mute">{w.transliteration}</p>}

        {revealed ? (
          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <p className="text-2xl font-bold">{w.translation}</p>
            {w.definition && <p className="text-sm text-mute">{w.definition}</p>}
            {w.example_sentence && (
              <p className="rounded-xl bg-sunk px-4 py-3 text-sm">
                <span lang={locale}>{w.example_sentence}</span>
                {w.example_translation && <span className="block text-mute">{w.example_translation}</span>}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-10 text-sm text-mute">Try to recall the meaning, then reveal it.</p>
        )}
      </motion.div>

      {error && <Notice tone="error">{error}</Notice>}

      {!revealed ? (
        <button type="button" className="btn-primary w-full !py-3.5 text-base" onClick={() => setRevealed(true)}>
          Show answer <ArrowRight size={18} aria-hidden="true" />
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you remember it?">
          {BUTTONS.map((b) => (
            <button key={b.label} type="button" disabled={pending} onClick={() => rate(b.rating)} className={`rounded-xl border-2 px-2 py-3 text-center text-sm font-semibold transition hover:brightness-95 disabled:opacity-50 ${b.tone}`}>
              {pending ? <Loader2 size={14} className="mx-auto animate-spin" aria-hidden="true" /> : <span className="block">{b.label}</span>}
              <span className="block text-xs font-normal text-mute">{previewInterval(state, b.rating)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-xs text-mute">{revealed ? "Keys 1 to 4 rate the card." : "Press Space to reveal."}</p>
    </div>
  );
}
