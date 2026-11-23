"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboarded } from "@/lib/auth";
import { fail, fieldErrorsFrom, succeed, type ActionState } from "@/lib/action-state";
import { passwordSchema } from "@/lib/auth-schemas";
import { preferencesSchema } from "@/lib/preferences";

/** Server Actions for /settings. Each one re-checks the session and validates its own input. */

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(60, "Use at most 60 characters."),
});

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireOnboarded();
  const parsed = profileSchema.safeParse({ display_name: formData.get("display_name") });
  if (!parsed.success) return fail("Please fix the highlighted field.", fieldErrorsFrom(parsed.error.issues));
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return fail("We could not save your name. Please try again.");
  revalidatePath("/", "layout");
  return succeed("Name updated.");
}

/** Same six answers as onboarding, validated by the same schema. Switching language keeps progress in the old one. */
export async function savePreferences(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, profile } = await requireOnboarded();
  const parsed = preferencesSchema.safeParse({
    native_language: formData.get("native_language"),
    target_language_id: formData.get("target_language_id"),
    proficiency: formData.get("proficiency"),
    objective: formData.get("objective"),
    daily_goal_minutes: formData.get("daily_goal_minutes"),
    learning_style: formData.get("learning_style"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  const prefs = parsed.data;

  // RLS hides unpublished languages from learners, so this also stops choosing one.
  const { data: language } = await supabase.from("languages").select("id").eq("id", prefs.target_language_id).eq("published", true).maybeSingle();
  if (!language) return fail("That language is not available.", { target_language_id: "Choose an available language." });

  const { error } = await supabase.from("profiles").update(prefs).eq("id", user.id);
  if (error) return fail("We could not save your preferences. Please try again.");

  if (prefs.target_language_id !== profile.target_language_id) {
    // Create the course row for a newly chosen language; never overwrite an existing one (it holds the placement result).
    const { data: existing } = await supabase.from("user_languages").select("language_id").eq("user_id", user.id).eq("language_id", prefs.target_language_id).maybeSingle();
    if (!existing) {
      const { error: langError } = await supabase.from("user_languages").insert({ user_id: user.id, language_id: prefs.target_language_id, proficiency: prefs.proficiency });
      if (langError) return fail("Your preferences were saved, but we could not add the new language. Please try again.");
    }
  }
  revalidatePath("/", "layout");
  return succeed("Learning preferences saved.");
}

export async function saveNotifications(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireOnboarded();
  const { error } = await supabase
    .from("profiles")
    .update({ notify_daily_reminder: formData.get("notify_daily_reminder") === "on", notify_weekly_summary: formData.get("notify_weekly_summary") === "on" })
    .eq("id", user.id);
  if (error) return fail("We could not save your notification settings.");
  return succeed("Notification settings saved.");
}

export async function savePrivacy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireOnboarded();
  const { error } = await supabase.from("profiles").update({ allow_ai_feedback: formData.get("allow_ai_feedback") === "on" }).eq("id", user.id);
  if (error) return fail("We could not save your privacy settings.");
  revalidatePath("/", "layout");
  return succeed("Privacy settings saved.");
}

/** Removes the learner's saved AI conversations (text they typed). Lesson progress is untouched. */
export async function deleteConversations(_prev: ActionState): Promise<ActionState> {
  const { supabase, user } = await requireOnboarded();
  const { error } = await supabase.from("ai_conversations").delete().eq("user_id", user.id);
  if (error) return fail("We could not delete your conversations.");
  return succeed("All saved AI conversations were deleted.");
}

const passwordChangeSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords do not match." });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireOnboarded();
  const parsed = passwordChangeSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/same|different/i.test(error.message)) return fail("Choose a password you have not used before.", { password: "Must be different from the old one." });
    return fail("We could not change your password. Please try again.");
  }
  return succeed("Password changed.");
}

/**
 * Permanently deletes the account and every row that belongs to it.
 * Done by the delete_my_account() database function (SECURITY DEFINER, only ever deletes auth.uid()),
 * so the service-role key is never needed.
 */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireOnboarded();
  if (formData.get("confirm") !== "DELETE") return fail("Type DELETE in capital letters to confirm.", { confirm: "Type DELETE to confirm." });
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return fail("We could not delete your account. Please try again or contact support.");
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
