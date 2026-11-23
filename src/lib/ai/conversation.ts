import type { Correction, ConvoMessage, ConversationSummary, VocabItem } from "@/lib/ai/types";
import { HISTORY_WINDOW } from "@/lib/ai/scenarios";
import { wrapLearnerText } from "@/lib/ai/prompts";
import type { ProviderMessage } from "@/lib/ai/provider";

/** Pure helpers for the conversation partner (no network, no database), so they are unit-tested. */

/**
 * Keeps only corrections whose "original" text really appears in the learner's message,
 * so the UI never highlights something the learner did not write. Case-insensitive.
 */
export function filterCorrections(message: string, corrections: Correction[]): Correction[] {
  const lower = message.toLowerCase();
  return corrections.filter((c) => c.original && lower.includes(c.original.toLowerCase()) && c.original.trim().toLowerCase() !== c.corrected.trim().toLowerCase());
}

/**
 * Builds the message list sent to the model: a fixed opening user turn, the last few exchanges, then the new message.
 * Roles must alternate and start with "user", and earlier assistant turns are replayed as JSON so the model keeps the format.
 */
export function buildProviderMessages(history: ConvoMessage[], newMessage: string): ProviderMessage[] {
  let window = history.slice(-HISTORY_WINDOW);
  while (window.length && window[0].role !== "assistant") window = window.slice(1);

  const out: ProviderMessage[] = [{ role: "user", content: "Begin the conversation." }];
  for (const m of window) {
    out.push(
      m.role === "assistant"
        ? { role: "assistant", content: JSON.stringify({ reply: m.content, corrections: [], alternatives: [], vocabulary: m.vocabulary ?? [] }) }
        : { role: "user", content: wrapLearnerText(m.content) },
    );
  }
  out.push({ role: "user", content: wrapLearnerText(newMessage) });
  // If the window ended on a user message (it should not), merge to keep roles alternating.
  return out.reduce<ProviderMessage[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else acc.push({ ...m });
    return acc;
  }, []);
}

export function summarizeConversation(messages: ConvoMessage[], durationSeconds: number): ConversationSummary {
  const learner = messages.filter((m) => m.role === "user");
  const mistakes = learner.flatMap((m) => m.corrections ?? []);
  const seen = new Set<string>();
  const vocabulary: VocabItem[] = [];
  for (const m of messages) {
    for (const v of m.vocabulary ?? []) {
      const key = v.term.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        vocabulary.push(v);
      }
    }
  }
  return { turns: learner.length, durationSeconds, mistakeCount: mistakes.length, mistakes: mistakes.slice(0, 20), vocabulary: vocabulary.slice(0, 20) };
}

/** Splits a learner message into plain and highlighted parts, so mistakes can be underlined. */
export function highlightParts(text: string, corrections: Correction[]): { text: string; mistake?: Correction }[] {
  const ranges: { start: number; end: number; c: Correction }[] = [];
  const lower = text.toLowerCase();
  for (const c of corrections) {
    const at = lower.indexOf(c.original.toLowerCase());
    if (at < 0) continue;
    const end = at + c.original.length;
    if (ranges.some((r) => at < r.end && end > r.start)) continue;
    ranges.push({ start: at, end, c });
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: { text: string; mistake?: Correction }[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) parts.push({ text: text.slice(cursor, r.start) });
    parts.push({ text: text.slice(r.start, r.end), mistake: r.c });
    cursor = r.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}
