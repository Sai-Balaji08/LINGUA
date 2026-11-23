import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { evaluateAnswer } from "@/lib/ai/service";
import { getLanguageContext } from "@/lib/ai/context";
import { getLessonLanguageId, referenceAnswers } from "@/lib/ai/exercise";
import type { Exercise } from "@/lib/types";

const schema = z.object({ exerciseId: z.guid(), answer: z.string().trim().min(1).max(400) });

/**
 * Second opinion on a translation or fill-in answer that did not match the stored answers exactly.
 * It is advice only: it never changes the saved score, which is always computed by the exact-match checker.
 */
export async function POST(request: Request) {
  return aiRoute(request, schema, async ({ supabase, profile, body }) => {
    const { data } = await supabase.from("exercises").select("*").eq("id", body.exerciseId).maybeSingle();
    if (!data) throw new RouteError("Exercise not found.", 404);
    const exercise = data as Exercise;
    if (exercise.type !== "translation" && exercise.type !== "fill_blank") throw new RouteError("This exercise type cannot be re-checked.");
    const languageId = await getLessonLanguageId(supabase, exercise.lesson_id);
    const lang = await getLanguageContext(supabase, profile, languageId);
    if (!lang) throw new RouteError("Language not found.", 404);
    const out = await evaluateAnswer(lang.ctx, { prompt: exercise.prompt, references: referenceAnswers(exercise), answer: body.answer });
    return { acceptable: out.acceptable, feedback: out.feedback };
  });
}
