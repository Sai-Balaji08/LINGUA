import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { writingFeedback } from "@/lib/ai/service";
import { getLanguageContext } from "@/lib/ai/context";
import { filterCorrections } from "@/lib/ai/conversation";
import { getLessonLanguageId } from "@/lib/ai/exercise";
import type { Exercise } from "@/lib/types";

const schema = z.object({ exerciseId: z.guid(), text: z.string().trim().min(3).max(1500) });

export async function POST(request: Request) {
  return aiRoute(request, schema, async ({ supabase, profile, body }) => {
    const { data } = await supabase.from("exercises").select("*").eq("id", body.exerciseId).maybeSingle();
    if (!data) throw new RouteError("Exercise not found.", 404);
    const exercise = data as Exercise;
    const languageId = await getLessonLanguageId(supabase, exercise.lesson_id);
    const lang = await getLanguageContext(supabase, profile, languageId);
    if (!lang) throw new RouteError("Language not found.", 404);
    const out = await writingFeedback(lang.ctx, { prompt: exercise.prompt, text: body.text });
    return { summary: out.summary, strengths: out.strengths, corrections: filterCorrections(body.text, out.corrections) };
  });
}
