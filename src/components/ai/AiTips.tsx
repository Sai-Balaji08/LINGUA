"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

/** Optional personalised tips. Built from real skill data on the server; shows a plain message if AI is unavailable. */
export function AiTips({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; tips: string[] }>({ kind: "idle" });
  if (!enabled) return null;

  async function load() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; suggestions?: string[]; error?: string } | null;
      if (res.ok && json?.ok && json.suggestions?.length) setState({ kind: "done", tips: json.suggestions });
      else setState({ kind: "error", message: json?.error ?? "The AI helper is not available right now." });
    } catch {
      setState({ kind: "error", message: "Could not reach the AI helper. Check your connection." });
    }
  }

  return (
    <section className="card p-5" aria-labelledby="tips-h">
      <h2 id="tips-h" className="font-bold">Personal study tips</h2>
      {state.kind === "idle" && (
        <>
          <p className="mt-1 text-sm text-mute">Get three suggestions based on your own results. Only summary numbers are shared, never your answers.</p>
          <button type="button" className="btn-ghost mt-3" onClick={load}>
            <Sparkles size={16} aria-hidden="true" /> Suggest what to practise
          </button>
        </>
      )}
      {state.kind === "loading" && (
        <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-mute">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Thinking…
        </p>
      )}
      {state.kind === "error" && <p role="alert" className="mt-2 text-sm text-mute">{state.message}</p>}
      {state.kind === "done" && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          {state.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
