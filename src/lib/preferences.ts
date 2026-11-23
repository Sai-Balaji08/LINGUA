import { z } from "zod";
import { GOAL_VALUES, NATIVE_LANGUAGES, OBJECTIVE_VALUES, PROFICIENCY_VALUES, STYLE_VALUES } from "@/lib/constants";

/** The six onboarding answers. Shared by onboarding and Settings so both enforce the same rules. */
const nativeCodes = NATIVE_LANGUAGES.map((l) => l.code) as [string, ...string[]];

export const preferencesSchema = z.object({
  native_language: z.enum(nativeCodes, { message: "Choose your native language." }),
  target_language_id: z.guid("Choose a language to learn."),
  proficiency: z.enum(PROFICIENCY_VALUES, { message: "Choose your level." }),
  objective: z.enum(OBJECTIVE_VALUES, { message: "Choose a goal." }),
  daily_goal_minutes: z.coerce.number().refine((n) => (GOAL_VALUES as readonly number[]).includes(n), "Choose a daily target."),
  learning_style: z.enum(STYLE_VALUES, { message: "Choose a learning style." }),
});
export type Preferences = z.infer<typeof preferencesSchema>;
