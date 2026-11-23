"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialState } from "@/lib/action-state";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { requestPasswordReset, resendVerification, signIn, signUp, updatePassword } from "@/app/(auth)/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <div className="text-right">
        <Link href="/forgot-password" className="text-sm font-medium text-cobalt hover:underline">
          Forgot your password?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full !py-3" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Your name" name="displayName" autoComplete="name" required error={state.fieldErrors?.displayName} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full !py-3" pendingLabel="Creating your account…">
        Create free account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full !py-3" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={state.fieldErrors?.password}
      />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full !py-3" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerification, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost w-full" pendingLabel="Sending…">
        Send the email again
      </SubmitButton>
    </form>
  );
}
