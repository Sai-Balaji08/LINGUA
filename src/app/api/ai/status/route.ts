import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfig, isSupabaseConfigured } from "@/lib/env";
import { isAiConfigured } from "@/lib/ai/provider";

/** Tells the UI whether AI features can be used and how many requests are left today. Never calls the provider. */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, configured: false, enabled: false, remaining: 0 }, { status: 401 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, configured: false, enabled: false, remaining: 0 }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("allow_ai_feedback").eq("id", user.id).maybeSingle();
  const { data: remaining } = await supabase.rpc("ai_quota_remaining", { p_limit: aiConfig.dailyLimit });
  return NextResponse.json({
    ok: true,
    configured: isAiConfigured(),
    enabled: Boolean(profile?.allow_ai_feedback),
    remaining: typeof remaining === "number" ? remaining : 0,
    limit: aiConfig.dailyLimit,
  });
}
