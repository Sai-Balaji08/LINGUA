/** Public Supabase settings. These two values are safe to ship to the browser. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));
}

/** Server-only AI settings. Never prefix these with NEXT_PUBLIC_. */
export const aiConfig = {
  get apiKey() {
    return process.env.ANTHROPIC_API_KEY ?? "";
  },
  get model() {
    return process.env.AI_MODEL ?? "claude-haiku-5-5";
  },
  get dailyLimit() {
    const n = Number(process.env.AI_DAILY_LIMIT ?? 40);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
  },
};

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
