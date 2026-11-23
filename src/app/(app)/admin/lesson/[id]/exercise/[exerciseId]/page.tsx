import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ExerciseEditor } from "@/components/admin/AdminForms";
import { requireAdmin } from "@/lib/auth";
import { exerciseToFormValues } from "@/lib/admin/exercise";
import { idSchema } from "@/lib/admin/schemas";
import { hrefFor, loadNode } from "@/lib/admin/tree";
import type { Exercise } from "@/lib/types";

export const metadata: Metadata = { title: "Admin · exercise" };

export default async function ExerciseEditorPage({ params }: { params: Promise<{ id: string; exerciseId: string }> }) {
  const { supabase } = await requireAdmin();
  const { id, exerciseId } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const isNew = exerciseId === "new";
  if (!isNew && !idSchema.safeParse(exerciseId).success) notFound();

  const node = await loadNode(supabase, "lesson", id);
  if (!node) notFound();

  let initial;
  if (!isNew) {
    const { data } = await supabase.from("exercises").select("*, exercise_options(*)").eq("id", exerciseId).eq("lesson_id", id).maybeSingle();
    if (!data) notFound();
    const ex = data as Exercise;
    initial = exerciseToFormValues(ex, ex.exercise_options ?? []);
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-mute">
        <Link href="/admin" className="hover:text-ink">Languages</Link>
        {node.crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight size={14} aria-hidden="true" />
            <Link href={hrefFor(c.kind, c.id)} className="hover:text-ink">{c.label}</Link>
          </span>
        ))}
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page" className="font-semibold text-ink">{isNew ? "New exercise" : "Edit exercise"}</span>
      </nav>
      <h1 className="text-3xl font-extrabold">{isNew ? "Add an exercise" : "Edit exercise"}</h1>
      <div className="card p-5 sm:p-6">
        <ExerciseEditor lessonId={id} exerciseId={isNew ? undefined : exerciseId} initial={initial} key={exerciseId} />
      </div>
    </div>
  );
}
