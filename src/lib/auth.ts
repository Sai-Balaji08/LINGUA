import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/types";

/**
 * Server-side session helpers. Every protected page and Server Action starts with one of these.
 * They call supabase.auth.getUser(), which verifies the token with Supabase (unlike getSession()).
 * The proxy already redirects anonymous visitors, but pages never rely on that alone.
 */

export const getSupabase = cache(async () => createClient());

async function loadProfile(userId: string, email: string | undefined): Promise<Profile> {
  const supabase = await getSupabase();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;
  // The signup trigger normally creates this row. This is a safety net if it is ever missing.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId, display_name: (email ?? "learner").split("@")[0] })
    .select("*")
    .single();
  if (error || !created) throw new Error("Could not load your profile. Has the database migration been run?");
  return created as Profile;
}

/** Signed-in user + profile, or redirect to /login. */
export const requireUser = cache(async () => {
  if (!isSupabaseConfigured()) redirect("/login?setup=1");
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await loadProfile(user.id, user.email);
  return { supabase, user, profile };
});

/** Like requireUser, but sends people who have not finished onboarding to /onboarding. */
export async function requireOnboarded() {
  const ctx = await requireUser();
  if (!ctx.profile.onboarded) redirect("/onboarding");
  return ctx;
}

/**
 * Admin gate. The role is read from the database on every call, never from the browser.
 * Non-admins get a 404 so the admin area is not even advertised to them.
 * Row Level Security independently blocks non-admin writes, so this is defence in depth.
 */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") notFound();
  return ctx;
}

/** For Server Actions that should return an error instead of redirecting. */
export async function getAdminOrNull() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? { supabase, user } : null;
}
