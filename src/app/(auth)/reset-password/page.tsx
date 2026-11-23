import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { Notice } from "@/components/ui/Feedback";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the email link: /auth/callback has already created a session, so we only need to confirm it exists. */
export default async function ResetPasswordPage() {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  if (!signedIn) {
    return (
      <>
        <h1 className="text-3xl font-extrabold">This link has expired</h1>
        <div className="my-6">
          <Notice tone="error">Reset links work once and expire after a while. Request a fresh one.</Notice>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full !py-3">
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold">Choose a new password</h1>
      <p className="mb-6 mt-2 text-mute">You will be logged in once it is saved.</p>
      <ResetPasswordForm />
    </>
  );
}
