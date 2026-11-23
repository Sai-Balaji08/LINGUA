/** Shape returned by every form Server Action, consumed with React's useActionState. */
export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialState: ActionState = { ok: false };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function succeed(message?: string): ActionState {
  return { ok: true, message };
}

/** Flattens a zod error into { field: firstMessage }. */
export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
