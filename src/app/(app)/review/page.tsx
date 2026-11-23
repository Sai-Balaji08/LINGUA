import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ReviewSession } from "@/components/vocab/ReviewSession";
import { EmptyState } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import { getSavedWords, type SavedWord } from "@/lib/data/vocabulary";
import { isDue } from "@/lib/srs";

export const metadata: Metadata = { title: "Review" };

const SESSION_SIZE = 20;

export default async function ReviewPage() {
  const { supabase, user, profile } = await requireOnboarded();
  const { data: lang } = profile.target_language_id ? await supabase.from("languages").select("speech_locale").eq("id", profile.target_language_id).maybeSingle() : { data: null };
  const saved = await getSavedWords(supabase, user.id, profile.target_language_id);
  const now = new Date();
  const due: SavedWord[] = saved
    .filter((w) => isDue(w.due_at, now))
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, SESSION_SIZE);

  if (due.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={36} className="text-mint" aria-hidden="true" />}
        title={saved.length === 0 ? "No words to review yet" : "You are all caught up"}
        body={saved.length === 0 ? "Add words from a lesson or the word library and they will show up here when they are due." : "Nothing is due right now. Come back later, or learn something new."}
        action={<Link href={saved.length === 0 ? "/vocabulary" : "/learn"} className="btn-primary">{saved.length === 0 ? "Browse words" : "Go to lessons"}</Link>}
      />
    );
  }
  return <ReviewSession cards={due} locale={(lang as { speech_locale?: string } | null)?.speech_locale ?? "en-US"} />;
}
