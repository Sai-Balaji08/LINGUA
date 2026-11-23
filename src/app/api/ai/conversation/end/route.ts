import { z } from "zod";
import { aiRoute, RouteError } from "@/lib/ai/route";
import { summarizeConversation } from "@/lib/ai/conversation";
import type { ConvoMessage, ConversationSummary } from "@/lib/ai/types";

const schema = z.object({ conversationId: z.guid() });

/**
 * Ends a conversation and builds the review. This needs no AI call (the corrections were saved turn by turn),
 * so it costs no quota and works even if the provider is down.
 */
export async function POST(request: Request) {
  return aiRoute(
    request,
    schema,
    async ({ supabase, user, body }) => {
      const { data: row } = await supabase.from("ai_conversations").select("*").eq("id", body.conversationId).maybeSingle();
      if (!row) throw new RouteError("Conversation not found.", 404);
      if (row.status === "ended" && row.summary) return { summary: row.summary as ConversationSummary, alreadyEnded: true };

      const messages = (row.messages ?? []) as ConvoMessage[];
      const learnerTurns = messages.filter((m) => m.role === "user").length;
      const elapsed = Math.round((Date.now() - new Date(row.started_at as string).getTime()) / 1000);
      // Time is capped by how much was actually typed, so a tab left open overnight is not counted as practice.
      const duration = Math.max(1, Math.min(elapsed, learnerTurns * 240, 4 * 3600));
      const summary = summarizeConversation(messages, duration);

      const { error } = await supabase
        .from("ai_conversations")
        .update({ status: "ended", ended_at: new Date().toISOString(), summary })
        .eq("id", body.conversationId);
      if (error) throw new RouteError("Could not end the conversation.", 500);

      if (learnerTurns > 0) {
        await supabase.from("learning_sessions").insert({ user_id: user.id, activity: "conversation", ref_id: body.conversationId, duration_seconds: duration });
        await supabase.rpc("evaluate_achievements");
      }
      return { summary };
    },
    { consumeQuota: false, requireAi: false },
  );
}
