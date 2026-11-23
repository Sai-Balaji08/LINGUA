import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EntityForm } from "@/components/admin/AdminForms";
import { RowActions } from "@/components/admin/RowActions";
import { StatusPill } from "@/components/admin/StatusPill";
import { requireAdmin } from "@/lib/auth";
import { hrefFor, type Row } from "@/lib/admin/tree";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [{ data: languages }, courses, lessons, exercises] = await Promise.all([
    supabase.from("languages").select("*").order("position").order("created_at"),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("exercises").select("id", { count: "exact", head: true }),
  ]);
  const rows = (languages ?? []) as Row[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Languages</h1>
        <p className="mt-1 text-mute">
          Content is organised as Language → Course → Level → Unit → Lesson → Exercise. Start from a language and work down. New items are drafts until you publish them.
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Courses", courses.count ?? 0],
          ["Published lessons", lessons.count ?? 0],
          ["Exercises", exercises.count ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="card p-4">
            <dt className="text-xs font-semibold text-mute">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">{n as number}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="card p-6 text-sm text-mute">No languages yet. Add the first one below.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={hrefFor("language", r.id)} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{String(r.name)} <span className="font-normal text-mute">· {String(r.native_name)}</span></span>
                  <span className="text-xs text-mute">{String(r.code)} · {String(r.speech_locale)}</span>
                </span>
                <StatusPill published={r.published} />
                <ChevronRight size={16} className="ml-auto text-mute" aria-hidden="true" />
              </Link>
              <RowActions kind="language" id={r.id} published={r.published} canMoveUp={i > 0} canMoveDown={i < rows.length - 1} returnTo="/admin" name={String(r.name)} />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="add-lang" className="card p-5 sm:p-6">
        <h2 id="add-lang" className="mb-4 text-xl font-extrabold">Add a language</h2>
        <EntityForm kind="language" />
      </section>
    </div>
  );
}
