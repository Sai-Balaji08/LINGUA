"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { fail, succeed, type ActionState } from "@/lib/action-state";
import { AUDIO_MAX_BYTES, AUDIO_TYPES, ENTITY_CONFIG, ENTITY_KINDS, ORDERED_KINDS, idSchema, parseEntity, type OrderedKind } from "@/lib/admin/schemas";
import { buildExercisePayload } from "@/lib/admin/exercise";

/**
 * Admin Server Actions. Every action:
 *  1. re-reads the caller's role from the database (getAdminOrNull) - never from the browser,
 *  2. validates all input again with zod,
 *  3. then talks to Supabase as the signed-in user, so Row Level Security (public.is_admin()) is a second, independent wall.
 * A regular learner who posts to these actions gets "no permission" and, even if the check above had a bug, RLS would reject the write.
 */

const NO_PERMISSION = "You do not have permission to do that.";
const kindSchema = z.enum(ENTITY_KINDS);
const orderedSchema = z.enum(ORDERED_KINDS);

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

async function nextPosition(admin: NonNullable<Awaited<ReturnType<typeof getAdminOrNull>>>, kind: OrderedKind, parentId: string | null): Promise<number> {
  const cfg = ENTITY_CONFIG[kind];
  let q = admin.supabase.from(cfg.table).select("position").order("position", { ascending: false }).limit(1);
  if (cfg.parent && parentId) q = q.eq(cfg.parent, parentId);
  const { data } = await q;
  return ((data?.[0]?.position as number | undefined) ?? -1) + 1;
}

function friendlyDbError(message: string, code?: string): string {
  if (code === "23505") return "That already exists. Use a different code or title.";
  if (code === "23503") return "The parent item no longer exists. Go back and try again.";
  if (code === "42501") return NO_PERMISSION;
  return `Could not save: ${message}`;
}

/** Create (no id) or update (with id) a language, course, level, unit or lesson. */
export async function saveEntity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return fail(NO_PERMISSION);

  const kind = kindSchema.safeParse(str(formData, "kind"));
  if (!kind.success) return fail("Unknown item type.");
  const idRaw = str(formData, "id");
  const id = idRaw ? idSchema.safeParse(idRaw) : null;
  if (id && !id.success) return fail("Invalid id.");

  const parsed = parseEntity(kind.data, formData);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);

  const cfg = ENTITY_CONFIG[kind.data];
  if (id?.success) {
    const { error } = await admin.supabase.from(cfg.table).update(parsed.data).eq("id", id.data);
    if (error) return fail(friendlyDbError(error.message, error.code));
    revalidatePath("/admin", "layout");
    return succeed("Saved.");
  }

  let parentId: string | null = null;
  if (cfg.parent) {
    const p = idSchema.safeParse(str(formData, "parent_id"));
    if (!p.success) return fail("Missing parent item.");
    parentId = p.data;
  }
  const position = await nextPosition(admin, kind.data, parentId);
  const row = { ...parsed.data, position, ...(cfg.parent && parentId ? { [cfg.parent]: parentId } : {}) };
  const { error } = await admin.supabase.from(cfg.table).insert(row); // new content starts unpublished (column default)
  if (error) return fail(friendlyDbError(error.message, error.code));
  revalidatePath("/admin", "layout");
  return succeed(`${ENTITY_CONFIG[kind.data].label[0].toUpperCase()}${ENTITY_CONFIG[kind.data].label.slice(1)} created as a draft. Publish it when it is ready.`);
}

/** Publish or unpublish. Learners only ever see content whose whole chain (language to lesson) is published. */
export async function setPublished(formData: FormData): Promise<void> {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error(NO_PERMISSION);
  const kind = kindSchema.parse(str(formData, "kind"));
  const id = idSchema.parse(str(formData, "id"));
  const publish = str(formData, "publish") === "true";
  const cfg = ENTITY_CONFIG[kind];

  if (publish && kind === "lesson") {
    const { count } = await admin.supabase.from("exercises").select("id", { count: "exact", head: true }).eq("lesson_id", id);
    if (!count) throw new Error("Add at least one exercise before publishing this lesson.");
  }
  const { error } = await admin.supabase.from(cfg.table).update({ published: publish }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error.message, error.code));
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
}

/** Deletes an item and everything under it (the database cascades). Learner progress on deleted lessons is removed too. */
export async function deleteEntity(formData: FormData): Promise<void> {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error(NO_PERMISSION);
  const kind = orderedSchema.parse(str(formData, "kind"));
  const id = idSchema.parse(str(formData, "id"));
  const returnTo = str(formData, "return_to");
  const { error } = await admin.supabase.from(ENTITY_CONFIG[kind].table).delete().eq("id", id);
  if (error) throw new Error(friendlyDbError(error.message, error.code));
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
  redirect(returnTo.startsWith("/admin") && !returnTo.startsWith("//") ? returnTo : "/admin");
}

/** Swap an item's position with its neighbour. */
export async function moveEntity(formData: FormData): Promise<void> {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error(NO_PERMISSION);
  const kind = orderedSchema.parse(str(formData, "kind"));
  const id = idSchema.parse(str(formData, "id"));
  const dir = z.enum(["up", "down"]).parse(str(formData, "dir"));
  const cfg = ENTITY_CONFIG[kind];

  const { data: me } = await admin.supabase.from(cfg.table).select("*").eq("id", id).maybeSingle();
  if (!me) return;
  let q = admin.supabase.from(cfg.table).select("id, position");
  if (cfg.parent) q = q.eq(cfg.parent, (me as Record<string, unknown>)[cfg.parent] as string);
  const { data: siblings } = await q.order("position").order("created_at");
  const list = (siblings ?? []) as { id: string; position: number }[];
  const i = list.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Re-number the whole list (0..n-1) so equal positions can never make a move do nothing.
  const reordered = [...list];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  for (let p = 0; p < reordered.length; p++) {
    if (reordered[p].position === p) continue;
    const { error } = await admin.supabase.from(cfg.table).update({ position: p }).eq("id", reordered[p].id);
    if (error) throw new Error(friendlyDbError(error.message, error.code));
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
}

/** Create or update an exercise with its options, answers, explanation and optional audio. */
export async function saveExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return fail(NO_PERMISSION);

  const lessonId = idSchema.safeParse(str(formData, "lesson_id"));
  if (!lessonId.success) return fail("Missing lesson.");
  const exerciseIdRaw = str(formData, "exercise_id");
  const exerciseId = exerciseIdRaw ? idSchema.safeParse(exerciseIdRaw) : null;
  if (exerciseId && !exerciseId.success) return fail("Invalid exercise.");

  const built = buildExercisePayload(formData);
  if (!built.ok) return fail("Please fix the highlighted fields.", built.fieldErrors);
  const { exercise, options } = built;

  // Optional audio upload. Type and size are checked here; the storage policy independently allows admins only.
  const file = formData.get("audio_file");
  if (file instanceof File && file.size > 0) {
    const ext = AUDIO_TYPES[file.type];
    if (!ext) return fail("Please fix the highlighted fields.", { audio_file: "Use an MP3, M4A, WAV, OGG or WebM file." });
    if (file.size > AUDIO_MAX_BYTES) return fail("Please fix the highlighted fields.", { audio_file: "The file must be 5 MB or smaller." });
    const path = `${lessonId.data}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.supabase.storage.from("lesson-audio").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return fail("The audio file could not be uploaded. Please try again.");
    exercise.audio_url = admin.supabase.storage.from("lesson-audio").getPublicUrl(path).data.publicUrl;
  }

  let savedId: string;
  if (exerciseId?.success) {
    const { error } = await admin.supabase.from("exercises").update(exercise).eq("id", exerciseId.data);
    if (error) return fail(friendlyDbError(error.message, error.code));
    savedId = exerciseId.data;
    const { error: delError } = await admin.supabase.from("exercise_options").delete().eq("exercise_id", savedId);
    if (delError) return fail(friendlyDbError(delError.message, delError.code));
  } else {
    const position = await nextPosition(admin, "exercise", lessonId.data);
    const { data, error } = await admin.supabase.from("exercises").insert({ ...exercise, lesson_id: lessonId.data, position }).select("id").single();
    if (error || !data) return fail(friendlyDbError(error?.message ?? "no row returned", error?.code));
    savedId = data.id as string;
  }

  if (options.length > 0) {
    const { error } = await admin.supabase.from("exercise_options").insert(options.map((o) => ({ ...o, exercise_id: savedId })));
    if (error) {
      // Do not leave an exercise that cannot be answered: remove a brand-new one; for an edit, tell the admin to save again.
      if (!exerciseId) await admin.supabase.from("exercises").delete().eq("id", savedId);
      return fail(`The answer options could not be saved (${friendlyDbError(error.message, error.code)}). Please save again.`);
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
  redirect(`/admin/lesson/${lessonId.data}?saved=1`);
}
