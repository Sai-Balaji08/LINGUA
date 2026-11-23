import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfig, isSupabaseConfigured } from "@/lib/env";
import { AiError, isAiConfigured } from "@/lib/ai/provider";
import type { ApiErrorCode } from "@/lib/ai/types";
import type { Profile } from "@/lib/types";

/**
 * Shared guard for every /api/ai/* route. In order it checks:
 * body is valid -> user is signed in -> learner allows AI -> provider is configured -> daily quota.
 * If the provider then fails, the quota is refunded and the caller gets a clear, non-technical error code.
 * Lessons never call these routes for anything required, so AI trouble can never block learning.
 */

const MAX_BODY_CHARS = 20_000;

const MESSAGES: Record<ApiErrorCode, string> = {
  unavailable: "The AI helper is not available right now. Your lessons and review still work.",
  quota: "You have used today's AI help. It resets tomorrow, and lessons are never limited.",
  disabled: "AI feedback is switched off in your privacy settings.",
  invalid: "That request was not valid.",
  unauthenticated: "Please log in again.",
};

const STATUS: Record<ApiErrorCode, number> = { unavailable: 503, quota: 429, disabled: 403, invalid: 400, unauthenticated: 401 };

export function apiError(code: ApiErrorCode) {
  return NextResponse.json({ ok: false, code, error: MESSAGES[code] }, { status: STATUS[code] });
}

export interface AiContext<B> {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  body: B;
}

export async function aiRoute<B>(
  request: Request,
  schema: z.ZodType<B>,
  handler: (ctx: AiContext<B>) => Promise<Record<string, unknown>>,
  options: { consumeQuota?: boolean; requireAi?: boolean } = {},
): Promise<NextResponse> {
  const consumeQuota = options.consumeQuota ?? true;
  const requireAi = options.requireAi ?? true;

  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_CHARS) return apiError("invalid");
  let json: unknown;
  try {
    json = JSON.parse(text || "{}");
  } catch {
    return apiError("invalid");
  }
  const body = schema.safeParse(json);
  if (!body.success) return apiError("invalid");

  if (!isSupabaseConfigured()) return apiError("unauthenticated");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return apiError("unauthenticated");
  // Routes that never call the provider (like ending a conversation) set requireAi: false so they work even when AI is off.
  if (requireAi && !(profile as Profile).allow_ai_feedback) return apiError("disabled");
  if (requireAi && !isAiConfigured()) return apiError("unavailable");

  if (consumeQuota) {
    const { data: allowed, error } = await supabase.rpc("consume_ai_quota", { p_limit: aiConfig.dailyLimit });
    if (error) return apiError("unavailable");
    if (!allowed) return apiError("quota");
  }

  try {
    const result = await handler({ supabase, user, profile: profile as Profile, body: body.data });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (consumeQuota) await supabase.rpc("refund_ai_quota");
    if (err instanceof AiError) return apiError("unavailable");
    if (err instanceof RouteError) return NextResponse.json({ ok: false, code: err.code, error: err.message }, { status: err.status });
    console.error("AI route failed", err instanceof Error ? err.message : err);
    return apiError("unavailable");
  }
}

/** Throw from a handler to return a specific, safe error (for example "conversation not found"). */
export class RouteError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code: ApiErrorCode = "invalid",
  ) {
    super(message);
  }
}
