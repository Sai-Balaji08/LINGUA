"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { canSpeak, speak } from "@/components/exercise/ExerciseInput";

/** Plays a word with the browser's own voices. Hidden when the browser has none. */
export function SpeakButton({ text, locale, label }: { text: string; locale: string; label?: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(canSpeak()), []);
  if (!ok) return null;
  return (
    <button type="button" className="btn-quiet !px-2" aria-label={label ?? `Hear ${text}`} onClick={() => speak(text, locale)}>
      <Volume2 size={16} aria-hidden="true" />
    </button>
  );
}
