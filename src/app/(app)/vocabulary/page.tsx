import type { Metadata } from "next";
import Link from "next/link";
import { Library, Plus, Search, Trash2 } from "lucide-react";
import { AddWordForm } from "@/components/vocab/AddWordForm";
import { SpeakButton } from "@/components/vocab/SpeakButton";
import { EmptyState } from "@/components/ui/Feedback";
import { requireOnboarded } from "@/lib/auth";
import { VOCAB_TABS, dueLabel, filterSaved, getLibraryWords, getSavedWords, parseTab, type SavedWord, type VocabTab } from "@/lib/data/vocabulary";
import { isDifficult, isMastered } from "@/lib/srs";
import { removeWord, saveWord } from "./actions";
import type { Language, VocabularyWord } from "@/lib/types";

export const metadata: Metadata = { title: "Words" };

const TAB_LABEL: Record<VocabTab, string> = { all: "All", due: "Due", difficult: "Difficult", mastered: "Mastered", new: "New" };

function WordDetails({ w, locale }: { w: VocabularyWord; locale: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p lang={locale} className="font-script text-xl font-bold">{w.term}</p>
          {w.transliteration && <p className="text-sm text-mute">{w.transliteration}</p>}
          <p className="font-medium">{w.translation}</p>
        </div>
        <SpeakButton text={w.term} locale={locale} />
      </div>
      {w.part_of_speech && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-mute">{w.part_of_speech}</p>}
      {w.definition && <p className="mt-2 text-sm text-mute">{w.definition}</p>}
      {w.example_sentence && (
        <p className="mt-2 rounded-lg bg-sunk px-3 py-2 text-sm">
          <span lang={locale}>{w.example_sentence}</span>
          {w.example_translation && <span className="block text-mute">{w.example_translation}</span>}
        </p>
      )}
    </>
  );
}

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { supabase, user, profile } = await requireOnboarded();
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const q = (sp.q ?? "").slice(0, 60);

  if (!profile.target_language_id) {
    return <EmptyState title="Choose a language" body="Pick a language in Settings to build your word list." action={<Link href="/settings" className="btn-primary">Open settings</Link>} />;
  }

  const { data: lang } = await supabase.from("languages").select("*").eq("id", profile.target_language_id).maybeSingle();
  const language = lang as Language | null;
  const locale = language?.speech_locale ?? "en-US";

  const saved = await getSavedWords(supabase, user.id, profile.target_language_id);
  const now = new Date();
  const shown = filterSaved(saved, { tab, query: q, now });
  const counts: Record<VocabTab, number> = Object.fromEntries(VOCAB_TABS.map((t) => [t, filterSaved(saved, { tab: t, now }).length])) as Record<VocabTab, number>;
  const library = tab === "all" && !q ? await getLibraryWords(supabase, profile.target_language_id, new Set(saved.map((s) => s.vocabulary_id)), 12) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-mute">{language?.name}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Your words</h1>
        </div>
        {counts.due > 0 && <Link href="/review" className="btn-primary">Review {counts.due} due</Link>}
      </header>

      <form role="search" className="flex gap-2" action="/vocabulary">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
          <input name="q" defaultValue={q} className="field !pl-10" placeholder="Search words, meanings…" aria-label="Search your words" maxLength={60} />
        </div>
        <button className="btn-ghost" type="submit">Search</button>
      </form>

      <nav aria-label="Filter words" className="flex flex-wrap gap-2">
        {VOCAB_TABS.map((t) => (
          <Link key={t} href={`/vocabulary?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={t === tab ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${t === tab ? "bg-cobalt text-white" : "bg-sunk text-mute hover:text-ink"}`}>
            {TAB_LABEL[t]} <span className="opacity-70">{counts[t]}</span>
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Library size={32} aria-hidden="true" />}
          title={saved.length === 0 ? "Your deck is empty" : "No words match"}
          body={saved.length === 0 ? "Finish a lesson and add its words, pick from the library below, or add your own word." : q ? "Try a different search, or clear the filter." : "Nothing in this group right now."}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((w: SavedWord) => (
            <li key={w.id} className="card flex flex-col p-5">
              <WordDetails w={w.vocabulary} locale={locale} />
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs">
                <span className="rounded-full bg-sunk px-2.5 py-1 font-semibold">{dueLabel(w.due_at, now)}</span>
                {isMastered(w) && <span className="rounded-full bg-mint-soft px-2.5 py-1 font-semibold">Mastered</span>}
                {isDifficult(w) && <span className="rounded-full bg-coral-soft px-2.5 py-1 font-semibold">Difficult</span>}
                {w.vocabulary.owner_id && <span className="rounded-full bg-cobalt-soft px-2.5 py-1 font-semibold">Mine</span>}
                <form action={removeWord} className="ml-auto">
                  <input type="hidden" name="userVocabularyId" value={w.id} />
                  <button type="submit" className="btn-quiet !px-2 !py-1.5 text-xs" aria-label={`Remove ${w.vocabulary.term}`}>
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddWordForm />

      {library.length > 0 && (
        <section aria-labelledby="lib-h" className="space-y-3">
          <h2 id="lib-h" className="text-xl font-extrabold">Word library</h2>
          <p className="text-sm text-mute">Common {language?.name} words you have not saved yet.</p>
          <ul className="grid gap-4 md:grid-cols-2">
            {library.map((w) => (
              <li key={w.id} className="card flex flex-col p-5">
                <WordDetails w={w} locale={locale} />
                <form action={saveWord} className="pt-4">
                  <input type="hidden" name="vocabularyId" value={w.id} />
                  <button type="submit" className="btn-ghost !py-1.5 text-sm"><Plus size={14} aria-hidden="true" /> Save to my deck</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
