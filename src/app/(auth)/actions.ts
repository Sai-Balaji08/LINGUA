"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { fail, fieldErrorsFrom, succeed, type ActionState } from "@/lib/action-state";
import { newPasswordSchema, resetRequestSchema, safeNext, signInSchema, signUpSchema } from "@/lib/auth-schemas";

/** Server Actions for authentication. All validation happens here, on the server. */

const NOT_CONFIGURED = "LINGUA is not connected to Supabase yet. Follow the setup steps in README.md.";

/** Where Supabase should send people after they click an email link. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : siteUrl;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED);
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));

  const { displayName, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    if (/already|registered/i.test(error.message)) return fail("An account with this email already exists. Try logging in instead.", { email: "Already registered." });
    if (/rate|too many/i.test(error.message)) return fail("Too many attempts. Please wait a minute and try again.");
    return fail("We could not create your account. Please try again.");
  }

  // Supabase returns an empty identities list (and no error) when the email is already registered.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return fail("An account with this email already exists. Try logging in instead.", { email: "Already registered." });
  }

  // If email confirmation is switched off in Supabase, a session exists right away.
  if (data.session) redirect("/onboarding");
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED);
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) {
      return fail("Please verify your email first. Check your inbox for the confirmation link.");
    }
    if (/rate|too many/i.test(error.message)) return fail("Too many attempts. Please wait a minute and try again.");
    // One message for "no such user" and "wrong password", so the form cannot be used to discover accounts.
    return fail("That email and password do not match.");
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED);
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Always the same answer, whether or not the account exists.
  return succeed("If an account exists for that email, a reset link is on its way. It can take a minute to arrive.");
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED);
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error.issues));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("This reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/same|different/i.test(error.message)) return fail("Choose a password you have not used before.", { password: "Must be different from the old one." });
    return fail("We could not update your password. Please try again.");
  }
  redirect("/dashboard");
}

export async function resendVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED);
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return fail("Enter a valid email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error && /rate|too many|seconds/i.test(error.message)) return fail("Please wait a minute before asking for another email.");
  return succeed("Verification email sent. Check your inbox and spam folder.");
}
