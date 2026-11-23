import type { SupabaseClient } from "@supabase/supabase-js";
import { NATIVE_LANGUAGES } from "@/lib/constants";
import type { LanguageContext } from "@/lib/ai/prompts";
import type { Language, Profile } from "@/lib/types";

/** "Hindi (हिन्दी)" -> "Hindi". Falls back to English when the learner chose "another language". */
export function nativeLanguageName(code: string | null): string {
  const found = NATIVE_LANGUAGES.find((l) => l.code === code);
  if (!found || found.code === "other") return "English";
  return found.label.split(" (")[0];
}

export async function getLanguageContext(
  supabase: SupabaseClient,
  profile: Pick<Profile, "native_language" | "target_language_id">,
  languageId?: string | null,
): Promise<{ ctx: LanguageContext; language: Language } | null> {
  const id = languageId ?? profile.target_language_id;
  if (!id) return null;
  const { data } = await supabase.from("languages").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (!data) return null;
  const language = data as Language;
  return { ctx: { targetLanguage: language.name, nativeLanguage: nativeLanguageName(profile.native_language) }, language };
}
