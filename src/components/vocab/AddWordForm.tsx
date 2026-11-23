"use client";

import { useActionState, useRef } from "react";
import { Plus } from "lucide-react";
import { initialState } from "@/lib/action-state";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { addCustomWord } from "@/app/(app)/vocabulary/actions";

export function AddWordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: typeof initialState, fd: FormData) => {
    const res = await addCustomWord(prev, fd);
    if (res.ok) ref.current?.reset();
    return res;
  }, initialState);

  return (
    <details className="card group p-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
        <Plus size={18} className="text-cobalt transition group-open:rotate-45" aria-hidden="true" /> Add your own word
      </summary>
      <form ref={ref} action={action} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
        <Field label="Word or phrase" name="term" required maxLength={100} error={state.fieldErrors?.term} />
        <Field label="Meaning" name="translation" required maxLength={150} error={state.fieldErrors?.translation} />
        <Field label="Pronunciation (optional)" name="transliteration" maxLength={100} error={state.fieldErrors?.transliteration} />
        <Field label="Part of speech (optional)" name="part_of_speech" maxLength={30} placeholder="noun, verb…" error={state.fieldErrors?.part_of_speech} />
        <div className="sm:col-span-2"><Field label="Example sentence (optional)" name="example_sentence" maxLength={300} error={state.fieldErrors?.example_sentence} /></div>
        <div className="sm:col-span-2"><Field label="Example translation (optional)" name="example_translation" maxLength={300} error={state.fieldErrors?.example_translation} /></div>
        <div className="space-y-3 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="Adding…">Add to my deck</SubmitButton>
        </div>
      </form>
    </details>
  );
}
