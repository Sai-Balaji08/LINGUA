import type { Metadata } from "next";
import Link from "next/link";
import { ConversationPartner, ConversationEmptyIcon, type PastConversation } from "@/components/ai/ConversationPartner";
import { EmptyState } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import type { ConvoMessage, ConversationSummary } from "@/lib/ai/types";
import type { Language } from "@/lib/types";

export const metadata: Metadata = { title: "Conversation partner" };

export default async function ConversationPage() {
  const { supabase, user, profile } = await requireOnboarded();

  const { data: lang } = profile.target_language_id
    ? await supabase.from("languages").select("*").eq("id", profile.target_language_id).eq("published", true).maybeSingle()
    : { data: null };
  const language = lang as Language | null;

  if (!language) {
    return (
      <EmptyState
        icon={<ConversationEmptyIcon />}
        title="Choose a language first"
        body="Pick the language you are learning in Settings, then come back to practise a conversation."
        action={<Link href="/settings" className="btn-primary">Open settings</Link>}
      />
    );
  }

  const { data: rows } = await supabase
    .from("ai_conversations")
    .select("id, scenario, difficulty, status, started_at, messages, summary")
    .eq("user_id", user.id)
    .eq("language_id", language.id)
    .order("started_at", { ascending: false })
    .limit(5);

  const recent: PastConversation[] = (rows ?? []).map((r) => {
    const messages = (r.messages ?? []) as ConvoMessage[];
    const summary = r.summary as ConversationSummary | null;
    return {
      id: r.id as string,
      scenario: r.scenario as string,
      difficulty: r.difficulty as string,
      status: r.status as "active" | "ended",
      started_at: r.started_at as string,
      turns: messages.filter((m) => m.role === "user").length,
      mistakeCount: summary?.mistakeCount ?? null,
    };
  });

  return <ConversationPartner languageName={language.name} locale={language.speech_locale} recent={recent} />;
}
