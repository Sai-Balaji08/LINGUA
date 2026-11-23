"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboarded } from "@/lib/auth";
import { fail, succeed, type ActionState } from "@/lib/action-state";
import { parseVocabulary } from "@/lib/admin/schemas";
import { nextReview, type Rating } from "@/lib/srs";

/** Server Actions for saved words and spaced-repetition reviews. Every one re-checks the user and validates input. */

const idField = z.guid();

function refresh() {
  revalidatePath("/vocabulary");
  revalidatePath("/review");
  revalidatePath("/dashboard");
}

/** Add a curated word to the learner's deck. Safe to press twice. */
export async function saveWord(formData: FormData): Promise<void> {
  const { supabase, user } = await requireOnboarded();
  const id = idField.safeParse(formData.get("vocabularyId"));
  if (!id.success) return;
  await supabase.from("user_vocabulary").upsert({ user_id: user.id, vocabulary_id: id.data }, { onConflict: "user_id,vocabulary_id", ignoreDuplicates: true });
  refresh();
}

/** Remove a word from the deck. A learner's own custom word is deleted completely. */
export async function removeWord(formData: FormData): Promise<void> {
  const { supabase, user } = await requireOnboarded();
  const id = idField.safeParse(formData.get("userVocabularyId"));
  if (!id.success) return;
  const { data: card } = await supabase.from("user_vocabulary").select("id, vocabulary_id, vocabulary(owner_id)").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (!card) return;
  const owner = (card as unknown as { vocabulary: { owner_id: string | null } | null }).vocabulary?.owner_id;
  if (owner === user.id) await supabase.from("vocabulary").delete().eq("id", card.vocabulary_id).eq("owner_id", user.id);
  else await supabase.from("user_vocabulary").delete().eq("id", id.data).eq("user_id", user.id);
  refresh();
}

/** Create a private word in the learner's current language and add it to the deck. */
export async function addCustomWord(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, profile } = await requireOnboarded();
  if (!profile.target_language_id) return fail("Choose a language to learn first.");
  const parsed = parseVocabulary(formData);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);

  const { data: word, error } = await supabase
    .from("vocabulary")
    .insert({ ...parsed.data, language_id: profile.target_language_id, owner_id: user.id })
    .select("id")
    .single();
  if (error || !word) {
    if (error?.code === "23505") return fail("You already have that word.", { term: "Already saved." });
    return fail("We could not save that word. Please try again.");
  }
  const { error: saveError } = await supabase.from("user_vocabulary").insert({ user_id: user.id, vocabulary_id: word.id });
  if (saveError) return fail("The word was created but could not be added to your deck.");
  refresh();
  return succeed("Word added to your deck.");
}

const reviewSchema = z.object({
  userVocabularyId: z.guid(),
  rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  timeMs: z.number().int().min(0).max(10 * 60_000).default(0),
});

/** Records one flashcard rating. The next interval is calculated here from the stored card, never taken from the browser. */
export async function reviewWord(input: unknown): Promise<{ ok: boolean; error?: string; intervalDays?: number }> {
  const { supabase, user } = await requireOnboarded();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review." };
  const { userVocabularyId, rating, timeMs } = parsed.data;

  const { data: card } = await supabase.from("user_vocabulary").select("*").eq("id", userVocabularyId).eq("user_id", user.id).maybeSingle();
  if (!card) return { ok: false, error: "That card no longer exists." };

  const now = new Date();
  const next = nextReview({ ease_factor: Number(card.ease_factor), interval_days: card.interval_days, repetitions: card.repetitions, lapses: card.lapses }, rating as Rating, now);

  const { error: updateError } = await supabase
    .from("user_vocabulary")
    .update({ ease_factor: next.ease_factor, interval_days: next.interval_days, repetitions: next.repetitions, lapses: next.lapses, due_at: next.due_at.toISOString(), last_reviewed_at: now.toISOString() })
    .eq("id", userVocabularyId)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: "Could not save that review. Please try again." };

  // Individual review history (used for analytics and to audit the scheduler).
  await supabase.from("vocabulary_reviews").insert({
    user_id: user.id,
    user_vocabulary_id: userVocabularyId,
    rating,
    interval_before: card.interval_days,
    interval_after: next.interval_days,
    ease_after: next.ease_factor,
    time_ms: timeMs,
  });
  return { ok: true, intervalDays: next.interval_days };
}

/** Called once at the end of a review run to log study time and check achievements. */
export async function finishReview(input: unknown): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireOnboarded();
  const parsed = z.object({ cards: z.number().int().min(1).max(200), durationSeconds: z.number().int().min(1).max(4 * 3600) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const duration = Math.min(parsed.data.durationSeconds, parsed.data.cards * 120); // two minutes per card at most
  await supabase.from("learning_sessions").insert({ user_id: user.id, activity: "review", duration_seconds: duration });
  await supabase.rpc("evaluate_achievements");
  refresh();
  return { ok: true };
}
