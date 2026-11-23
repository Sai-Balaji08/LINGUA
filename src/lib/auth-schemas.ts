import { z } from "zod";

/** Validation for the auth forms. Used by the Server Actions (never trust the browser) and by unit tests. */

export const emailSchema = z.string().trim().toLowerCase().min(1, "Enter your email.").max(254).pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number.");

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(60, "Use at most 60 characters."),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords do not match." });

/**
 * Only allow redirects to pages inside this site. Blocks "//evil.com", "https://evil.com" and "/\evil.com",
 * which would turn the login page into an open redirect.
 */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
