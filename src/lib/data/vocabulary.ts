import type { SupabaseClient } from "@supabase/supabase-js";
import { MASTERED_INTERVAL_DAYS, isDifficult, isDue, isMastered } from "@/lib/srs";
import type { UserVocabulary, VocabularyWord } from "@/lib/types";

/** Read-side helpers for saved vocabulary and the spaced-repetition queue. */

export type SavedWord = UserVocabulary & { vocabulary: VocabularyWord };

export const VOCAB_TABS = ["all", "due", "difficult", "mastered", "new"] as const;
export type VocabTab = (typeof VOCAB_TABS)[number];

export function parseTab(value: string | undefined): VocabTab {
  return (VOCAB_TABS as readonly string[]).includes(value ?? "") ? (value as VocabTab) : "all";
}

/** Saved words the learner has due right now. One cheap count query. */
export async function getDueCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_vocabulary")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getVocabularyCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ total: number; due: number; mastered: number }> {
  const base = () => supabase.from("user_vocabulary").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const [total, mastered, due] = await Promise.all([
    base(),
    base().gte("interval_days", MASTERED_INTERVAL_DAYS),
    getDueCount(supabase, userId),
  ]);
  if (total.error) throw new Error(total.error.message);
  if (mastered.error) throw new Error(mastered.error.message);
  return { total: total.count ?? 0, due, mastered: mastered.count ?? 0 };
}

/** The learner's saved words with their dictionary entry, in one query (no N+1). */
export async function getSavedWords(
  supabase: SupabaseClient,
  userId: string,
  languageId?: string | null,
): Promise<SavedWord[]> {
  let query = supabase
    .from("user_vocabulary")
    .select("*, vocabulary!inner(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (languageId) query = query.eq("vocabulary.language_id", languageId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as SavedWord;
    return { ...r, ease_factor: Number(r.ease_factor) };
  });
}

/** Curated words for a language that the learner has not saved yet. */
export async function getLibraryWords(
  supabase: SupabaseClient,
  languageId: string,
  alreadySaved: Set<string>,
  limit = 60,
): Promise<VocabularyWord[]> {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("*")
    .eq("language_id", languageId)
    .is("owner_id", null)
    .order("term")
    .limit(400);
  if (error) throw new Error(error.message);
  return ((data ?? []) as VocabularyWord[]).filter((w) => !alreadySaved.has(w.id)).slice(0, limit);
}

export function isNewCard(w: Pick<UserVocabulary, "repetitions" | "last_reviewed_at">): boolean {
  return w.repetitions === 0 && !w.last_reviewed_at;
}

/** Pure filter used by the vocabulary page (and unit-testable). */
export function filterSaved(words: SavedWord[], opts: { tab: VocabTab; query?: string; now?: Date }): SavedWord[] {
  const now = opts.now ?? new Date();
  const q = (opts.query ?? "").trim().toLowerCase();
  return words.filter((w) => {
    if (q) {
      const v = w.vocabulary;
      const hay = `${v.term} ${v.translation} ${v.transliteration ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    switch (opts.tab) {
      case "due":
        return isDue(w.due_at, now);
      case "difficult":
        return isDifficult(w);
      case "mastered":
        return isMastered(w);
      case "new":
        return isNewCard(w);
      default:
        return true;
    }
  });
}

/** "Due now", "Tomorrow", "In 5 days". */
export function dueLabel(dueAt: string, now: Date = new Date()): string {
  const diffMs = new Date(dueAt).getTime() - now.getTime();
  if (diffMs <= 0) return "Due now";
  const days = Math.ceil(diffMs / 86_400_000);
  return days <= 1 ? "Tomorrow" : `In ${days} days`;
}
