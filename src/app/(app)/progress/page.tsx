import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookCheck, Clock, Flame, Layers, Zap } from "lucide-react";
import { EmptyState, ProgressBar } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import { MIN_ATTEMPTS_FOR_SCORE, formatMinutes, summarizeActivity, summarizeSkills, trendSummary, weeklyTrend } from "@/lib/analytics";
import { getProgressData } from "@/lib/data/analytics";
import { getTimeZone } from "@/lib/tz";

export const metadata: Metadata = { title: "Progress" };

const SKILL_LABEL: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
};

const SKILL_NOTE: Record<string, string> = {
  speaking: "Speaking exercises are self-rated, so they are not scored. Only answers that can be checked count here.",
};

function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}
function shortDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function ProgressPage() {
  const { supabase, user, profile } = await requireOnboarded();
  const tz = await getTimeZone();
  const now = new Date();

  const [data, achievementRows] = await Promise.all([
    getProgressData(supabase, user.id, now),
    supabase.from("user_achievements").select("earned_at, achievements(code, title, description)").eq("user_id", user.id).order("earned_at", { ascending: false }),
  ]);

  const skills = summarizeSkills(data.skillRows);
  const trend = weeklyTrend(data.skillRows, tz, now, 8);
  const trendText = trendSummary(trend);
  const activity = summarizeActivity(data.sessions, tz, now);
  const maxMinutes = Math.max(profile.daily_goal_minutes, ...activity.byDay.map((d) => d.minutes), 1);
  const measuredTotal = skills.reduce((n, s) => n + s.attempts, 0);

  const achievements = ((achievementRows.data ?? []) as unknown as { earned_at: string; achievements: { code: string; title: string; description: string } | { code: string; title: string; description: string }[] | null }[])
    .map((r) => ({ earned_at: r.earned_at, a: Array.isArray(r.achievements) ? r.achievements[0] : r.achievements }))
    .filter((r): r is { earned_at: string; a: { code: string; title: string; description: string } } => Boolean(r.a));

  const nothingYet = data.lessonsCompleted === 0 && data.sessions.length === 0 && measuredTotal === 0 && data.vocab.total === 0;
  if (nothingYet) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Progress</h1>
        <EmptyState
          icon={<BookCheck size={32} aria-hidden="true" />}
          title="Nothing to show yet"
          body="Finish a lesson and your skills, time and vocabulary will start to appear here."
          action={<Link href="/learn" className="btn-primary">Start a lesson</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-mute">Your learning, honestly measured</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Progress</h1>
      </header>

      {/* ---------- skills: real assessment ---------- */}
      <section aria-labelledby="skills-h" className="space-y-4">
        <div>
          <h2 id="skills-h" className="text-xl font-extrabold">Skills</h2>
          <p className="mt-1 max-w-2xl text-sm text-mute">
            Accuracy on exercises that could be checked, over the last 90 days. A score appears once you have at least {MIN_ATTEMPTS_FOR_SCORE} checked answers, so one lucky guess never counts as a skill level.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <li key={s.skill} className="card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold">{SKILL_LABEL[s.skill]}</h3>
                <span className="font-display text-2xl font-extrabold">{s.enough && s.accuracy !== null ? `${s.accuracy}%` : "–"}</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={s.enough && s.accuracy !== null ? s.accuracy : 0} label={`${SKILL_LABEL[s.skill]} accuracy`} tone={s.accuracy !== null && s.accuracy >= 80 ? "mint" : "cobalt"} />
              </div>
              <p className="mt-2 text-xs text-mute">
                {s.attempts === 0 && s.unmeasured === 0
                  ? "No answers yet."
                  : s.enough
                    ? `Based on ${s.attempts} checked answers.`
                    : s.attempts > 0
                      ? `Not enough data yet (${s.attempts} of ${MIN_ATTEMPTS_FOR_SCORE}).`
                      : "No checked answers yet."}
                {s.unmeasured > 0 && ` ${s.unmeasured} self-rated.`}
              </p>
              {SKILL_NOTE[s.skill] && s.unmeasured > 0 && <p className="mt-1 text-xs text-mute">{SKILL_NOTE[s.skill]}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- improvement over time ---------- */}
      <section aria-labelledby="trend-h" className="card p-5">
        <h2 id="trend-h" className="text-xl font-extrabold">Improvement over time</h2>
        <p className="mt-1 text-sm text-mute">{trendText ?? "Average accuracy per week. Keep practising and a trend will appear after two weeks with data."}</p>
        <ol className="mt-5 grid h-40 grid-cols-8 items-end gap-2" aria-label="Average accuracy for each of the last eight weeks">
          {trend.map((p) => (
            <li key={p.start} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-medium text-mute">{p.accuracy === null ? "" : `${p.accuracy}%`}</span>
              <div
                className={`w-full rounded-t-lg ${p.accuracy === null ? "bg-sunk" : p.accuracy >= 80 ? "bg-mint" : "bg-cobalt"}`}
                style={{ height: `${p.accuracy === null ? 4 : Math.max(6, p.accuracy)}%` }}
                role="img"
                aria-label={p.accuracy === null ? `${shortDate(p.start)} to ${shortDate(p.end)}: no data` : `${shortDate(p.start)} to ${shortDate(p.end)}: ${p.accuracy}% from ${p.attempts} answers`}
              />
              <span className="text-[11px] text-mute">{shortDate(p.start)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- practice: engagement, not proficiency ---------- */}
      <section aria-labelledby="practice-h" className="space-y-4">
        <div>
          <h2 id="practice-h" className="text-xl font-extrabold">Practice</h2>
          <p className="mt-1 max-w-2xl text-sm text-mute">How much you have practised. This says nothing about how well you speak, which is what Skills above shows.</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat icon={<BookCheck size={18} className="text-cobalt" aria-hidden="true" />} label="Lessons completed" value={String(data.lessonsCompleted)} />
          <Stat icon={<Clock size={18} className="text-cobalt" aria-hidden="true" />} label="Time learning" value={formatMinutes(activity.totalMinutes)} />
          <Stat icon={<Layers size={18} className="text-mint" aria-hidden="true" />} label="Words mastered" value={`${data.vocab.mastered}`} sub={`of ${data.vocab.total} saved`} />
          <Stat icon={<Flame size={18} className="text-saffron" aria-hidden="true" />} label="Days in a row" value={String(activity.streak.current)} sub={`longest ${activity.streak.longest}`} />
          <Stat icon={<Zap size={18} className="text-saffron" aria-hidden="true" />} label="XP" value={String(data.xpTotal)} sub="just a counter" />
        </dl>

        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">This week</h3>
            <p className="text-sm text-mute">{formatMinutes(activity.weekMinutes)}</p>
          </div>
          <ul className="mt-5 grid h-32 grid-cols-7 items-end gap-2" aria-label="Minutes practised each day this week">
            {activity.byDay.map((d) => (
              <li key={d.day} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-medium text-mute">{d.minutes || ""}</span>
                <div
                  className={`w-full rounded-t-lg ${d.minutes >= profile.daily_goal_minutes ? "bg-mint" : d.minutes > 0 ? "bg-cobalt" : "bg-sunk"}`}
                  style={{ height: `${Math.max(d.minutes > 0 ? 10 : 4, (d.minutes / maxMinutes) * 100)}%` }}
                  role="img"
                  aria-label={`${weekday(d.day)}: ${d.minutes} minutes`}
                />
                <span className="text-xs text-mute">{weekday(d.day)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- achievements ---------- */}
      <section aria-labelledby="ach-h" className="space-y-3">
        <h2 id="ach-h" className="flex items-center gap-2 text-xl font-extrabold">
          <Award size={20} className="text-saffron" aria-hidden="true" /> Milestones
        </h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-mute">Milestones you earn will be listed here.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {achievements.map(({ a, earned_at }) => (
              <li key={a.code} className="card flex items-start gap-3 p-4">
                <span className="mt-0.5 rounded-xl bg-saffron-soft p-2 text-saffron" aria-hidden="true">
                  <Award size={18} />
                </span>
                <span className="text-sm">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-mute">{a.description}</span>
                  <span className="mt-0.5 block text-xs text-mute">{shortDate(earned_at.slice(0, 10))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold text-mute">
        {icon} {label}
      </dt>
      <dd className="mt-2 font-display text-2xl font-extrabold">{value}</dd>
      {sub && <p className="text-xs text-mute">{sub}</p>}
    </div>
  );
}
