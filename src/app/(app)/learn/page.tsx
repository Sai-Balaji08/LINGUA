import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Flag, PlayCircle } from "lucide-react";
import { EmptyState, Notice, ProgressBar } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import { countCompleted, flattenLessons, getCourseOutline, getProgressMap, getUserLanguage, pickNextLesson } from "@/lib/data/courses";
import { percent } from "@/lib/stats";
import type { Language } from "@/lib/types";

export const metadata: Metadata = { title: "Course map" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { supabase, user, profile } = await requireOnboarded();
  const sp = await searchParams;

  const { data: mine } = await supabase.from("user_languages").select("language_id").eq("user_id", user.id);
  const myIds = new Set([...(mine ?? []).map((r) => r.language_id as string), ...(profile.target_language_id ? [profile.target_language_id] : [])]);
  const { data: langRows } = myIds.size ? await supabase.from("languages").select("*").in("id", [...myIds]).eq("published", true).order("position") : { data: [] };
  const languages = (langRows ?? []) as Language[];

  const activeId = languages.find((l) => l.id === sp.lang)?.id ?? languages.find((l) => l.id === profile.target_language_id)?.id ?? languages[0]?.id;
  if (!activeId) {
    return <EmptyState title="Choose a language" body="Pick a language to learn in Settings and your course map will appear here." action={<Link href="/settings" className="btn-primary">Open settings</Link>} />;
  }

  const [outline, progress, userLang] = await Promise.all([getCourseOutline(supabase, activeId), getProgressMap(supabase, user.id), getUserLanguage(supabase, user.id, activeId)]);
  const language = languages.find((l) => l.id === activeId) as Language;
  const flat = flattenLessons(outline);

  if (!outline || flat.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">{language.name}</h1>
        <EmptyState icon={<BookOpen size={32} aria-hidden="true" />} title="No lessons published yet" body="This language does not have published lessons. Check back soon, or choose another language." />
      </div>
    );
  }

  const next = pickNextLesson(flat, progress, userLang?.start_lesson_id);
  const done = countCompleted(flat, progress);
  const startMarker = userLang?.start_lesson_id && done === 0 ? flat.find((f) => f.lesson.id === userLang.start_lesson_id) : null;

  return (
    <div className="space-y-8">
      {languages.length > 1 && (
        <nav aria-label="Languages" className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <Link key={l.id} href={`/learn?lang=${l.id}`} aria-current={l.id === activeId ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${l.id === activeId ? "bg-cobalt text-white" : "bg-sunk text-mute hover:text-ink"}`}>
              {l.name}
            </Link>
          ))}
        </nav>
      )}

      <header className="card p-6">
        <p className="text-sm font-medium text-mute">{language.native_name}</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{outline.course.title}</h1>
        {outline.course.description && <p className="mt-2 max-w-xl text-mute">{outline.course.description}</p>}
        <div className="mt-5 max-w-md">
          <div className="mb-1.5 flex justify-between text-sm font-medium"><span>Progress</span><span>{done}/{flat.length} lessons</span></div>
          <ProgressBar value={percent(done, flat.length)} label="Course progress" tone="mint" />
        </div>
        {next && (
          <Link href={`/learn/${next.lesson.id}`} className="btn-primary mt-5 !px-6 !py-3">
            {done === 0 ? "Start" : done === flat.length ? "Review" : "Continue"}: {next.lesson.title} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </header>

      {startMarker && (
        <Notice tone="info" title="Starting point set">
          Based on your placement check, we suggest starting at “{startMarker.lesson.title}”. Every lesson is open, so you can go back any time.
        </Notice>
      )}

      {outline.levels.map(({ level, units }) => (
        <section key={level.id} aria-labelledby={`lv-${level.id}`}>
          <h2 id={`lv-${level.id}`} className="mb-4 flex items-center gap-3 text-xl font-extrabold">
            <span className="rounded-lg bg-cobalt px-2.5 py-1 font-display text-sm text-white">{level.code}</span> {level.title}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {units.map(({ unit, lessons }) => (
              <article key={unit.id} className="card p-5">
                <h3 className="text-lg font-bold">{unit.title}</h3>
                {unit.description && <p className="mb-3 text-sm text-mute">{unit.description}</p>}
                <ul className="mt-3 space-y-2">
                  {lessons.map((lesson) => {
                    const p = progress.get(lesson.id);
                    const isNext = next?.lesson.id === lesson.id && done < flat.length;
                    const completed = p?.status === "completed";
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/learn/${lesson.id}`}
                          className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition hover:bg-sunk ${isNext ? "border-cobalt bg-cobalt-soft" : "border-transparent bg-sunk/60"}`}
                        >
                          {completed ? <CheckCircle2 size={22} className="shrink-0 text-mint" aria-label="Completed" /> : isNext ? <PlayCircle size={22} className="shrink-0 text-cobalt" aria-label="Up next" /> : <Circle size={22} className="shrink-0 text-mute" aria-label="Not started" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{lesson.title}</span>
                            <span className="text-xs text-mute">
                              {lesson.estimated_minutes} min
                              {p ? ` · best ${Math.round(Number(p.best_score))}% · ${p.attempts} ${p.attempts === 1 ? "try" : "tries"}` : ""}
                            </span>
                          </span>
                          {userLang?.start_lesson_id === lesson.id && done === 0 && <Flag size={16} className="shrink-0 text-saffron" aria-label="Suggested start" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
