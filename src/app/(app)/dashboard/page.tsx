import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Flame, Layers, MessageCircle, Target } from "lucide-react";
import { AiTips } from "@/components/ai/AiTips";
import { EmptyState, ProgressBar } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import { getDashboardData, greetingFor, relativeTime } from "@/lib/data/dashboard";
import { getTimeZone } from "@/lib/tz";
import { formatMinutes } from "@/lib/analytics";
import { percent } from "@/lib/stats";

export const metadata: Metadata = { title: "Home" };

const SKILL_NAMES: Record<string, string> = { reading: "reading", listening: "listening", writing: "writing", speaking: "speaking", grammar: "grammar", vocabulary: "vocabulary" };

function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboarded();
  const tz = await getTimeZone();
  const now = new Date();
  const d = await getDashboardData(supabase, user.id, profile, tz, now);
  const firstName = profile.display_name.split(" ")[0] || "there";

  const goalPct = Math.min(100, percent(d.todayMinutes, profile.daily_goal_minutes));
  const goalMet = d.todayMinutes >= profile.daily_goal_minutes;
  const courseDone = d.totalLessons > 0 && d.completedLessons === d.totalLessons;
  const maxMinutes = Math.max(profile.daily_goal_minutes, ...d.activity.byDay.map((x) => x.minutes), 1);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-mute">
          {d.language ? `Learning ${d.language.name}` : "No language selected"}
          {d.next ? ` · ${d.next.level.code}` : ""}
        </p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {greetingFor(now, tz)}, {firstName}
        </h1>
      </header>

      {!d.outline || d.totalLessons === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} aria-hidden="true" />}
          title="Your course is not ready yet"
          body="There are no published lessons for your language. If you run this site, load the starter content from README.md, or publish lessons in the Admin area."
          action={<Link href="/settings" className="btn-ghost">Change language</Link>}
        />
      ) : (
        <section className="relative overflow-hidden rounded-3xl bg-cobalt p-6 text-white shadow-lift sm:p-8" aria-labelledby="continue-h">
          <p className="text-sm font-medium text-white/80">
            {courseDone ? "Course complete. Revisit anything." : d.completedLessons === 0 ? "Start here" : "Continue learning"}
          </p>
          <h2 id="continue-h" className="mt-1 text-2xl font-extrabold sm:text-3xl">{d.next?.lesson.title}</h2>
          <p className="mt-1 max-w-lg text-white/80">
            {d.next?.unit.title} · about {d.next?.lesson.estimated_minutes} min
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/learn/${d.next?.lesson.id}`} className="btn bg-white !px-6 !py-3 text-cobalt hover:bg-white/90">
              {courseDone ? "Review lesson" : d.completedLessons === 0 ? "Start lesson" : "Continue"} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/learn" className="btn border border-white/40 text-white hover:bg-white/10">View course map</Link>
          </div>
          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex justify-between text-sm text-white/90">
              <span>{d.outline.course.title}</span>
              <span>{d.completedLessons}/{d.totalLessons} lessons</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-label="Course progress" aria-valuenow={percent(d.completedLessons, d.totalLessons)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-saffron" style={{ width: `${percent(d.completedLessons, d.totalLessons)}%` }} />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-5" aria-labelledby="goal-h">
          <h2 id="goal-h" className="flex items-center gap-2 font-bold"><Target size={18} className="text-cobalt" aria-hidden="true" /> Today&apos;s goal</h2>
          <p className="mt-3 font-display text-4xl font-extrabold">
            {d.todayMinutes}<span className="text-xl text-mute"> / {profile.daily_goal_minutes} min</span>
          </p>
          <div className="mt-3"><ProgressBar value={goalPct} label="Daily goal" tone={goalMet ? "mint" : "cobalt"} /></div>
          <p className="mt-2 text-sm text-mute">{goalMet ? "Goal reached. Anything more is a bonus." : `${profile.daily_goal_minutes - d.todayMinutes} min to go.`}</p>
        </section>

        <section className="card p-5" aria-labelledby="streak-h">
          <h2 id="streak-h" className="flex items-center gap-2 font-bold"><Flame size={18} className="text-saffron" aria-hidden="true" /> Practice days in a row</h2>
          <p className="mt-3 font-display text-4xl font-extrabold">{d.activity.streak.current}<span className="text-xl text-mute"> {d.activity.streak.current === 1 ? "day" : "days"}</span></p>
          <p className="mt-2 text-sm text-mute">Longest so far: {d.activity.streak.longest}. A missed day is just a missed day.</p>
        </section>

        <section className="card p-5" aria-labelledby="vocab-h">
          <h2 id="vocab-h" className="flex items-center gap-2 font-bold"><Layers size={18} className="text-mint" aria-hidden="true" /> Word review</h2>
          <p className="mt-3 font-display text-4xl font-extrabold">{d.vocab.due}<span className="text-xl text-mute"> due</span></p>
          <p className="mt-2 text-sm text-mute">{d.vocab.total === 0 ? "Save words from lessons to start reviewing." : `${d.vocab.total} saved · ${d.vocab.mastered} mastered`}</p>
          {d.vocab.due > 0 && <Link href="/review" className="btn-ghost mt-3">Review now <ArrowRight size={16} aria-hidden="true" /></Link>}
          {d.vocab.total === 0 && <Link href="/vocabulary" className="btn-ghost mt-3">Browse words</Link>}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="week-h">
          <div className="flex items-baseline justify-between">
            <h2 id="week-h" className="font-bold">This week</h2>
            <p className="text-sm text-mute">{formatMinutes(d.activity.weekMinutes)} · {d.lessonsThisWeek} {d.lessonsThisWeek === 1 ? "lesson" : "lessons"}</p>
          </div>
          <ul className="mt-5 grid h-36 grid-cols-7 items-end gap-2" aria-label="Minutes practised each day this week">
            {d.activity.byDay.map((day) => (
              <li key={day.day} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-medium text-mute">{day.minutes || ""}</span>
                <div
                  className={`w-full rounded-t-lg ${day.minutes >= profile.daily_goal_minutes ? "bg-mint" : day.minutes > 0 ? "bg-cobalt" : "bg-sunk"}`}
                  style={{ height: `${Math.max(day.minutes > 0 ? 10 : 4, (day.minutes / maxMinutes) * 100)}%` }}
                  role="img"
                  aria-label={`${weekday(day.day)}: ${day.minutes} minutes`}
                />
                <span className="text-xs text-mute">{weekday(day.day)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="rec-h">
          <h2 id="rec-h" className="font-bold">Recommended next</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {d.vocab.due >= 5 && (
              <li>
                <Link href="/review" className="font-semibold text-cobalt hover:underline">Review {d.vocab.due} due words</Link>
                <p className="text-mute">Spaced repetition works best when reviews are not left too long.</p>
              </li>
            )}
            {d.next && (
              <li>
                <Link href={`/learn/${d.next.lesson.id}`} className="font-semibold text-cobalt hover:underline">{d.next.lesson.title}</Link>
                <p className="text-mute">{courseDone ? "Revisit a lesson to keep it fresh." : "The next lesson on your path."}</p>
              </li>
            )}
            {d.weakest && (
              <li>
                <span className="font-semibold">Strengthen your {SKILL_NAMES[d.weakest.skill]}</span>
                <p className="text-mute">It is your lowest measured skill at {d.weakest.accuracy}%. Look for lessons with more {SKILL_NAMES[d.weakest.skill]} exercises, or practise in a conversation.</p>
              </li>
            )}
            <li>
              <Link href="/conversation" className="inline-flex items-center gap-1.5 font-semibold text-cobalt hover:underline"><MessageCircle size={14} aria-hidden="true" /> Practise a conversation</Link>
              <p className="text-mute">Use what you know in a real situation.</p>
            </li>
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="recent-h">
          <h2 id="recent-h" className="font-bold">Recent activity</h2>
          {d.recent.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Nothing yet. Finish your first lesson and it will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {d.recent.map((r) => (
                <li key={`${r.kind}-${r.at}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium capitalize">{r.title}</span>
                    <span className="text-xs text-mute">{r.kind === "lesson" ? "Lesson" : "Conversation"} · {relativeTime(r.at, now)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-sunk px-2.5 py-1 text-xs font-semibold">{r.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <AiTips enabled={profile.allow_ai_feedback} />
      </div>
    </div>
  );
}
