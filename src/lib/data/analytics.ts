import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillAttempt } from "@/lib/analytics";
import { getVocabularyCounts } from "@/lib/data/vocabulary";

export interface ProgressData {
  skillRows: SkillAttempt[];
  sessions: { started_at: string; duration_seconds: number }[];
  lessonsCompleted: number;
  xpTotal: number;
  vocab: { total: number; due: number; mastered: number };
}

const DAY_MS = 86_400_000;

/** All numbers for /progress. Every query is date- or row-bounded. */
export async function getProgressData(supabase: SupabaseClient, userId: string, now: Date = new Date()): Promise<ProgressData> {
  const since90 = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const since365 = new Date(now.getTime() - 365 * DAY_MS).toISOString();

  const [attempts, sessions, completed, xp, vocab] = await Promise.all([
    supabase
      .from("exercise_attempts")
      .select("skill, score, measured, created_at")
      .eq("user_id", userId)
      .gte("created_at", since90)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("learning_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", userId)
      .gte("started_at", since365)
      .order("started_at", { ascending: false })
      .limit(5000),
    supabase.from("user_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("lesson_attempts").select("xp_earned").eq("user_id", userId).limit(5000),
    getVocabularyCounts(supabase, userId),
  ]);

  for (const r of [attempts, sessions, completed, xp]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    skillRows: (attempts.data ?? []) as SkillAttempt[],
    sessions: (sessions.data ?? []) as ProgressData["sessions"],
    lessonsCompleted: completed.count ?? 0,
    xpTotal: ((xp.data ?? []) as { xp_earned: number }[]).reduce((sum, r) => sum + (r.xp_earned ?? 0), 0),
    vocab,
  };
}
