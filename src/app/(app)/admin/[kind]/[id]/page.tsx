import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { EntityForm } from "@/components/admin/AdminForms";
import { RowActions } from "@/components/admin/RowActions";
import { StatusPill } from "@/components/admin/StatusPill";
import { Notice } from "@/components/ui/Feedback";
import { requireAdmin } from "@/lib/auth";
import { KIND_LABEL, KIND_PLURAL, labelOf } from "@/lib/admin/fields";
import { ENTITY_KINDS, idSchema, type EntityKind } from "@/lib/admin/schemas";
import { TYPE_LABELS } from "@/lib/admin/exercise";
import { hrefFor, loadChildren, loadNode } from "@/lib/admin/tree";
import { setPublished } from "@/app/(app)/admin/actions";
import type { ExerciseType } from "@/lib/types";

export const metadata: Metadata = { title: "Admin · content" };

/** One page for every level of the hierarchy: edit the item, then manage what is directly under it. */
export default async function AdminNodePage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const { kind: rawKind, id: rawId } = await params;
  const sp = await searchParams;
  if (!(ENTITY_KINDS as readonly string[]).includes(rawKind) || !idSchema.safeParse(rawId).success) notFound();
  const kind = rawKind as EntityKind;

  const node = await loadNode(supabase, kind, rawId);
  if (!node) notFound();
  const { row, crumbs } = node;
  const children = await loadChildren(supabase, kind, row.id);
  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  const backHref = parentCrumb ? hrefFor(parentCrumb.kind, parentCrumb.id) : "/admin";

  const exercises =
    kind === "lesson"
      ? (((await supabase.from("exercises").select("id, type, skill, prompt, position").eq("lesson_id", row.id).order("position")).data ?? []) as { id: string; type: ExerciseType; skill: string; prompt: string; position: number }[])
      : [];

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-mute">
        <Link href="/admin" className="hover:text-ink">Languages</Link>
        {crumbs.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight size={14} aria-hidden="true" />
            {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-ink">{c.label}</span> : <Link href={hrefFor(c.kind, c.id)} className="hover:text-ink">{c.label}</Link>}
          </span>
        ))}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-mute">{KIND_LABEL[kind]}</p>
          <h1 className="text-3xl font-extrabold">{labelOf(kind, row)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill published={row.published} />
          <form action={setPublished}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="publish" value={row.published ? "false" : "true"} />
            <button type="submit" className="btn-ghost !py-1.5">{row.published ? "Unpublish" : "Publish"}</button>
          </form>
        </div>
      </header>

      {!row.published && (
        <Notice tone="info">
          This {KIND_LABEL[kind].toLowerCase()} is a draft. Learners only see content when it and everything above it (language, course, level, unit) are published.
        </Notice>
      )}
      {sp.saved && <Notice tone="success">Exercise saved.</Notice>}

      <section aria-labelledby="edit-h" className="card p-5 sm:p-6">
        <h2 id="edit-h" className="mb-4 text-xl font-extrabold">Details</h2>
        <EntityForm kind={kind} id={row.id} values={row} />
      </section>

      {children && (
        <section aria-labelledby="children-h" className="space-y-4">
          <h2 id="children-h" className="text-xl font-extrabold">{KIND_PLURAL[children.kind]}</h2>
          {children.rows.length === 0 ? (
            <p className="card p-5 text-sm text-mute">No {KIND_PLURAL[children.kind].toLowerCase()} yet. Add the first one below.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {children.rows.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={hrefFor(children.kind, c.id)} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="truncate font-semibold">{labelOf(children.kind, c)}</span>
                    <StatusPill published={c.published} />
                    <ChevronRight size={16} className="ml-auto shrink-0 text-mute" aria-hidden="true" />
                  </Link>
                  <RowActions kind={children.kind} id={c.id} published={c.published} canMoveUp={i > 0} canMoveDown={i < children.rows.length - 1} returnTo={hrefFor(kind, row.id)} name={labelOf(children.kind, c)} />
                </li>
              ))}
            </ul>
          )}
          <div className="card p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><Plus size={16} aria-hidden="true" /> Add {KIND_LABEL[children.kind].toLowerCase()}</h3>
            <EntityForm kind={children.kind} parentId={row.id} />
          </div>
        </section>
      )}

      {kind === "lesson" && (
        <section aria-labelledby="ex-h" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ex-h" className="text-xl font-extrabold">Exercises</h2>
            <Link href={`/admin/lesson/${row.id}/exercise/new`} className="btn-primary">
              <Plus size={16} aria-hidden="true" /> Add exercise
            </Link>
          </div>
          {exercises.length === 0 ? (
            <p className="card p-5 text-sm text-mute">No exercises yet. A lesson needs at least one before it can be published.</p>
          ) : (
            <ol className="card divide-y divide-line">
              {exercises.map((ex, i) => (
                <li key={ex.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-sm font-semibold text-mute">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{ex.prompt}</span>
                    <span className="text-xs text-mute">{TYPE_LABELS[ex.type]} · {ex.skill}</span>
                  </span>
                  <Link href={`/admin/lesson/${row.id}/exercise/${ex.id}`} className="btn-quiet !px-2 !py-1.5" aria-label={`Edit exercise ${i + 1}`}>
                    <Pencil size={15} aria-hidden="true" />
                  </Link>
                  <RowActions kind="exercise" id={ex.id} canMoveUp={i > 0} canMoveDown={i < exercises.length - 1} returnTo={hrefFor("lesson", row.id)} name={`exercise ${i + 1}`} />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <Link href={backHref} className="btn-ghost">← Back</Link>
    </div>
  );
}
