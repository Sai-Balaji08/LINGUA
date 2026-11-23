"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookmarkPlus, Check, CheckCircle2, Loader2, RotateCcw, Trophy, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise, Skill, VocabularyWord } from "@/lib/types";
import { validateAnswer, type Response, type Verdict } from "@/lib/exercises/validate";
import { isAnswered } from "@/lib/exercises/helpers";
import { TYPE_LABELS } from "@/lib/admin/exercise";
import { ExerciseInput, speak, canSpeak } from "@/components/exercise/ExerciseInput";
import { AiHelp } from "@/components/ai/AiHelp";
import { Notice, ProgressBar } from "@/components/ui/Feedback";
import { saveLessonWords, submitLesson, type LessonResult } from "@/app/(app)/learn/actions";
import { Volume2 } from "lucide-react";

interface Props {
  lessonId: string;
  title: string;
  description: string;
  grammarNote: string | null;
  estimatedMinutes: number;
  exercises: Exercise[];
  vocabulary: VocabularyWord[];
  locale: string;
  languageName: string;
  aiEnabled: boolean;
  nextLesson: { id: string; title: string } | null;
}

type Phase = "intro" | "answer" | "feedback" | "saving" | "summary";

const SKILL_LABEL: Record<Skill, string> = { reading: "Reading", listening: "Listening", writing: "Writing", speaking: "Speaking", grammar: "Grammar", vocabulary: "Vocabulary" };

export function LessonPlayer(props: Props) {
  const { lessonId, exercises, vocabulary, locale } = props;
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [recorded, setRecorded] = useState<{ exerciseId: string; response: Response | null; timeMs: number }[]>([]);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [savedWords, setSavedWords] = useState<number | null>(null);
  const [savingWords, setSavingWords] = useState(false);
  const startedAt = useRef<number>(0);
  const exerciseStart = useRef<number>(0);

  const exercise = exercises[index];
  const total = exercises.length;

  const begin = useCallback(() => {
    startedAt.current = Date.now();
    exerciseStart.current = Date.now();
    setRecorded([]);
    setIndex(0);
    setResponse(null);
    setVerdict(null);
    setResult(null);
    setError(null);
    setPhase("answer");
  }, []);

  const check = useCallback(() => {
    if (!exercise || !isAnswered(exercise, response)) return;
    const v = validateAnswer(exercise, response);
    setVerdict(v);
    setRecorded((r) => [...r, { exerciseId: exercise.id, response, timeMs: Math.min(Date.now() - exerciseStart.current, 30 * 60_000) }]);
    setPhase("feedback");
  }, [exercise, response]);

  const finish = useCallback(
    async (answers: typeof recorded) => {
      setPhase("saving");
      setError(null);
      const res = await submitLesson({
        lessonId,
        answers,
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
      });
      if (!res.ok) {
        setError(res.error);
        setPhase("feedback");
        return;
      }
      setResult(res);
      setPhase("summary");
    },
    [lessonId],
  );

  const advance = useCallback(() => {
    if (index < total - 1) {
      setIndex(index + 1);
      setResponse(null);
      setVerdict(null);
      exerciseStart.current = Date.now();
      setPhase("answer");
    } else {
      void finish(recorded);
    }
  }, [finish, index, recorded, total]);

  // Enter checks or continues, unless the learner is typing a paragraph or focused on a button.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "AUDIO")) return;
      if (phase === "answer") check();
      else if (phase === "feedback" && !error) advance();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, check, error, phase]);

  // Warn before closing the tab mid-lesson.
  useEffect(() => {
    if (phase !== "answer" && phase !== "feedback") return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  async function saveWords() {
    setSavingWords(true);
    const res = await saveLessonWords(lessonId);
    setSavingWords(false);
    setSavedWords(res.ok ? res.added : null);
    if (!res.ok) setError(res.error ?? "Could not save the words.");
  }

  const motionProps = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.2 } };

  /* ------------------------------ intro ------------------------------ */
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/learn" className="btn-quiet -ml-3 mb-4">
          <X size={16} aria-hidden="true" /> Back to course
        </Link>
        <p className="text-sm font-semibold text-cobalt">
          {props.languageName} · {props.estimatedMinutes} min · {total} exercises
        </p>
        <h1 className="mt-1 text-4xl font-extrabold">{props.title}</h1>
        {props.description && <p className="mt-2 text-lg text-mute">{props.description}</p>}

        {props.grammarNote && (
          <section className="card mt-6 p-5" aria-labelledby="note">
            <h2 id="note" className="text-sm font-bold uppercase tracking-wide text-cobalt">Before you start</h2>
            <p className="mt-2 leading-relaxed">{props.grammarNote}</p>
          </section>
        )}

        {vocabulary.length > 0 && (
          <section className="card mt-4 p-5" aria-labelledby="words">
            <h2 id="words" className="text-sm font-bold uppercase tracking-wide text-cobalt">Words in this lesson</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {vocabulary.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl bg-sunk px-3 py-2">
                  <span>
                    <span lang={locale} className="font-script font-semibold">{w.term}</span>
                    <span className="block text-sm text-mute">{w.translation}</span>
                  </span>
                  {canSpeak() && (
                    <button type="button" className="btn-quiet !px-2" aria-label={`Hear ${w.term}`} onClick={() => speak(w.term, locale)}>
                      <Volume2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <button type="button" className="btn-primary mt-8 !px-8 !py-3 text-base" onClick={begin}>
          Start lesson <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  /* ------------------------------ summary ------------------------------ */
  if (phase === "summary" && result) {
    const tone = result.passed ? "text-mint" : "text-saffron";
    return (
      <div className="mx-auto max-w-xl text-center">
        <motion.div {...motionProps}>
          <div className={`mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl ${result.passed ? "bg-mint-soft" : "bg-saffron-soft"} ${tone}`}>
            <Trophy size={38} aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-extrabold">{result.passed ? (result.firstCompletion ? "Lesson complete" : "Nice review") : "Almost there"}</h1>
          <p className="mt-2 text-lg text-mute">
            You got {result.correct} of {result.total} right ({Math.round(result.score)}%).{" "}
            {result.passed ? "" : "Aim for 70% to complete it. Try again when you are ready."}
          </p>

          <section className="card mt-6 p-5 text-left" aria-labelledby="skills">
            <h2 id="skills" className="text-sm font-bold uppercase tracking-wide text-mute">By skill</h2>
            <ul className="mt-3 space-y-3">
              {result.bySkill.map((s) => (
                <li key={s.skill}>
                  <div className="mb-1 flex justify-between text-sm font-medium">
                    <span>{SKILL_LABEL[s.skill]}</span>
                    <span>{s.correct}/{s.total}</span>
                  </div>
                  <ProgressBar value={(s.correct / s.total) * 100} label={`${SKILL_LABEL[s.skill]} accuracy`} tone={s.correct === s.total ? "mint" : "cobalt"} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-mute">+{result.xp} XP. XP shows how much you practised, not how well you speak. Your Progress page tracks the real skills.</p>
          </section>

          {result.achievements.length > 0 && (
            <div className="mt-4 space-y-2 text-left">
              {result.achievements.map((a) => (
                <Notice key={a.code} tone="success" title={`Achievement: ${a.title}`}>{a.description}</Notice>
              ))}
            </div>
          )}

          {vocabulary.length > 0 && (
            <div className="mt-4">
              {savedWords === null ? (
                <button type="button" className="btn-ghost w-full" onClick={saveWords} disabled={savingWords}>
                  {savingWords ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
                  Add this lesson&apos;s {vocabulary.length} words to my review deck
                </button>
              ) : (
                <Notice tone="success">{savedWords > 0 ? `Added ${savedWords} new words to your review deck.` : "These words are already in your review deck."}</Notice>
              )}
            </div>
          )}

          {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {result.passed && props.nextLesson ? (
              <Link href={`/learn/${props.nextLesson.id}`} className="btn-primary !px-6 !py-3">
                Next: {props.nextLesson.title} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
            <button type="button" className="btn-ghost !px-6 !py-3" onClick={begin}>
              <RotateCcw size={16} aria-hidden="true" /> Practise again
            </button>
            <Link href="/learn" className="btn-ghost !px-6 !py-3">Back to course</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ------------------------------ exercise ------------------------------ */
  const answered = exercise ? isAnswered(exercise, response) : false;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-2xl flex-col">
      <div className="mb-6 flex items-center gap-3">
        {confirmExit ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Leave? Your answers will not be saved.</span>
            <Link href="/learn" className="btn-ghost !px-3 !py-1.5">Leave</Link>
            <button type="button" className="btn-quiet !px-3 !py-1.5" onClick={() => setConfirmExit(false)}>Stay</button>
          </div>
        ) : (
          <button type="button" className="btn-quiet !px-2.5" onClick={() => setConfirmExit(true)} aria-label="Exit lesson">
            <X size={20} aria-hidden="true" />
          </button>
        )}
        <div className="flex-1">
          <ProgressBar value={((index + (phase === "feedback" || phase === "saving" ? 1 : 0)) / total) * 100} label="Lesson progress" tone="mint" />
        </div>
        <span className="text-sm font-medium text-mute" aria-live="polite">{index + 1}/{total}</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={exercise.id} {...motionProps} className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-cobalt">{TYPE_LABELS[exercise.type]}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{exercise.prompt}</h1>
          {exercise.instructions && <p className="mb-5 mt-2 text-mute">{exercise.instructions}</p>}
          {!exercise.instructions && <div className="mb-5" />}
          <ExerciseInput
            exercise={exercise}
            response={response}
            onChange={setResponse}
            locked={phase !== "answer"}
            locale={locale}
            verdict={phase === "feedback" ? verdict : null}
          />
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-20 mt-8 md:bottom-4">
        {phase === "feedback" && verdict && (
          <motion.div
            {...(reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } })}
            role="status"
            className={`mb-3 rounded-2xl border-2 p-4 shadow-lift ${verdict.correct ? "border-mint bg-mint-soft" : verdict.score > 0 ? "border-saffron bg-saffron-soft" : "border-coral bg-coral-soft"}`}
          >
            <div className="flex items-start gap-3">
              {verdict.correct ? <CheckCircle2 className="mt-0.5 shrink-0 text-mint" aria-hidden="true" /> : <XCircle className="mt-0.5 shrink-0 text-coral" aria-hidden="true" />}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-bold">{verdict.correct ? "Correct" : verdict.score > 0 ? "Partly right" : "Not quite"}</p>
                <p className="text-sm">{verdict.feedback}</p>
                {!verdict.correct && verdict.expected && (
                  <p className="text-sm">
                    <span className="font-semibold">A good answer: </span>
                    <span lang={locale} className="font-script">{verdict.expected}</span>
                  </p>
                )}
                {exercise.explanation && <p className="text-sm text-mute"><span className="font-semibold text-ink">Why: </span>{exercise.explanation}</p>}
                <AiHelp exercise={exercise} response={response} verdict={verdict} enabled={props.aiEnabled} />
              </div>
            </div>
          </motion.div>
        )}

        {error && phase === "feedback" && (
          <div className="mb-3"><Notice tone="error" title="Could not save your result">{error}</Notice></div>
        )}

        {phase === "answer" && (
          <button type="button" className="btn-primary w-full !py-3.5 text-base" disabled={!answered} onClick={check}>
            <Check size={18} aria-hidden="true" /> Check
          </button>
        )}
        {phase === "feedback" && (
          <button type="button" className="btn-primary w-full !py-3.5 text-base" onClick={advance}>
            {error ? "Try saving again" : index < total - 1 ? "Continue" : "Finish lesson"} <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        {phase === "saving" && (
          <button type="button" className="btn-primary w-full !py-3.5 text-base" disabled>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Saving your result…
          </button>
        )}
        <p className="mt-2 text-center text-xs text-mute">{phase === "answer" ? "Press Enter to check." : "Press Enter to continue."}</p>
      </div>
    </div>
  );
}
