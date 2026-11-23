"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lightbulb, Loader2, MessageCircle, RotateCcw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/ui/Feedback";
import { SpeakButton } from "@/components/vocab/SpeakButton";
import { highlightParts } from "@/lib/ai/conversation";
import { DIFFICULTIES, MAX_LEARNER_TURNS, MAX_MESSAGE_CHARS, SCENARIOS, scenarioLabel, type ScenarioKey } from "@/lib/ai/scenarios";
import type { ConversationSummary, ConvoMessage, Difficulty } from "@/lib/ai/types";

/**
 * The conversation partner. Three views: pick a scenario, chat, review.
 * Every AI call goes to a server route (/api/ai/*). The browser never sees an API key, and when the
 * AI is off or out of quota this page explains why instead of breaking. Lessons are unaffected.
 */

export interface PastConversation {
  id: string;
  scenario: string;
  difficulty: string;
  status: "active" | "ended";
  started_at: string;
  turns: number;
  mistakeCount: number | null;
}

interface AiStatus {
  configured: boolean;
  enabled: boolean;
  remaining: number;
  limit: number;
}

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; error?: string; code?: string };

async function post<T>(url: string, body: unknown): Promise<ApiOk<T> | ApiFail> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as (ApiOk<T> | ApiFail) | null;
    if (!json) return { ok: false, error: "The AI helper sent an unreadable answer. Please try again." };
    return json;
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

type View = { kind: "setup" } | { kind: "chat"; id: string } | { kind: "review"; summary: ConversationSummary; scenario: string };

export function ConversationPartner({
  languageName,
  locale,
  recent,
}: {
  languageName: string;
  locale: string;
  recent: PastConversation[];
}) {
  const reduce = useReducedMotion();
  const [view, setView] = useState<View>({ kind: "setup" });
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState(false);

  const [scenario, setScenario] = useState<ScenarioKey>("ordering_food");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/status", { cache: "no-store" });
      const json = (await res.json()) as AiStatus & { ok: boolean };
      if (json.ok) {
        setStatus({ configured: json.configured, enabled: json.enabled, remaining: json.remaining, limit: json.limit });
        setStatusError(false);
      } else setStatusError(true);
    } catch {
      setStatusError(true);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages.length, sending, reduce]);

  const blocked = useMemo(() => {
    if (statusError) return "We could not check the AI helper. Refresh the page to try again.";
    if (!status) return null;
    if (!status.enabled) return "AI feedback is switched off in your privacy settings. Turn it on in Settings to practise conversations.";
    if (!status.configured) return "The AI conversation partner is not switched on for this site yet. Lessons, review and vocabulary all work as normal.";
    if (status.remaining <= 0) return "You have used all of today's AI conversation turns. They come back tomorrow. Lessons and review are never limited.";
    return null;
  }, [status, statusError]);

  async function start() {
    setStarting(true);
    setError(null);
    const r = await post<{ conversationId: string; message: ConvoMessage }>("/api/ai/conversation", { action: "start", scenario, difficulty });
    setStarting(false);
    if (!r.ok) {
      setError(r.error ?? "Could not start the conversation.");
      void refreshStatus();
      return;
    }
    setMessages([r.message]);
    setActiveScenario(scenario);
    setView({ kind: "chat", id: r.conversationId });
    void refreshStatus();
  }

  async function send(conversationId: string) {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    // Show the learner's own message immediately; it is replaced by the version with feedback.
    const pending: ConvoMessage = { id: `pending-${Date.now()}`, role: "user", content: text, at: new Date().toISOString() };
    setMessages((m) => [...m, pending]);
    setDraft("");
    const r = await post<{ userMessage: ConvoMessage; assistantMessage: ConvoMessage }>("/api/ai/conversation", { action: "turn", conversationId, message: text });
    setSending(false);
    if (!r.ok) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setDraft(text); // give the text back so nothing the learner typed is lost
      setError(r.error ?? "The partner could not reply. Please try again.");
      void refreshStatus();
      return;
    }
    setMessages((m) => [...m.filter((x) => x.id !== pending.id), r.userMessage, r.assistantMessage]);
    void refreshStatus();
  }

  async function end(conversationId: string) {
    setEnding(true);
    setError(null);
    const r = await post<{ summary: ConversationSummary }>("/api/ai/conversation/end", { conversationId });
    setEnding(false);
    if (!r.ok) {
      setError(r.error ?? "Could not end the conversation.");
      return;
    }
    setView({ kind: "review", summary: r.summary, scenario: activeScenario });
  }

  function reset() {
    setView({ kind: "setup" });
    setMessages([]);
    setDraft("");
    setError(null);
  }

  /* ------------------------------ setup ------------------------------ */
  if (view.kind === "setup") {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-mute">Practise {languageName}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Conversation partner</h1>
          <p className="mt-2 max-w-xl text-mute">Pick a real-life situation. Your partner replies in {languageName}, points out mistakes gently and suggests more natural ways to say things.</p>
        </header>

        {blocked && <Notice tone="info" title="AI conversations are paused">{blocked}</Notice>}
        {status && !blocked && (
          <p className="text-sm text-mute">
            {status.remaining} of {status.limit} AI turns left today. Lessons and review are always free and unlimited.
          </p>
        )}

        <fieldset>
          <legend className="mb-3 font-bold">Scenario</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => (
              <label
                key={s.key}
                className={`card cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${scenario === s.key ? "!border-cobalt bg-cobalt-soft" : ""}`}
              >
                <input type="radio" name="scenario" value={s.key} checked={scenario === s.key} onChange={() => setScenario(s.key)} className="sr-only" />
                <span className="block font-bold">{s.label}</span>
                <span className="mt-1 block text-sm text-mute">{s.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-bold">Difficulty</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {DIFFICULTIES.map((d) => (
              <label key={d.key} className={`card cursor-pointer p-4 transition ${difficulty === d.key ? "!border-cobalt bg-cobalt-soft" : "hover:bg-sunk"}`}>
                <input type="radio" name="difficulty" value={d.key} checked={difficulty === d.key} onChange={() => setDifficulty(d.key)} className="sr-only" />
                <span className="block font-bold">{d.label}</span>
                <span className="mt-1 block text-sm text-mute">{d.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn-primary !px-6 !py-3" onClick={start} disabled={starting || Boolean(blocked) || !status} aria-busy={starting}>
          {starting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Starting…
            </>
          ) : (
            <>
              Start conversation <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>

        {recent.length > 0 && (
          <section aria-labelledby="past-h" className="pt-4">
            <h2 id="past-h" className="mb-3 font-bold">Recent conversations</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{scenarioLabel(c.scenario)}</span>
                    <span className="text-xs text-mute">
                      {new Date(c.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {c.difficulty} · {c.turns} {c.turns === 1 ? "turn" : "turns"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-sunk px-2.5 py-1 text-xs font-semibold">
                    {c.status === "active" ? "Not finished" : c.mistakeCount === null ? "Ended" : `${c.mistakeCount} ${c.mistakeCount === 1 ? "correction" : "corrections"}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  /* ------------------------------ review ------------------------------ */
  if (view.kind === "review") {
    const s = view.summary;
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-mute">{scenarioLabel(view.scenario)} · review</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{s.turns === 0 ? "Conversation ended" : "Nicely done"}</h1>
          <p className="mt-2 text-mute">
            {s.turns} {s.turns === 1 ? "message" : "messages"} · about {Math.max(1, Math.round(s.durationSeconds / 60))} min ·{" "}
            {s.mistakeCount === 0 ? "no corrections needed" : `${s.mistakeCount} ${s.mistakeCount === 1 ? "thing" : "things"} to look at`}
          </p>
        </header>

        {s.mistakes.length > 0 ? (
          <section aria-labelledby="mist-h" className="card p-5">
            <h2 id="mist-h" className="font-bold">Mistakes to learn from</h2>
            <ul className="mt-3 space-y-4">
              {s.mistakes.map((m, i) => (
                <li key={i} className="text-sm">
                  <p>
                    <span className="rounded bg-coral-soft px-1.5 py-0.5 line-through decoration-coral/70">{m.original}</span>
                    <span className="mx-2 text-mute" aria-label="should be">→</span>
                    <span className="rounded bg-mint-soft px-1.5 py-0.5 font-semibold">{m.corrected}</span>
                  </p>
                  <p className="mt-1.5 text-mute">{m.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : s.turns > 0 ? (
          <Notice tone="success">No corrections this time. Try a harder difficulty or a new scenario.</Notice>
        ) : null}

        {s.vocabulary.length > 0 && (
          <section aria-labelledby="vocab-h" className="card p-5">
            <h2 id="vocab-h" className="font-bold">Useful words from this conversation</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.vocabulary.map((v) => (
                <li key={v.term} className="flex items-center justify-between gap-2 rounded-xl bg-sunk px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold" lang={locale.split("-")[0]}>{v.term}</span>
                    <span className="text-mute"> · {v.translation}</span>
                  </span>
                  <SpeakButton text={v.term} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> New conversation
          </button>
          <a href="/vocabulary" className="btn-ghost">Open word library</a>
        </div>
      </div>
    );
  }

  /* ------------------------------ chat ------------------------------ */
  const conversationId = view.id;
  const learnerTurns = messages.filter((m) => m.role === "user" && !m.id.startsWith("pending-")).length;
  const full = learnerTurns >= MAX_LEARNER_TURNS;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:min-h-[calc(100dvh-6rem)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{scenarioLabel(activeScenario)}</h1>
          <p className="text-sm text-mute">
            {languageName} · {difficulty} · {learnerTurns}/{MAX_LEARNER_TURNS} messages
            {status ? ` · ${status.remaining} AI turns left today` : ""}
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => end(conversationId)} disabled={ending || sending} aria-busy={ending}>
          {ending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          End and review
        </button>
      </header>

      <div className="flex-1 space-y-5 py-5" role="log" aria-live="polite" aria-label="Conversation">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
            >
              {m.role === "assistant" ? <AssistantBubble message={m} locale={locale} /> : <LearnerBubble message={m} />}
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-mute">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Your partner is replying…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="pb-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <form
        className="sticky bottom-20 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lift md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(conversationId);
        }}
      >
        <label htmlFor="msg" className="sr-only">Your message in {languageName}</label>
        <textarea
          id="msg"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-mute/70"
          placeholder={full ? "This conversation is full. End it to see your review." : `Write in ${languageName}…`}
          value={draft}
          maxLength={MAX_MESSAGE_CHARS}
          rows={1}
          disabled={sending || full}
          lang={locale.split("-")[0]}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(conversationId);
            }
          }}
        />
        <button type="submit" className="btn-primary !px-3.5" disabled={sending || full || !draft.trim()} aria-label="Send message">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function AssistantBubble({ message, locale }: { message: ConvoMessage; locale: string }) {
  return (
    <div className="max-w-[88%] sm:max-w-[75%]">
      <div className="rounded-bubble border border-line bg-surface px-4 py-3">
        <p className="flex items-start gap-2">
          <span lang={locale.split("-")[0]} className="font-script text-[17px] leading-relaxed">{message.content}</span>
          <SpeakButton text={message.content} locale={locale} label="Hear this message" />
        </p>
      </div>
      {message.vocabulary && message.vocabulary.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Useful words">
          {message.vocabulary.map((v) => (
            <li key={v.term} className="rounded-full bg-saffron-soft px-2.5 py-1 text-xs">
              <span className="font-semibold" lang={locale.split("-")[0]}>{v.term}</span> <span className="text-mute">{v.translation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LearnerBubble({ message }: { message: ConvoMessage }) {
  const corrections = message.corrections ?? [];
  const parts = highlightParts(message.content, corrections);
  const pending = message.id.startsWith("pending-");
  return (
    <div className="max-w-[88%] sm:max-w-[75%]">
      <div className={`rounded-[1.75rem_1.75rem_0.4rem_1.75rem] bg-cobalt px-4 py-3 text-white ${pending ? "opacity-70" : ""}`}>
        <p className="font-script text-[17px] leading-relaxed">
          {parts.map((p, i) =>
            p.mistake ? (
              <mark key={i} className="rounded bg-coral/90 px-0.5 text-white underline decoration-wavy decoration-white/70 underline-offset-4" title="Mistake. See the note below.">
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
      </div>

      {corrections.length > 0 && (
        <ul className="mt-2 space-y-2" aria-label="Corrections">
          {corrections.map((c, i) => (
            <li key={i} className="rounded-xl border border-coral/30 bg-coral-soft px-3 py-2 text-sm">
              <p>
                <span className="line-through decoration-coral/70">{c.original}</span>
                <span className="mx-1.5" aria-label="should be">→</span>
                <span className="font-semibold">{c.corrected}</span>
              </p>
              <p className="mt-0.5 text-mute">{c.explanation}</p>
            </li>
          ))}
        </ul>
      )}
      {!pending && corrections.length === 0 && message.corrections && (
        <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-mint">
          <CheckCircle2 size={13} aria-hidden="true" /> Looks good
        </p>
      )}
      {message.alternatives && message.alternatives.length > 0 && (
        <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
            <Lightbulb size={13} aria-hidden="true" /> A more natural way to say it
          </p>
          <ul className="mt-1 space-y-0.5">
            {message.alternatives.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ConversationEmptyIcon() {
  return <MessageCircle size={32} aria-hidden="true" />;
}
