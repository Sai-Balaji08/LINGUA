import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/AuthForms";
import { Notice } from "@/components/ui/Feedback";
import { safeNext } from "@/lib/auth-schemas";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; setup?: string; error?: string }> }) {
  const sp = await searchParams;
  const configured = isSupabaseConfigured();
  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mb-6 mt-2 text-mute">Log in to pick up where you left off.</p>

      {!configured && (
        <div className="mb-5">
          <Notice tone="info" title="Supabase is not connected yet">
            Accounts need a Supabase project. Follow the setup steps in README.md, then restart the dev server.
          </Notice>
        </div>
      )}
      {sp.error === "link" && (
        <div className="mb-5">
          <Notice tone="error" title="That link did not work">
            It may have expired or already been used. Log in, or request a new link.
          </Notice>
        </div>
      )}

      <LoginForm next={sp.next ? safeNext(sp.next) : undefined} />

      <p className="mt-6 text-center text-sm text-mute">
        New to LINGUA?{" "}
        <Link href="/signup" className="font-semibold text-cobalt hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}
