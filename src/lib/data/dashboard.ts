import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeActivity, summarizeSkills, type ActivitySummary, type SkillSummary } from "@/lib/analytics";
import { dayKey } from "@/lib/stats";
import { countCompleted, flattenLessons, getCourseOutline, getProgressMap, getUserLanguage, pickNextLesson, type CourseOutline, type FlatLesson } from "@/lib/data/courses";
import { getProgressData } from "@/lib/data/analytics";
import type { Language, Profile } from "@/lib/types";

export interface RecentItem {
  kind: "lesson" | "conversation";
  title: string;
  detail: string;
  at: string;
}

export interface DashboardData {
  language: Language | null;
  outline: CourseOutline | null;
  next: FlatLesson | null;
  totalLessons: number;
  completedLessons: number;
  activity: ActivitySummary;
  todayMinutes: number;
  skills: SkillSummary[];
  weakest: SkillSummary | null;
  vocab: { total: number; due: number; mastered: number };
  recent: RecentItem[];
  lessonsThisWeek: number;
  placementScore: number | null;
}

/** One round of parallel, bounded queries for the dashboard. Everything shown comes from the learner's own rows. */
export async function getDashboardData(supabase: SupabaseClient, userId: string, profile: Profile, tz: string, now = new Date()): Promise<DashboardData> {
  const languageId = profile.target_language_id;
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [langRes, outline, progress, userLang, stats, attempts, convos, weekLessons] = await Promise.all([
    languageId ? supabase.from("languages").select("*").eq("id", languageId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    languageId ? getCourseOutline(supabase, languageId) : Promise.resolve(null),
    getProgressMap(supabase, userId),
    languageId ? getUserLanguage(supabase, userId, languageId) : Promise.resolve(null),
    getProgressData(supabase, userId, now),
    supabase.from("lesson_attempts").select("score, completed_at, lessons(title)").eq("user_id", userId).order("completed_at", { ascending: false }).limit(5),
    supabase.from("ai_conversations").select("scenario, summary, ended_at").eq("user_id", userId).eq("status", "ended").order("ended_at", { ascending: false }).limit(3),
    supabase.from("lesson_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("completed_at", weekAgo),
  ]);

  const flat = flattenLessons(outline);
  const activity = summarizeActivity(stats.sessions, tz, now);
  const today = dayKey(now, tz);
  const todayMinutes = activity.byDay.find((d) => d.day === today)?.minutes ?? 0;

  const skills = summarizeSkills(stats.skillRows);
  const rated = skills.filter((s) => s.enough && s.accuracy !== null);
  const weakest = rated.length >= 2 ? rated.reduce((a, b) => ((a.accuracy as number) <= (b.accuracy as number) ? a : b)) : null;

  const recent: RecentItem[] = [
    ...((attempts.data ?? []) as unknown as { score: number; completed_at: string; lessons: { title: string } | null }[]).map((a) => ({
      kind: "lesson" as const,
      title: a.lessons?.title ?? "Lesson",
      detail: `${Math.round(Number(a.score))}%`,
      at: a.completed_at,
    })),
    ...((convos.data ?? []) as unknown as { scenario: string; summary: { mistakeCount?: number } | null; ended_at: string }[]).map((c) => ({
      kind: "conversation" as const,
      title: c.scenario.replace(/_/g, " "),
      detail: c.summary?.mistakeCount !== undefined ? `${c.summary.mistakeCount} corrections` : "Finished",
      at: c.ended_at,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return {
    language: (langRes.data as Language | null) ?? null,
    outline,
    next: pickNextLesson(flat, progress, userLang?.start_lesson_id),
    totalLessons: flat.length,
    completedLessons: countCompleted(flat, progress),
    activity,
    todayMinutes,
    skills,
    weakest,
    vocab: stats.vocab,
    recent,
    lessonsThisWeek: weekLessons.count ?? 0,
    placementScore: userLang?.placement_score !== null && userLang?.placement_score !== undefined ? Number(userLang.placement_score) : null,
  };
}

export function greetingFor(now: Date, tz: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(now)) % 24;
  if (hour < 5) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function relativeTime(iso: string, now = new Date()): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
