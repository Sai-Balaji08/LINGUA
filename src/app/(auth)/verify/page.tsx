import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendForm } from "@/components/auth/AuthForms";
import { z } from "zod";

export const metadata: Metadata = { title: "Check your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const valid = z.email().safeParse(email).success ? (email as string) : null;
  return (
    <>
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
        <MailCheck size={28} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-extrabold">Check your email</h1>
      <p className="mb-6 mt-2 text-mute">
        {valid ? (
          <>
            We sent a confirmation link to <strong className="text-ink">{valid}</strong>. Click it to verify your address and start setting up your course.
          </>
        ) : (
          "We sent you a confirmation link. Click it to verify your address and start setting up your course."
        )}
      </p>
      <p className="mb-6 text-sm text-mute">Nothing after a minute? Look in your spam folder.</p>
      {valid && <ResendForm email={valid} />}
      <p className="mt-6 text-center text-sm text-mute">
        <Link href="/login" className="font-semibold text-cobalt hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
