"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

const GREETINGS = [
  { word: "Hola", language: "Spanish", locale: "es-ES" },
  { word: "Bonjour", language: "French", locale: "fr-FR" },
  { word: "नमस्ते", language: "Hindi", locale: "hi-IN" },
  { word: "こんにちは", language: "Japanese", locale: "ja-JP" },
  { word: "مرحبا", language: "Arabic", locale: "ar-SA" },
  { word: "Olá", language: "Portuguese", locale: "pt-BR" },
  { word: "你好", language: "Chinese", locale: "zh-CN" },
];

export function Hero() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % GREETINGS.length), 2600);
    return () => clearInterval(id);
  }, [reduce]);

  const current = GREETINGS[index];

  function speak() {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(current.word);
    u.lang = current.locale;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
      <div>
        <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
          Learn the language, not the streak.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-mute">
          Short lessons, real conversations and an honest record of what you can actually do. Free for everyone, with
          no hearts to run out of.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn-primary !px-6 !py-3 text-base">
            Create a free account <ArrowRight size={18} />
          </Link>
          <a href="#how" className="btn-ghost !px-6 !py-3 text-base">
            See how it works
          </a>
        </div>
        <p className="mt-4 text-sm text-mute">No card needed. Core lessons stay free.</p>
      </div>

      <div className="relative mx-auto w-full max-w-md" aria-label="Greeting in different languages">
        <div className="relative rounded-bubble bg-cobalt px-8 pb-8 pt-7 text-white shadow-lift">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span aria-live="polite">{current.language}</span>
            {canSpeak && (
              <button
                type="button"
                onClick={speak}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-medium transition hover:bg-white/25"
              >
                <Volume2 size={16} aria-hidden="true" /> Hear it
              </button>
            )}
          </div>
          <div className="flex h-36 items-center sm:h-44">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.word}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.28 }}
                className="font-script text-6xl font-bold leading-none sm:text-7xl"
                lang={current.locale}
                dir={current.locale.startsWith("ar") ? "rtl" : "ltr"}
              >
                {current.word}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-sm text-white/80">Means “hello”. Your turn to say it back.</p>
        </div>

        <div className="relative -mt-3 ml-auto w-[78%] rounded-2xl rounded-tr-md border border-line bg-surface px-5 py-4 shadow-lift">
          <p className="text-sm text-mute">You</p>
          <p className="mt-0.5 font-medium">Hola, me llamo Sai. Mucho gusto.</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-semibold">
            Natural and correct
          </p>
        </div>
      </div>
    </section>
  );
}
