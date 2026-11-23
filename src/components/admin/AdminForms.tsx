"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { initialState } from "@/lib/action-state";
import { Field, FormMessage, Select, SubmitButton, TextArea } from "@/components/ui/Form";
import { ENTITY_FIELDS, KIND_LABEL } from "@/lib/admin/fields";
import type { EntityKind } from "@/lib/admin/schemas";
import { CHOICE_TYPES, DEFAULT_SKILL, EXERCISE_TYPES, MAX_OPTIONS, MAX_PAIRS, MIN_PAIRS, SKILLS, TYPE_LABELS, emptyFormValues, type ExerciseFormValues } from "@/lib/admin/exercise";
import type { ExerciseType, Skill } from "@/lib/types";
import { saveEntity, saveExercise } from "@/app/(app)/admin/actions";

/** Create/edit form for a language, course, level, unit or lesson. */
export function EntityForm({
  kind,
  id,
  parentId,
  values,
}: {
  kind: EntityKind;
  id?: string;
  parentId?: string;
  values?: Record<string, unknown>;
}) {
  const [state, action] = useActionState(saveEntity, initialState);
  const editing = Boolean(id);
  return (
    <form action={action} className="space-y-4" noValidate key={id ?? "new"}>
      <input type="hidden" name="kind" value={kind} />
      {id && <input type="hidden" name="id" value={id} />}
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {ENTITY_FIELDS[kind].map((f) =>
          f.type === "textarea" ? (
            <div key={f.name} className="sm:col-span-2">
              <TextArea label={f.label} name={`${f.name}`} hint={f.hint} defaultValue={String(values?.[f.name] ?? "")} error={state.fieldErrors?.[f.name]} />
            </div>
          ) : (
            <Field
              key={f.name}
              label={f.label}
              name={f.name}
              type={f.type === "number" ? "number" : "text"}
              hint={f.hint}
              placeholder={f.placeholder}
              defaultValue={String(values?.[f.name] ?? (f.name === "estimated_minutes" ? 5 : ""))}
              error={state.fieldErrors?.[f.name]}
            />
          ),
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">{editing ? "Save changes" : `Create ${KIND_LABEL[kind].toLowerCase()}`}</SubmitButton>
    </form>
  );
}

const fe = (state: { fieldErrors?: Record<string, string> }, k: string) => state.fieldErrors?.[k];

/** Exercise editor. The inputs shown depend on the exercise type, mirroring buildExercisePayload on the server. */
export function ExerciseEditor({ lessonId, exerciseId, initial }: { lessonId: string; exerciseId?: string; initial?: ExerciseFormValues }) {
  const [state, action] = useActionState(saveExercise, initialState);
  const start = initial ?? emptyFormValues();
  const [type, setType] = useState<ExerciseType>(start.type);
  const [skill, setSkill] = useState<Skill>(start.skill);
  const [options, setOptions] = useState<string[]>(start.options);
  const [correct, setCorrect] = useState<number>(start.correct);
  const [pairs, setPairs] = useState(start.pairs);

  const isChoice = CHOICE_TYPES.includes(type);

  return (
    <form action={action} className="space-y-6" noValidate encType="multipart/form-data">
      <input type="hidden" name="lesson_id" value={lessonId} />
      {exerciseId && <input type="hidden" name="exercise_id" value={exerciseId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Exercise type"
          name="type"
          value={type}
          error={fe(state, "type")}
          onChange={(e) => {
            const t = e.target.value as ExerciseType;
            setType(t);
            setSkill(DEFAULT_SKILL[t]);
          }}
        >
          {EXERCISE_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </Select>
        <Select label="Skill this assesses" name="skill" value={skill} onChange={(e) => setSkill(e.target.value as Skill)} error={fe(state, "skill")} hint={type === "speaking" ? "Speaking is self-rated, so it is recorded but never scored." : undefined}>
          {SKILLS.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
      </div>

      <TextArea label="Prompt" name="prompt" defaultValue={start.prompt} error={fe(state, "prompt")} hint="The question or sentence the learner sees." className="min-h-20" />
      <Field label="Instructions" name="instructions" defaultValue={start.instructions} error={fe(state, "instructions")} hint="Optional short instruction, for example “Choose the correct word”." />

      {type === "listening" && (
        <TextArea label="Text to be spoken aloud" name="speak" defaultValue={start.speak} error={fe(state, "speak")} hint="Read by the browser's voice. Or add an audio file or link below." className="min-h-16" />
      )}
      {type === "reading" && <TextArea label="Reading passage" name="passage" defaultValue={start.passage} error={fe(state, "passage")} className="min-h-32" />}

      {isChoice && (
        <fieldset className="space-y-2">
          <legend className="label">Answer options</legend>
          <p className="text-xs text-mute">Select the radio button next to the single correct answer. Leave unused options empty.</p>
          {options.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Option ${i + 1} is correct`} className="h-4 w-4 accent-[rgb(var(--cobalt))]" />
              <input
                name="option_text"
                className="field"
                value={text}
                aria-label={`Option ${i + 1}`}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" className="btn-quiet !px-3 !py-1.5" onClick={() => setOptions((o) => [...o, ""])}>
              <Plus size={14} aria-hidden="true" /> Add option
            </button>
          )}
          {fe(state, "options") && <p className="text-xs font-medium text-coral">{fe(state, "options")}</p>}
        </fieldset>
      )}

      {(type === "translation" || type === "fill_blank") && (
        <TextArea
          label="Accepted answers"
          name="accepted"
          defaultValue={start.accepted}
          error={fe(state, "accepted")}
          hint={type === "fill_blank" ? "One per line. Use ___ in the prompt for the blank. Capital letters and punctuation are ignored when checking." : "One per line. Add every correct way to say it. Capital letters and punctuation are ignored when checking."}
          className="min-h-20"
        />
      )}

      {type === "word_arrangement" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correct sentence" name="answer" defaultValue={start.answer} error={fe(state, "answer")} hint="The words in the right order." />
          <Field label="Extra words (optional)" name="distractors" defaultValue={start.distractors} error={fe(state, "distractors")} hint="Wrong words to make it harder, separated by commas." />
        </div>
      )}

      {type === "matching" && (
        <fieldset className="space-y-2">
          <legend className="label">Pairs to match</legend>
          {pairs.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input name="pair_left" className="field" aria-label={`Pair ${i + 1} word`} placeholder="Word" value={p.left} onChange={(e) => setPairs((ps) => ps.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))} />
              <div className="flex gap-2">
                <input name="pair_right" className="field" aria-label={`Pair ${i + 1} meaning`} placeholder="Meaning" value={p.right} onChange={(e) => setPairs((ps) => ps.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))} />
                {pairs.length > MIN_PAIRS && (
                  <button type="button" className="btn-quiet !px-2" aria-label={`Remove pair ${i + 1}`} onClick={() => setPairs((ps) => ps.filter((_, j) => j !== i))}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {pairs.length < MAX_PAIRS && (
            <button type="button" className="btn-quiet !px-3 !py-1.5" onClick={() => setPairs((ps) => [...ps, { left: "", right: "" }])}>
              <Plus size={14} aria-hidden="true" /> Add pair
            </button>
          )}
          {fe(state, "pairs") && <p className="text-xs font-medium text-coral">{fe(state, "pairs")}</p>}
        </fieldset>
      )}

      {type === "writing" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum words" name="min_words" type="number" defaultValue={start.min_words} error={fe(state, "min_words")} />
          <Field label="Keywords to look for" name="keywords" defaultValue={start.keywords} error={fe(state, "keywords")} hint="Optional, separated by commas." />
          <div className="sm:col-span-2">
            <TextArea label="Sample answer" name="sample" defaultValue={start.sample} error={fe(state, "sample")} hint="Shown after the learner submits. Optional." />
          </div>
        </div>
      )}

      {type === "speaking" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phrase to say" name="target" defaultValue={start.target} error={fe(state, "target")} />
          <Field label="Hint" name="hint" defaultValue={start.hint} error={fe(state, "hint")} hint="Optional, for example pronunciation help." />
        </div>
      )}

      <TextArea label="Explanation" name="explanation" defaultValue={start.explanation} error={fe(state, "explanation")} hint="Shown after the learner answers, whether right or wrong. Explain why." />

      <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Audio (optional)</legend>
        <Field label="Audio link" name="audio_url" defaultValue={start.audio_url} error={fe(state, "audio_url")} hint="An https:// link to an audio file." />
        <div>
          <label htmlFor="f-audio_file" className="label">Or upload a file</label>
          <input id="f-audio_file" name="audio_file" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" className="field file:mr-3 file:rounded-lg file:border-0 file:bg-cobalt-soft file:px-3 file:py-1 file:text-sm file:font-semibold file:text-cobalt" />
          <p className="mt-1 text-xs text-mute">MP3, M4A, WAV, OGG or WebM, up to 5 MB. An upload replaces the link.</p>
          {fe(state, "audio_file") && <p className="mt-1 text-xs font-medium text-coral">{fe(state, "audio_file")}</p>}
        </div>
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">{exerciseId ? "Save exercise" : "Add exercise"}</SubmitButton>
    </form>
  );
}
