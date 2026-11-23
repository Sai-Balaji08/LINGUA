import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { conversationTurn, startConversation } from "@/lib/ai/service";
import { getLanguageContext } from "@/lib/ai/context";
import { buildProviderMessages, filterCorrections } from "@/lib/ai/conversation";
import { MAX_LEARNER_TURNS, MAX_MESSAGE_CHARS, SCENARIO_KEYS } from "@/lib/ai/scenarios";
import type { ConvoMessage } from "@/lib/ai/types";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), scenario: z.enum(SCENARIO_KEYS), difficulty: z.enum(["easy", "medium", "hard"]) }),
  z.object({ action: z.literal("turn"), conversationId: z.guid(), message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }),
]);

const id = () => crypto.randomUUID();

/** Start a conversation or send one learner message. Each call uses one unit of the daily AI quota. */
export async function POST(request: Request) {
  return aiRoute(request, schema, async ({ supabase, user, profile, body }) => {
    if (body.action === "start") {
      const lang = await getLanguageContext(supabase, profile);
      if (!lang) throw new RouteError("Choose a language to learn first.");
      const opener = await startConversation({ ...lang.ctx, scenario: body.scenario, difficulty: body.difficulty });
      const message: ConvoMessage = { id: id(), role: "assistant", content: opener.reply, at: new Date().toISOString(), vocabulary: opener.vocabulary };
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, language_id: lang.language.id, scenario: body.scenario, difficulty: body.difficulty, messages: [message] })
        .select("id")
        .single();
      if (error || !data) throw new RouteError("Could not start the conversation.", 500);
      return { conversationId: data.id as string, message };
    }

    const { data: row } = await supabase.from("ai_conversations").select("*").eq("id", body.conversationId).maybeSingle();
    if (!row) throw new RouteError("Conversation not found.", 404);
    if (row.status !== "active") throw new RouteError("This conversation has ended. Start a new one.");
    const history = (row.messages ?? []) as ConvoMessage[];
    if (history.filter((m) => m.role === "user").length >= MAX_LEARNER_TURNS) {
      throw new RouteError("This conversation is full. End it to see your review, then start another.");
    }

    const lang = await getLanguageContext(supabase, profile, row.language_id);
    if (!lang) throw new RouteError("Language not found.", 404);

    const out = await conversationTurn({ ...lang.ctx, scenario: row.scenario, difficulty: row.difficulty }, buildProviderMessages(history, body.message));

    const now = new Date().toISOString();
    const userMessage: ConvoMessage = {
      id: id(),
      role: "user",
      content: body.message,
      at: now,
      corrections: filterCorrections(body.message, out.corrections),
      alternatives: out.alternatives,
    };
    const assistantMessage: ConvoMessage = { id: id(), role: "assistant", content: out.reply, at: now, vocabulary: out.vocabulary };

    const { error } = await supabase
      .from("ai_conversations")
      .update({ messages: [...history, userMessage, assistantMessage] })
      .eq("id", body.conversationId)
      .eq("status", "active");
    if (error) throw new RouteError("Could not save the conversation.", 500);

    return { userMessage, assistantMessage };
  });
}
