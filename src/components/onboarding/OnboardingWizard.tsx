"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DAILY_GOALS, LEARNING_STYLES, NATIVE_LANGUAGES, OBJECTIVES, PROFICIENCIES } from "@/lib/constants";
import type { Exercise, Language } from "@/lib/types";
import type { Response } from "@/lib/exercises/validate";
import { isAnswered } from "@/lib/exercises/helpers";
import { ExerciseInput } from "@/components/exercise/ExerciseInput";
import { Notice, ProgressBar } from "@/components/ui/Feedback";
import { completeOnboarding, loadPlacement, type OnboardingResult } from "@/app/onboarding/actions";

type Prefs = {
  native_language: string;
  target_language_id: string;
  proficiency: string;
  objective: string;
  daily_goal_minutes: number | null;
  learning_style: string;
};

const STEPS = ["native", "target", "level", "goal", "daily", "style"] as const;
type Step = (typeof STEPS)[number] | "placement-intro" | "placement" | "done";

interface Props {
  languages: Language[];
  initialName: string;
}

function Choice({ selected, onClick, title, hint, lead }: { selected: boolean; onClick: () => void; title: string; hint?: string; lead?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
        selected ? "border-cobalt bg-cobalt-soft" : "border-line bg-surface hover:border-cobalt/50 hover:bg-sunk"
      }`}
    >
      {lead}
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="block text-sm text-mute">{hint}</span>}
      </span>
      {selected && <Check size={20} className="text-cobalt" aria-hidden="true" />}
    </button>
  );
}

export function OnboardingWizard({ languages, initialName }: Props) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [step, setStep] = useState<Step>("native");
  const [direction, setDirection] = useState(1);
  const [prefs, setPrefs] = useState<Prefs>({ native_language: "", target_language_id: "", proficiency: "", objective: "", daily_goal_minutes: null, learning_style: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [questions, setQuestions] = useState<Exercise[]>([]);
  const [locale, setLocale] = useState("en-US");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Response | null>>({});
  const [result, setResult] = useState<Extract<OnboardingResult, { ok: true }> | null>(null);

  const target = languages.find((l) => l.id === prefs.target_language_id);
  const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number]);
  const progress = step === "done" ? 100 : stepIndex >= 0 ? ((stepIndex + 1) / (STEPS.length + 1)) * 100 : 90;

  const valid: Record<(typeof STEPS)[number], boolean> = {
    native: Boolean(prefs.native_language),
    target: Boolean(prefs.target_language_id),
    level: Boolean(prefs.proficiency),
    goal: Boolean(prefs.objective),
    daily: prefs.daily_goal_minutes !== null,
    style: Boolean(prefs.learning_style),
  };

  const go = (next: Step, dir = 1) => {
    setDirection(dir);
    setError(null);
    setStep(next);
  };

  function back() {
    if (step === "placement-intro") return go("style", -1);
    if (step === "placement") return go("placement-intro", -1);
    const i = STEPS.indexOf(step as (typeof STEPS)[number]);
    if (i > 0) go(STEPS[i - 1], -1);
  }

  function next() {
    if (!STEPS.includes(step as (typeof STEPS)[number])) return;
    const i = STEPS.indexOf(step as (typeof STEPS)[number]);
    if (!valid[step as (typeof STEPS)[number]]) return;
    if (i < STEPS.length - 1) return go(STEPS[i + 1]);
    // After the last question: offer the placement check to anyone who is not a complete beginner.
    if (prefs.proficiency === "beginner") submit();
    else go("placement-intro");
  }

  function submit(withPlacement = false) {
    startTransition(async () => {
      const payload = {
        preferences: prefs,
        placement: withPlacement
          ? questions.map((q) => ({ exerciseId: q.id, response: answers[q.id] ?? null, timeMs: 0 }))
          : undefined,
      };
      const res = await completeOnboarding(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res);
      go("done");
    });
  }

  function startPlacement() {
    startTransition(async () => {
      const res = await loadPlacement(prefs.target_language_id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setQuestions(res.questions);
      setLocale(res.locale);
      setQIndex(0);
      setAnswers({});
      go("placement");
    });
  }

  const slide = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * direction },
        transition: { duration: 0.22 },
      };

  const current = questions[qIndex];
  const currentAnswer = current ? answers[current.id] ?? null : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-8">
      <div className="mb-8 space-y-3">
        <ProgressBar value={progress} label="Setup progress" />
        <p className="text-sm text-mute">
          {step === "done" ? "All set" : stepIndex >= 0 ? `Question ${stepIndex + 1} of ${STEPS.length}` : "Quick placement check"}
        </p>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step === "placement" ? `placement-${qIndex}` : step} {...slide}>
            {step === "native" && (
              <section aria-labelledby="q-native">
                <h1 id="q-native" className="text-3xl font-extrabold">Welcome{initialName ? `, ${initialName.split(" ")[0]}` : ""}. What is your native language?</h1>
                <p className="mb-6 mt-2 text-mute">We explain things in this language, so lessons make sense from the first minute.</p>
                <div role="radiogroup" aria-label="Native language" className="grid gap-2 sm:grid-cols-2">
                  {NATIVE_LANGUAGES.map((l) => (
                    <Choice key={l.code} selected={prefs.native_language === l.code} onClick={() => setPrefs({ ...prefs, native_language: l.code })} title={l.label} />
                  ))}
                </div>
              </section>
            )}

            {step === "target" && (
              <section aria-labelledby="q-target">
                <h1 id="q-target" className="text-3xl font-extrabold">Which language do you want to learn?</h1>
                <p className="mb-6 mt-2 text-mute">You can add more languages later from Settings.</p>
                {languages.length === 0 ? (
                  <Notice tone="info" title="No languages are published yet">
                    An administrator needs to publish a language first. See README.md to load the starter courses.
                  </Notice>
                ) : (
                  <div role="radiogroup" aria-label="Language to learn" className="grid gap-3">
                    {languages.map((l) => (
                      <Choice
                        key={l.id}
                        selected={prefs.target_language_id === l.id}
                        onClick={() => setPrefs({ ...prefs, target_language_id: l.id })}
                        title={l.name}
                        hint={`${l.native_name} · “${l.greeting}”`}
                        lead={<span lang={l.speech_locale} className="font-script flex h-12 w-12 items-center justify-center rounded-xl bg-sunk text-xl font-bold">{Array.from(l.greeting)[0]}</span>}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {step === "level" && (
              <section aria-labelledby="q-level">
                <h1 id="q-level" className="text-3xl font-extrabold">How much {target?.name ?? "of it"} do you know?</h1>
                <p className="mb-6 mt-2 text-mute">Be honest, there is no wrong answer. Not a beginner? You can take a short check to find your starting point.</p>
                <div role="radiogroup" aria-label="Current level" className="grid gap-3">
                  {PROFICIENCIES.map((p) => (
                    <Choice key={p.value} selected={prefs.proficiency === p.value} onClick={() => setPrefs({ ...prefs, proficiency: p.value })} title={p.label} hint={p.hint} />
                  ))}
                </div>
              </section>
            )}

            {step === "goal" && (
              <section aria-labelledby="q-goal">
                <h1 id="q-goal" className="text-3xl font-extrabold">Why are you learning {target?.name ?? "it"}?</h1>
                <p className="mb-6 mt-2 text-mute">This helps us suggest conversations and words that matter to you.</p>
                <div role="radiogroup" aria-label="Learning objective" className="grid gap-3 sm:grid-cols-2">
                  {OBJECTIVES.map((o) => (
                    <Choice key={o.value} selected={prefs.objective === o.value} onClick={() => setPrefs({ ...prefs, objective: o.value })} title={o.label} hint={o.hint} />
                  ))}
                </div>
              </section>
            )}

            {step === "daily" && (
              <section aria-labelledby="q-daily">
                <h1 id="q-daily" className="text-3xl font-extrabold">How much time can you practise each day?</h1>
                <p className="mb-6 mt-2 text-mute">Small and regular beats long and rare. Missing a day never takes anything away from you.</p>
                <div role="radiogroup" aria-label="Daily target" className="grid gap-3 sm:grid-cols-2">
                  {DAILY_GOALS.map((g) => (
                    <Choice key={g.value} selected={prefs.daily_goal_minutes === g.value} onClick={() => setPrefs({ ...prefs, daily_goal_minutes: g.value })} title={g.label} hint={g.hint} />
                  ))}
                </div>
              </section>
            )}

            {step === "style" && (
              <section aria-labelledby="q-style">
                <h1 id="q-style" className="text-3xl font-extrabold">How do you like to learn?</h1>
                <p className="mb-6 mt-2 text-mute">Every lesson mixes all four skills. This only changes what we suggest first.</p>
                <div role="radiogroup" aria-label="Learning style" className="grid gap-3">
                  {LEARNING_STYLES.map((s) => (
                    <Choice key={s.value} selected={prefs.learning_style === s.value} onClick={() => setPrefs({ ...prefs, learning_style: s.value })} title={s.label} hint={s.hint} />
                  ))}
                </div>
              </section>
            )}

            {step === "placement-intro" && (
              <section aria-labelledby="q-place">
                <h1 id="q-place" className="text-3xl font-extrabold">Want to find your starting point?</h1>
                <p className="mb-6 mt-2 text-mute">
                  A short check of up to 8 questions from across the {target?.name} course. It never marks lessons as done; it only moves your “start here” marker so you do not repeat what you already know.
                </p>
                <div className="grid gap-3">
                  <button type="button" className="btn-primary !py-3" onClick={startPlacement} disabled={pending}>
                    {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null} Take the quick check
                  </button>
                  <button type="button" className="btn-ghost !py-3" onClick={() => submit(false)} disabled={pending}>
                    Skip and start from the beginning
                  </button>
                </div>
              </section>
            )}

            {step === "placement" && current && (
              <section aria-labelledby="q-ex">
                <p className="text-sm font-semibold text-cobalt">
                  Question {qIndex + 1} of {questions.length}
                </p>
                <h1 id="q-ex" className="mt-1 text-2xl font-extrabold">{current.prompt}</h1>
                {current.instructions && <p className="mb-5 mt-2 text-mute">{current.instructions}</p>}
                <ExerciseInput exercise={current} response={currentAnswer} locale={locale} onChange={(r) => setAnswers((a) => ({ ...a, [current.id]: r }))} />
                <p className="mt-4 text-sm text-mute">Not sure? Skip it, a blank answer is fine here.</p>
              </section>
            )}

            {step === "done" && result && (
              <section aria-labelledby="q-done" className="text-center">
                <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-soft text-mint">
                  <Sparkles size={30} aria-hidden="true" />
                </div>
                <h1 id="q-done" className="text-3xl font-extrabold">Your {target?.name} course is ready</h1>
                <p className="mx-auto mb-6 mt-3 max-w-md text-mute">
                  {result.placement
                    ? result.placement.startTitle
                      ? `You answered ${result.placement.score}% of ${result.placement.answered} questions correctly, so we will start you at “${result.placement.startTitle}”. You can open any lesson from the course map.`
                      : `You answered ${result.placement.score}% of ${result.placement.answered} questions correctly. We will start you at the beginning to build a solid base.`
                    : "We will start at the beginning and adapt as you go. You can change any answer later in Settings."}
                </p>
                <button type="button" className="btn-primary !px-6 !py-3" onClick={() => router.replace("/dashboard")}>
                  Go to my dashboard <ArrowRight size={18} aria-hidden="true" />
                </button>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-5">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </div>

      {step !== "done" && (
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {step === "native" ? (
            <Link href="/" className="btn-quiet">Cancel</Link>
          ) : (
            <button type="button" className="btn-quiet" onClick={back} disabled={pending || (step === "placement" && qIndex > 0)}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          )}

          {STEPS.includes(step as (typeof STEPS)[number]) && (
            <button type="button" className="btn-primary" disabled={!valid[step as (typeof STEPS)[number]] || pending} onClick={next}>
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              {step === "style" && prefs.proficiency === "beginner" ? "Finish" : "Continue"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}

          {step === "placement" && current && (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => (qIndex < questions.length - 1 ? setQIndex(qIndex + 1) : submit(true))}
            >
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              {qIndex < questions.length - 1 ? (isAnswered(current, currentAnswer) ? "Next" : "Skip") : "Finish"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
