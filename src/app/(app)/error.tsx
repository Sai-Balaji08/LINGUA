"use client";

import { RotateCcw } from "lucide-react";

/** Catches failed data loads in any learner page, with a way to retry. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 p-8 text-center" role="alert">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-mute">We could not load this page. Your progress is safe. {error.digest ? `(Reference ${error.digest})` : ""}</p>
      <button type="button" className="btn-primary" onClick={reset}>
        <RotateCcw size={16} aria-hidden="true" /> Try again
      </button>
    </div>
  );
}
