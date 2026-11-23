"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { ActionState } from "@/lib/action-state";
import { Notice } from "@/components/ui/Feedback";

/** Submit button that disables itself and shows a spinner while the Server Action runs. */
export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

type FieldBase = { label: string; name: string; error?: string; hint?: string };

export function Field({ label, name, error, hint, className = "", ...rest }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={`field ${error ? "!border-coral" : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, name, error, hint, className = "", ...rest }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        className={`field min-h-24 ${error ? "!border-coral" : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  error,
  hint,
  children,
  className = "",
  ...rest
}: FieldBase & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={name} className={`field ${error ? "!border-coral" : ""} ${className}`} aria-invalid={Boolean(error)} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-mute">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, name, hint, defaultChecked }: { label: string; name: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3.5 hover:bg-sunk">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-[rgb(var(--cobalt))]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-mute">{hint}</span>}
      </span>
    </label>
  );
}

/** Renders the outcome of a Server Action. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok && state.message) return <Notice tone="success">{state.message}</Notice>;
  return null;
}
