import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/AuthForms";
import { Notice } from "@/components/ui/Feedback";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Start learning for free</h1>
      <p className="mb-6 mt-2 text-mute">It takes a minute. No card needed, and the core course stays free.</p>
      {!isSupabaseConfigured() && (
        <div className="mb-5">
          <Notice tone="info" title="Supabase is not connected yet">
            Accounts need a Supabase project. Follow the setup steps in README.md, then restart the dev server.
          </Notice>
        </div>
      )}
      <SignupForm />
      <p className="mt-4 text-center text-xs text-mute">
        We never sell your learning data. You can delete your account and everything in it from Settings.
      </p>
      <p className="mt-6 text-center text-sm text-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-cobalt hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
