"use client";

import { Check, Ear, Mic, Square, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/types";
import type { Response, Verdict } from "@/lib/exercises/validate";
import { seededShuffle, strings, wordBank } from "@/lib/exercises/helpers";
import { wordCount } from "@/lib/exercises/validate";

/**
 * The answer area for one exercise. It only collects a response; checking is done by the parent
 * (instant feedback in lessons, server-side scoring in the placement check).
 */

export interface ExerciseInputProps {
  exercise: Exercise;
  response: Response | null;
  onChange: (response: Response | null) => void;
  /** Locks the inputs once an answer has been checked. */
  locked?: boolean;
  /** BCP-47 locale used for speech, e.g. "es-ES". */
  locale: string;
  verdict?: Verdict | null;
}

export function speak(text: string, locale: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  u.rate = rate;
  window.speechSynthesis.speak(u);
  return true;
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const optionBase =
  "w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition focus-visible:outline-offset-2 disabled:cursor-default";

function optionTone(state: "idle" | "selected" | "right" | "wrong" | "dim") {
  switch (state) {
    case "selected":
      return "border-cobalt bg-cobalt-soft";
    case "right":
      return "border-mint bg-mint-soft";
    case "wrong":
      return "border-coral bg-coral-soft";
    case "dim":
      return "border-line bg-surface opacity-60";
    default:
      return "border-line bg-surface hover:border-cobalt/60 hover:bg-sunk";
  }
}

export function ExerciseInput(props: ExerciseInputProps) {
  const { exercise } = props;
  switch (exercise.type) {
    case "multiple_choice":
    case "grammar":
      return <ChoiceInput {...props} />;
    case "listening":
      return (
        <div className="space-y-4">
          <ListenPlayer exercise={exercise} locale={props.locale} />
          <ChoiceInput {...props} />
        </div>
      );
    case "reading":
      return (
        <div className="space-y-4">
          <Passage exercise={exercise} />
          <ChoiceInput {...props} />
        </div>
      );
    case "translation":
    case "fill_blank":
      return <TextInput {...props} multiline={false} />;
    case "writing":
      return <TextInput {...props} multiline />;
    case "word_arrangement":
      return <ArrangeInput {...props} />;
    case "matching":
      return <MatchInput {...props} />;
    case "speaking":
      return <SpeakInput {...props} />;
  }
}

/* ------------------------------ choice ------------------------------ */

function ChoiceInput({ exercise, response, onChange, locked, verdict }: ExerciseInputProps) {
  const options = [...(exercise.exercise_options ?? [])].sort((a, b) => a.position - b.position);
  const chosen = response?.kind === "choice" ? response.optionId : null;
  const showResult = Boolean(locked && verdict);

  return (
    <div role="radiogroup" aria-label="Answer options" className="grid gap-2.5">
      {options.map((o) => {
        const isChosen = chosen === o.id;
        const isRight = showResult && (o.is_correct || (verdict?.expected !== undefined && verdict.expected === o.text));
        const state = showResult ? (isRight ? "right" : isChosen ? "wrong" : "dim") : isChosen ? "selected" : "idle";
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={isChosen}
            disabled={locked}
            onClick={() => onChange({ kind: "choice", optionId: o.id })}
            className={`${optionBase} ${optionTone(state)} flex items-center justify-between gap-3`}
          >
            <span lang={undefined}>{o.text}</span>
            {showResult && isRight && <Check size={18} className="shrink-0 text-mint" aria-label="Correct answer" />}
            {showResult && !isRight && isChosen && <X size={18} className="shrink-0 text-coral" aria-label="Your answer" />}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ listening ------------------------------ */

function ListenPlayer({ exercise, locale }: { exercise: Exercise; locale: string }) {
  const spoken = typeof exercise.content.speak === "string" ? exercise.content.speak : "";
  const [supported, setSupported] = useState(true);
  const [showText, setShowText] = useState(false);
  const [plays, setPlays] = useState(0);

  useEffect(() => setSupported(canSpeak()), []);

  if (exercise.audio_url) {
    return (
      <div className="rounded-2xl border border-line bg-sunk p-4">
        <audio controls src={exercise.audio_url} className="w-full" preload="none">
          Your browser cannot play this audio.
        </audio>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-sunk p-4">
      <button
        type="button"
        className="btn-primary !px-5 !py-3"
        onClick={() => {
          if (speak(spoken, locale)) setPlays((n) => n + 1);
        }}
        disabled={!supported || !spoken}
      >
        <Volume2 size={18} aria-hidden="true" /> {plays ? "Play again" : "Play"}
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          if (speak(spoken, locale, 0.6)) setPlays((n) => n + 1);
        }}
        disabled={!supported || !spoken}
      >
        <Ear size={16} aria-hidden="true" /> Slower
      </button>
      {!supported && (
        <div className="w-full text-sm text-mute">
          Your browser cannot play speech.{" "}
          {showText ? (
            <span lang={locale} className="font-semibold text-ink">
              {spoken}
            </span>
          ) : (
            <button type="button" className="font-semibold text-cobalt underline" onClick={() => setShowText(true)}>
              Show the text instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ reading ------------------------------ */

function Passage({ exercise }: { exercise: Exercise }) {
  const passage = typeof exercise.content.passage === "string" ? exercise.content.passage : "";
  const glossary = (exercise.content.glossary ?? {}) as Record<string, string>;
  const entries = Object.entries(glossary).filter(([, v]) => typeof v === "string");
  return (
    <figure className="rounded-2xl border border-line bg-sunk p-4">
      <blockquote className="whitespace-pre-line text-base leading-relaxed">{passage}</blockquote>
      {entries.length > 0 && (
        <figcaption className="mt-3 border-t border-line pt-3 text-sm text-mute">
          <span className="font-semibold text-ink">Helpful words: </span>
          {entries.map(([k, v], i) => (
            <span key={k}>
              {i > 0 && " · "}
              {k} = {v}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------ text ------------------------------ */

function TextInput({ exercise, response, onChange, locked, multiline }: ExerciseInputProps & { multiline: boolean }) {
  const value = response?.kind === "text" ? response.text : "";
  const meaning = typeof exercise.content.meaning === "string" ? exercise.content.meaning : null;
  const keywords = strings(exercise.content.keywords);
  const minWords = typeof exercise.content.minWords === "number" ? exercise.content.minWords : null;
  const words = wordCount(value);

  return (
    <div className="space-y-3">
      {meaning && <p className="text-sm text-mute">Meaning: {meaning}</p>}
      {multiline ? (
        <textarea
          aria-label="Your answer"
          className="field min-h-36 text-base"
          value={value}
          disabled={locked}
          maxLength={1500}
          onChange={(e) => onChange({ kind: "text", text: e.target.value })}
          placeholder="Write here…"
        />
      ) : (
        <input
          aria-label="Your answer"
          className="field !py-3 text-base"
          value={value}
          disabled={locked}
          maxLength={300}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => onChange({ kind: "text", text: e.target.value })}
          placeholder="Type your answer"
        />
      )}
      {multiline && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
          {minWords && (
            <span className={words >= minWords ? "font-semibold text-mint" : ""}>
              {words} / {minWords} words
            </span>
          )}
          {keywords.length > 0 && <span>Try to use:</span>}
          {keywords.map((k) => (
            <span key={k} className="rounded-full bg-sunk px-2.5 py-1 font-medium text-ink">
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ word arrangement ------------------------------ */

function ArrangeInput({ exercise, response, onChange, locked }: ExerciseInputProps) {
  const bank = useMemo(() => wordBank(exercise), [exercise]);
  const chosen = response?.kind === "order" ? response.tokens : [];

  // Remove one bank entry per chosen word, so repeated words are handled correctly.
  const remaining = useMemo(() => {
    const left = [...bank.map((t, i) => ({ t, i }))];
    for (const token of chosen) {
      const idx = left.findIndex((x) => x.t === token);
      if (idx >= 0) left.splice(idx, 1);
    }
    return left;
  }, [bank, chosen]);

  const set = (tokens: string[]) => onChange(tokens.length ? { kind: "order", tokens } : null);

  return (
    <div className="space-y-4">
      <div
        aria-label="Your sentence"
        className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-sunk p-3"
      >
        {chosen.length === 0 && <span className="text-sm text-mute">Tap the words below to build the sentence.</span>}
        {chosen.map((t, i) => (
          <button
            key={`${t}-${i}`}
            type="button"
            disabled={locked}
            onClick={() => set(chosen.filter((_, j) => j !== i))}
            className="animate-pop rounded-xl border-2 border-cobalt bg-surface px-3.5 py-2 font-semibold shadow-sm transition hover:bg-cobalt-soft disabled:cursor-default"
            aria-label={`Remove ${t}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Word bank">
        {remaining.map(({ t, i }) => (
          <button
            key={`${t}-${i}`}
            type="button"
            disabled={locked}
            onClick={() => set([...chosen, t])}
            className="rounded-xl border-2 border-line bg-surface px-3.5 py-2 font-semibold transition hover:border-cobalt/60 hover:bg-sunk disabled:opacity-50"
          >
            {t}
          </button>
        ))}
        {remaining.length === 0 && <span className="text-sm text-mute">All words used.</span>}
      </div>
    </div>
  );
}

/* ------------------------------ matching ------------------------------ */

const PAIR_TONES = ["bg-cobalt-soft border-cobalt", "bg-saffron-soft border-saffron", "bg-mint-soft border-mint", "bg-coral-soft border-coral", "bg-sunk border-ink", "bg-cobalt-soft border-ink"];

function MatchInput({ exercise, response, onChange, locked, verdict }: ExerciseInputProps) {
  const left = useMemo(() => [...(exercise.exercise_options ?? [])].sort((a, b) => a.position - b.position), [exercise]);
  const right = useMemo(() => seededShuffle(left.map((o) => o.match_text ?? ""), exercise.id), [left, exercise.id]);
  const pairs = response?.kind === "pairs" ? response.pairs : {};
  const [active, setActive] = useState<string | null>(null);

  const colourOf = (leftText: string) => PAIR_TONES[left.findIndex((o) => o.text === leftText) % PAIR_TONES.length];
  const leftFor = (rightText: string) => Object.keys(pairs).find((k) => pairs[k] === rightText);

  function pickLeft(text: string) {
    if (locked) return;
    if (pairs[text]) {
      // Tapping a paired word unpairs it.
      const next = { ...pairs };
      delete next[text];
      onChange(Object.keys(next).length ? { kind: "pairs", pairs: next } : null);
      setActive(text);
    } else {
      setActive((a) => (a === text ? null : text));
    }
  }

  function pickRight(text: string) {
    if (locked || !active) return;
    const next = { ...pairs };
    const previous = leftFor(text);
    if (previous) delete next[previous];
    next[active] = text;
    onChange({ kind: "pairs", pairs: next });
    setActive(null);
  }

  const correctPair = (o: { text: string; match_text: string | null }) => pairs[o.text] === o.match_text;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6">
      <ul className="space-y-2.5" aria-label="Words">
        {left.map((o) => {
          const paired = pairs[o.text];
          const tone = locked && verdict ? (correctPair(o) ? "border-mint bg-mint-soft" : "border-coral bg-coral-soft") : paired ? colourOf(o.text) : active === o.text ? "border-cobalt bg-cobalt-soft" : "border-line bg-surface hover:bg-sunk";
          return (
            <li key={o.id}>
              <button type="button" disabled={locked} onClick={() => pickLeft(o.text)} aria-pressed={active === o.text} className={`${optionBase} ${tone}`}>
                {o.text}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="space-y-2.5" aria-label="Meanings">
        {right.map((r) => {
          const owner = leftFor(r);
          const tone = locked && verdict ? "border-line bg-surface" : owner ? colourOf(owner) : active ? "border-line bg-surface hover:border-cobalt/60 hover:bg-sunk" : "border-line bg-surface";
          return (
            <li key={r}>
              <button type="button" disabled={locked || !active} onClick={() => pickRight(r)} className={`${optionBase} ${tone}`}>
                {r}
              </button>
            </li>
          );
        })}
      </ul>
      {!locked && <p className="col-span-2 text-sm text-mute">{active ? `Now tap the meaning of “${active}”.` : "Tap a word on the left, then its meaning on the right. Tap a matched word to undo."}</p>}
    </div>
  );
}

/* ------------------------------ speaking ------------------------------ */

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function SpeakInput({ exercise, response, onChange, locked, locale }: ExerciseInputProps) {
  const target = typeof exercise.content.target === "string" ? exercise.content.target : "";
  const hint = typeof exercise.content.hint === "string" ? exercise.content.hint : null;
  const transliteration = typeof exercise.content.transliteration === "string" ? exercise.content.transliteration : null;
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [selfMode, setSelfMode] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    setCanListen(getRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  function start() {
    const Ctor = getRecognition();
    if (!Ctor) return;
    setProblem(null);
    const rec = new Ctor();
    rec.lang = locale;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) onChange({ kind: "speech", mode: "recognized", transcript });
      else setProblem("We did not catch that. Try again.");
    };
    rec.onerror = () => {
      setProblem("The microphone is not available. You can rate yourself instead.");
      setSelfMode(true);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  const transcript = response?.kind === "speech" && response.mode === "recognized" ? response.transcript : "";
  const rating = response?.kind === "speech" && response.mode === "self" ? response.rating : null;
  const useSelf = selfMode || !canListen;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-sunk p-5 text-center">
        <p className="font-script text-2xl font-bold" lang={locale}>
          {target}
        </p>
        {transliteration && <p className="mt-1 text-sm text-mute">{transliteration}</p>}
        {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
        {canSpeak() && (
          <button type="button" className="btn-ghost mt-3" onClick={() => speak(target, locale)}>
            <Volume2 size={16} aria-hidden="true" /> Hear it
          </button>
        )}
      </div>

      {!useSelf && (
        <div className="space-y-3 text-center">
          <button
            type="button"
            disabled={locked}
            onClick={() => (listening ? recRef.current?.stop() : start())}
            className={`btn !px-6 !py-3 ${listening ? "bg-coral text-white" : "btn-primary"}`}
            aria-pressed={listening}
          >
            {listening ? (
              <>
                <Square size={16} aria-hidden="true" /> Stop
              </>
            ) : (
              <>
                <Mic size={18} aria-hidden="true" /> {transcript ? "Try again" : "Tap and speak"}
              </>
            )}
          </button>
          {transcript && (
            <p className="text-sm text-mute" role="status">
              We heard: <span className="font-semibold text-ink">{transcript}</span>
            </p>
          )}
          {problem && <p className="text-sm text-coral">{problem}</p>}
          {!locked && (
            <button type="button" className="text-sm font-semibold text-cobalt underline" onClick={() => setSelfMode(true)}>
              I cannot use my microphone
            </button>
          )}
        </div>
      )}

      {useSelf && (
        <div className="space-y-2">
          <p className="text-center text-sm text-mute">
            Say it out loud, then rate yourself. Self-ratings are saved but do not count toward your speaking score.
          </p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Rate yourself">
            {([
              [1, "Needs work"],
              [2, "Okay"],
              [3, "Confident"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                disabled={locked}
                onClick={() => onChange({ kind: "speech", mode: "self", rating: value })}
                className={`${optionBase} ${rating === value ? optionTone("selected") : optionTone("idle")} text-center`}
              >
                {label}
              </button>
            ))}
          </div>
          {canListen && !locked && (
            <button type="button" className="mx-auto block text-sm font-semibold text-cobalt underline" onClick={() => setSelfMode(false)}>
              Use the microphone instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
