import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { learningSuggestions } from "@/lib/ai/service";
import { getLanguageContext } from "@/lib/ai/context";
import { summarizeSkills } from "@/lib/analytics";
import { getProgressData } from "@/lib/data/analytics";

const schema = z.object({});

/** Personalised study suggestions from real skill data. Only aggregates are sent to the model, never raw answers. */
export async function POST(request: Request) {
  return aiRoute(request, schema, async ({ supabase, user, profile }) => {
    const lang = await getLanguageContext(supabase, profile);
    if (!lang) throw new RouteError("Choose a language to learn first.");
    const data = await getProgressData(supabase, user.id);
    const skills = summarizeSkills(data.skillRows).map((s) => ({ skill: s.skill, accuracy: s.enough ? s.accuracy : null, attempts: s.attempts }));
    const out = await learningSuggestions(lang.ctx, { objective: profile.objective, proficiency: profile.proficiency, dueWords: data.vocab.due, skills });
    return { suggestions: out.suggestions };
  });
}
