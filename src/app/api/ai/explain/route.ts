import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { explainGrammar } from "@/lib/ai/service";
import { getLanguageContext } from "@/lib/ai/context";
import { getLessonLanguageId, referenceAnswer } from "@/lib/ai/exercise";
import type { Exercise } from "@/lib/types";

const schema = z.object({ exerciseId: z.guid(), answer: z.string().max(600).optional() });

export async function POST(request: Request) {
  return aiRoute(request, schema, async ({ supabase, profile, body }) => {
    const { data } = await supabase.from("exercises").select("*, exercise_options(*)").eq("id", body.exerciseId).maybeSingle();
    if (!data) throw new RouteError("Exercise not found.", 404);
    const exercise = data as Exercise;
    const languageId = await getLessonLanguageId(supabase, exercise.lesson_id);
    const lang = await getLanguageContext(supabase, profile, languageId);
    if (!lang) throw new RouteError("Language not found.", 404);
    const out = await explainGrammar(lang.ctx, { prompt: exercise.prompt, correct: referenceAnswer(exercise), answer: body.answer, teacherNote: exercise.explanation || undefined });
    return { explanation: out.explanation };
  });
}
