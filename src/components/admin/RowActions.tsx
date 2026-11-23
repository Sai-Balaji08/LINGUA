import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { deleteEntity, moveEntity, setPublished } from "@/app/(app)/admin/actions";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import type { OrderedKind } from "@/lib/admin/schemas";

/**
 * Publish / reorder / delete buttons for one row. Plain server-rendered forms that post to Server Actions,
 * so they work without client JavaScript. Delete asks for confirmation on the next page via the browser's own dialog.
 */
export function RowActions({
  kind,
  id,
  published,
  canMoveUp,
  canMoveDown,
  returnTo,
  name,
}: {
  kind: OrderedKind;
  id: string;
  published?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  returnTo: string;
  name: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <form action={moveEntity}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="up" />
        <button type="submit" className="btn-quiet !px-2 !py-1.5" disabled={!canMoveUp} aria-label={`Move ${name} up`}>
          <ArrowUp size={15} aria-hidden="true" />
        </button>
      </form>
      <form action={moveEntity}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="down" />
        <button type="submit" className="btn-quiet !px-2 !py-1.5" disabled={!canMoveDown} aria-label={`Move ${name} down`}>
          <ArrowDown size={15} aria-hidden="true" />
        </button>
      </form>
      {published !== undefined && (
        <form action={setPublished}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="publish" value={published ? "false" : "true"} />
          <button type="submit" className="btn-quiet !px-2 !py-1.5" aria-label={published ? `Unpublish ${name}` : `Publish ${name}`}>
            {published ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          </button>
        </form>
      )}
      <form action={deleteEntity}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <ConfirmDelete name={name} />
      </form>
    </div>
  );
}
