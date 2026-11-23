import type { SupabaseClient } from "@supabase/supabase-js";
import { CHILD_OF, ENTITY_CONFIG, type EntityKind } from "@/lib/admin/schemas";
import { labelOf } from "@/lib/admin/fields";

/** Admin read helpers: load one item plus its breadcrumb trail (language > course > level > unit > lesson). */

export type Row = Record<string, unknown> & { id: string; published: boolean; position: number };
export interface Crumb {
  kind: EntityKind;
  id: string;
  label: string;
}

export async function loadNode(supabase: SupabaseClient, kind: EntityKind, id: string): Promise<{ row: Row; crumbs: Crumb[] } | null> {
  const crumbs: Crumb[] = [];
  let currentKind: EntityKind | null = kind;
  let currentId: string | null = id;
  let first: Row | null = null;

  while (currentKind && currentId) {
    const cfg: (typeof ENTITY_CONFIG)[EntityKind] = ENTITY_CONFIG[currentKind];
    const { data }: { data: Record<string, unknown> | null } = await supabase.from(cfg.table).select("*").eq("id", currentId).maybeSingle();
    if (!data) return first ? { row: first, crumbs } : null;
    const row = data as Row;
    if (!first) first = row;
    crumbs.unshift({ kind: currentKind, id: currentId, label: labelOf(currentKind, row) });
    const parentColumn: string | null = cfg.parent;
    currentId = parentColumn ? (row[parentColumn] as string) : null;
    currentKind = parentColumn ? (PARENT_KIND[currentKind] ?? null) : null;
  }
  return first ? { row: first, crumbs } : null;
}

const PARENT_KIND: Partial<Record<EntityKind, EntityKind>> = { course: "language", level: "course", unit: "level", lesson: "unit" };

export async function loadChildren(supabase: SupabaseClient, kind: EntityKind, parentId: string): Promise<{ kind: EntityKind; rows: Row[] } | null> {
  const childKind = CHILD_OF[kind];
  if (!childKind) return null;
  const cfg = ENTITY_CONFIG[childKind];
  const { data, error } = await supabase.from(cfg.table).select("*").eq(cfg.parent as string, parentId).order("position").order("created_at");
  if (error) throw new Error(error.message);
  return { kind: childKind, rows: (data ?? []) as Row[] };
}

export function hrefFor(kind: EntityKind, id: string) {
  return `/admin/${kind}/${id}`;
}
