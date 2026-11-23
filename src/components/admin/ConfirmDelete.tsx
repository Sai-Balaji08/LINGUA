"use client";

import { Trash2 } from "lucide-react";

/** Delete submit button that asks "are you sure?" first, because deleting content also deletes everything under it. */
export function ConfirmDelete({ name }: { name: string }) {
  return (
    <button
      type="submit"
      className="btn-quiet !px-2 !py-1.5 hover:!text-coral"
      aria-label={`Delete ${name}`}
      onClick={(e) => {
        if (!window.confirm(`Delete “${name}”? This also deletes everything inside it and any learner progress on it. This cannot be undone.`)) e.preventDefault();
      }}
    >
      <Trash2 size={15} aria-hidden="true" />
    </button>
  );
}
