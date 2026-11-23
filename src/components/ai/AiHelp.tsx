"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Exercise } from "@/lib/types";
import type { Response, Verdict } from "@/lib/exercises/validate";
import type { Correction } from "@/lib/ai/types";

/**
 * Optional AI help shown under a checked answer. It is never required: every exercise already has
 * its own explanation, and if the AI is unavailable this shows a short message and nothing else breaks.
 */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "explanation"; text: string }
  | { kind: "evaluation"; acceptable: boolean; feedback: string }
  | { kind: "writing"; summary: string; strengths: string[]; corrections: Correction[] };

async function call<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as ({ ok: boolean; error?: string } & T) | null;
    if (!res.ok || !json?.ok) return { ok: false, message: json?.error ?? "The AI helper is not available right now. Your lessons still work." };
    return { ok: true, data: json };
  } catch {
    return { ok: false, message: "Could not reach the AI helper. Check your connection. Your lessons still work." };
  }
}

export function AiHelp({ exercise, response, verdict, enabled }: { exercise: Exercise; response: Response | null; verdict: Verdict; enabled: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  if (!enabled) return null;

  const typed = response?.kind === "text" ? response.text : undefined;
  const canExplain = !verdict.correct && ["grammar", "fill_blank", "translation", "word_arrangement", "multiple_choice"].includes(exercise.type);
  const canRecheck = !verdict.correct && (exercise.type === "translation" || exercise.type === "fill_blank") && Boolean(typed);
  const canCoach = exercise.type === "writing" && Boolean(typed);
  if (!canExplain && !canRecheck && !canCoach) return null;

  async function run(kind: "explain" | "evaluate" | "writing") {
    setState({ kind: "loading" });
    if (kind === "explain") {
      const r = await call<{ explanation: string }>("/api/ai/explain", { exerciseId: exercise.id, answer: typed });
      setState(r.ok ? { kind: "explanation", text: r.data.explanation } : { kind: "error", message: r.message });
    } else if (kind === "evaluate") {
      const r = await call<{ acceptable: boolean; feedback: string }>("/api/ai/evaluate", { exerciseId: exercise.id, answer: typed });
      setState(r.ok ? { kind: "evaluation", acceptable: r.data.acceptable, feedback: r.data.feedback } : { kind: "error", message: r.message });
    } else {
      const r = await call<{ summary: string; strengths: string[]; corrections: Correction[] }>("/api/ai/writing", { exerciseId: exercise.id, text: typed });
      setState(r.ok ? { kind: "writing", ...r.data } : { kind: "error", message: r.message });
    }
  }

  return (
    <div className="pt-1">
      {state.kind === "idle" && (
        <div className="flex flex-wrap gap-2">
          {canCoach && (
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => run("writing")}>
              <Sparkles size={14} aria-hidden="true" /> Get AI writing feedback
            </button>
          )}
          {canExplain && (
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => run("explain")}>
              <Sparkles size={14} aria-hidden="true" /> Explain this with AI
            </button>
          )}
          {canRecheck && (
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => run("evaluate")}>
              <Sparkles size={14} aria-hidden="true" /> Could my answer be right too?
            </button>
          )}
        </div>
      )}
      {state.kind === "loading" && (
        <p role="status" className="inline-flex items-center gap-2 text-xs text-mute">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Asking the AI helper…
        </p>
      )}
      {state.kind === "error" && <p role="alert" className="text-xs text-ink">{state.message}</p>}
      {state.kind === "explanation" && (
        <div className="rounded-xl bg-surface/80 p-3 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-cobalt">AI explanation</p>
          <p className="whitespace-pre-line">{state.text}</p>
        </div>
      )}
      {state.kind === "evaluation" && (
        <div className="rounded-xl bg-surface/80 p-3 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-cobalt">AI second opinion</p>
          <p>
            <strong>{state.acceptable ? "This looks acceptable." : "This does not look right."}</strong> {state.feedback}
          </p>
          <p className="mt-1 text-xs text-mute">Your score stays as checked: only the saved answers count for the score.</p>
        </div>
      )}
      {state.kind === "writing" && (
        <div className="space-y-2 rounded-xl bg-surface/80 p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-cobalt">AI writing feedback</p>
          <p>{state.summary}</p>
          {state.strengths.length > 0 && (
            <ul className="list-disc pl-5">
              {state.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {state.corrections.map((c) => (
            <p key={c.original} className="rounded-lg bg-sunk p-2">
              <span className="line-through decoration-coral">{c.original}</span> → <strong>{c.corrected}</strong>
              <span className="block text-xs text-mute">{c.explanation}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
