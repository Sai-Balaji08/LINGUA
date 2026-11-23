import { describe, expect, it } from "vitest";
import { newPasswordSchema, passwordSchema, safeNext, signInSchema, signUpSchema } from "@/lib/auth-schemas";

describe("safeNext", () => {
  it("keeps internal paths", () => {
    expect(safeNext("/learn/abc?x=1")).toBe("/learn/abc?x=1");
  });
  it("blocks external and tricky redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "/a\nb", undefined, 5]) {
      expect(safeNext(bad as unknown)).toBe("/dashboard");
    }
  });
});

describe("password rules", () => {
  it("requires length, a letter and a number", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("goodpass123").success).toBe(true);
  });
  it("confirm must match", () => {
    expect(newPasswordSchema.safeParse({ password: "goodpass123", confirm: "goodpass124" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "goodpass123", confirm: "goodpass123" }).success).toBe(true);
  });
});

describe("sign up / sign in", () => {
  it("normalises the email", () => {
    const r = signUpSchema.parse({ displayName: "Sai", email: "  Sai@Example.COM ", password: "goodpass123" });
    expect(r.email).toBe("sai@example.com");
  });
  it("rejects bad input", () => {
    expect(signUpSchema.safeParse({ displayName: "S", email: "nope", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
