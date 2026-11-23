"use client";

import { useActionState } from "react";
import { initialState } from "@/lib/action-state";
import { Checkbox, Field, FormMessage, Select, SubmitButton } from "@/components/ui/Form";
import { DAILY_GOALS, LEARNING_STYLES, NATIVE_LANGUAGES, OBJECTIVES, PROFICIENCIES } from "@/lib/constants";
import type { Language, Profile } from "@/lib/types";
import { changePassword, deleteAccount, deleteConversations, saveNotifications, savePreferences, savePrivacy, saveProfile } from "@/app/(app)/settings/actions";

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, action] = useActionState(saveProfile, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Your name" name="display_name" defaultValue={profile.display_name} autoComplete="name" required error={state.fieldErrors?.display_name} />
      <Field label="Email" name="email_display" value={email} readOnly disabled hint="Your email is used to log in. It cannot be changed here." />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
    </form>
  );
}

export function PreferencesForm({ profile, languages }: { profile: Profile; languages: Language[] }) {
  const [state, action] = useActionState(savePreferences, initialState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Language you are learning" name="target_language_id" defaultValue={profile.target_language_id ?? ""} error={e.target_language_id} hint="Your progress in other languages is kept.">
          <option value="" disabled>Choose…</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>{l.name} ({l.native_name})</option>
          ))}
        </Select>
        <Select label="Your native language" name="native_language" defaultValue={profile.native_language ?? ""} error={e.native_language}>
          <option value="" disabled>Choose…</option>
          {NATIVE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </Select>
        <Select label="Current level" name="proficiency" defaultValue={profile.proficiency ?? ""} error={e.proficiency}>
          <option value="" disabled>Choose…</option>
          {PROFICIENCIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}. {p.hint}</option>
          ))}
        </Select>
        <Select label="Learning goal" name="objective" defaultValue={profile.objective ?? ""} error={e.objective}>
          <option value="" disabled>Choose…</option>
          {OBJECTIVES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}. {o.hint}</option>
          ))}
        </Select>
        <Select label="Daily target" name="daily_goal_minutes" defaultValue={String(profile.daily_goal_minutes)} error={e.daily_goal_minutes}>
          {DAILY_GOALS.map((g) => (
            <option key={g.value} value={g.value}>{g.label} a day ({g.hint})</option>
          ))}
        </Select>
        <Select label="Preferred learning style" name="learning_style" defaultValue={profile.learning_style ?? ""} error={e.learning_style}>
          <option value="" disabled>Choose…</option>
          {LEARNING_STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}. {s.hint}</option>
          ))}
        </Select>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}

export function NotificationsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(saveNotifications, initialState);
  return (
    <form action={action} className="space-y-3">
      <Checkbox name="notify_daily_reminder" label="Daily practice reminder" hint="A gentle nudge if you have not practised yet today." defaultChecked={profile.notify_daily_reminder} />
      <Checkbox name="notify_weekly_summary" label="Weekly summary" hint="One short email about your week. Never more than that." defaultChecked={profile.notify_weekly_summary} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save notifications</SubmitButton>
    </form>
  );
}

export function PrivacyForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(savePrivacy, initialState);
  const [delState, delAction] = useActionState(deleteConversations, initialState);
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-3">
        <Checkbox
          name="allow_ai_feedback"
          label="Allow AI feedback"
          hint="When on, text you write in conversations and writing exercises is sent to our AI provider to give you feedback. Turn it off and everything else keeps working. We never sell your learning data."
          defaultChecked={profile.allow_ai_feedback}
        />
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Saving…">Save privacy settings</SubmitButton>
      </form>
      <form action={delAction} className="space-y-3 border-t border-line pt-5">
        <p className="text-sm text-mute">Saved conversations contain what you typed. You can delete them at any time. Lesson progress is not affected.</p>
        <FormMessage state={delState} />
        <SubmitButton className="btn-ghost" pendingLabel="Deleting…">Delete my saved conversations</SubmitButton>
      </form>
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={state.fieldErrors?.password} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={state.fieldErrors?.confirm} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <p className="text-sm text-mute">This permanently deletes your account, progress, saved words and conversations. It cannot be undone.</p>
      <Field label="Type DELETE to confirm" name="confirm" autoComplete="off" error={state.fieldErrors?.confirm} />
      <FormMessage state={state} />
      <SubmitButton className="btn bg-coral text-white hover:brightness-110" pendingLabel="Deleting…">Delete my account</SubmitButton>
    </form>
  );
}
