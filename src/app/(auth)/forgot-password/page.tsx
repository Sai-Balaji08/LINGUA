import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Forgot your password?</h1>
      <p className="mb-6 mt-2 text-mute">Enter your email and we will send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-mute">
        <Link href="/login" className="font-semibold text-cobalt hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
