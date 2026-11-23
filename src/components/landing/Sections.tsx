import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  Layers,
  MessageCircle,
  Mic,
  Repeat,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

function Section({
  id,
  title,
  intro,
  children,
  tint,
}: {
  id?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-16 py-20 md:py-24 ${tint ? "bg-sunk/60" : ""}`}>
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-2xl text-3xl font-extrabold sm:text-4xl">{title}</h2>
        {intro && <p className="mt-4 max-w-xl text-lg text-mute">{intro}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export function Introduction() {
  return (
    <Section
      title="Most apps teach you to finish lessons. LINGUA teaches you to use the language."
      intro="You can collect a long streak and still freeze when someone says hello. We measure reading, listening, writing and speaking separately, so you can see what is solid and what needs work."
    >
      <div className="grid gap-10 md:grid-cols-3">
        {[
          ["Understand first", "Every lesson opens with a short explanation of the idea, so exercises feel like practice, not guessing."],
          ["Practise the way you will use it", "Translate, arrange sentences, listen, write and say phrases out loud. Not just tap the right answer."],
          ["Progress you can trust", "Points exist for fun, but your skill scores come only from answers you actually got right."],
        ].map(([title, body]) => (
          <div key={title}>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-2 text-mute">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  ["Tell us your goal", "Pick the language you speak, the one you want, why you want it and how many minutes a day suit you."],
  ["Take a short placement", "A few questions place you at the right starting point, so beginners are not bored and advanced learners are not lost."],
  ["Learn in small lessons", "Each lesson is five to ten minutes: a short explanation, then a mix of exercise types."],
  ["Review words before you forget them", "Saved words come back on a schedule that adapts to how well you remember each one."],
  ["Talk it through", "Practise real situations with the AI partner, then review your mistakes with explanations."],
];

export function HowItWorks() {
  return (
    <Section id="how" title="How LINGUA works" tint>
      <ol className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cobalt font-display text-base font-bold text-white"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-mute">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const LANGS = [
  { name: "Spanish", native: "Español", hello: "Hola", ready: true },
  { name: "French", native: "Français", hello: "Bonjour", ready: true },
  { name: "Hindi", native: "हिन्दी", hello: "नमस्ते", ready: false },
  { name: "Japanese", native: "日本語", hello: "こんにちは", ready: false },
  { name: "Arabic", native: "العربية", hello: "مرحبا", ready: false },
  { name: "Portuguese", native: "Português", hello: "Olá", ready: false },
];

export function LanguageShowcase() {
  return (
    <Section
      id="languages"
      title="Pick a language"
      intro="Spanish and French open with the first release. More languages are added by our content team through the admin panel, so the list grows without a redesign."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LANGS.map((l) => (
          <li
            key={l.name}
            className={`flex items-center justify-between rounded-2xl border border-line px-6 py-5 ${l.ready ? "bg-surface" : "bg-transparent"}`}
          >
            <div>
              <p className="font-script text-3xl font-bold">{l.hello}</p>
              <p className="mt-1 text-sm text-mute">
                {l.name} · {l.native}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${l.ready ? "bg-mint-soft text-ink" : "bg-sunk text-mute"}`}
            >
              {l.ready ? "Available" : "Coming soon"}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Methodology() {
  const items = [
    ["Retrieval over recognition", "You recall and produce answers, because remembering is what builds memory. Reading the answer does not."],
    ["Spacing", "Words return just before you would forget them. Easy words wait longer; hard words come back sooner."],
    ["Output early", "You write and speak from the first week, with feedback that explains the mistake instead of just marking it red."],
    ["Context, not lists", "Vocabulary arrives inside sentences and situations, so you learn how a word is actually used."],
  ];
  return (
    <Section id="method" title="Learning methodology" tint>
      <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        {items.map(([t, d]) => (
          <div key={t} className="border-l-4 border-saffron pl-5">
            <dt className="text-lg font-bold">{t}</dt>
            <dd className="mt-1 text-mute">{d}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function AiDemo() {
  return (
    <Section
      title="A conversation partner that corrects you kindly"
      intro="Choose a situation and a difficulty. The partner replies in your target language, flags mistakes, explains them and suggests more natural phrasing."
    >
      <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card space-y-4 p-6" aria-label="Example conversation">
          <p className="text-sm font-medium text-mute">Example: ordering food, easy</p>
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-sunk px-4 py-3">
            <p className="font-medium">¡Buenas tardes! ¿Qué desea tomar?</p>
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-cobalt px-4 py-3 text-white">
            <p className="font-medium">
              <span className="rounded bg-coral/90 px-1">Yo soy quiero</span> un café, por favor.
            </p>
          </div>
          <div className="rounded-xl border border-saffron/50 bg-saffron-soft px-4 py-3 text-sm">
            <p className="font-semibold">Try: “Quiero un café, por favor.”</p>
            <p className="mt-1 text-mute">
              “Soy” comes from <em>ser</em> (to be). To say what you want, “quiero” is enough on its own.
            </p>
            <p className="mt-2 font-medium">Useful: la cuenta (the bill), con leche (with milk)</p>
          </div>
        </div>
        <ul className="space-y-4 text-mute">
          {[
            "Six situations: ordering food, meeting someone, a job interview, travelling, shopping and daily conversation.",
            "Mistakes are highlighted with a plain-language reason.",
            "A summary at the end lists what to review.",
            "If the AI service is ever down, every ordinary lesson keeps working.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-1 shrink-0 text-mint" size={18} aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function Features() {
  const items = [
    [Layers, "Ten exercise types", "Multiple choice, translation, fill in the blank, word arrangement, listening, reading, matching, grammar, writing and speaking."],
    [Repeat, "Spaced-repetition vocabulary", "Flashcards that reschedule themselves, with a list of words you find difficult."],
    [MessageCircle, "AI conversation partner", "Live practice with corrections, alternatives and a review at the end."],
    [BarChart3, "Skill analytics", "Reading, listening, writing and speaking tracked separately from points and streaks."],
    [BookOpenCheck, "Placement and personal paths", "Start where you are, with a daily target that fits your day."],
    [Smartphone, "Built for phones", "Large tap targets, light and dark themes and keyboard-friendly screens."],
  ] as const;
  return (
    <Section title="Everything in one place" tint>
      <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {items.map(([Icon, t, d]) => (
          <li key={t} className="flex gap-4">
            <Icon className="mt-1 shrink-0 text-cobalt" size={24} aria-hidden="true" />
            <div>
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-1 text-mute">{d}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function WhyLingua() {
  const rows = [
    ["Points and streaks stand in for skill", "Skill scores come from answers you got right, per skill."],
    ["Hearts and timers limit how much you can learn", "Practise as long as you like."],
    ["Multiple choice for almost everything", "Ten exercise types, including writing and speaking."],
    ["Mistakes are marked wrong and forgotten", "Mistakes come with an explanation and return in review."],
  ];
  return (
    <Section title="Why LINGUA">
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-2 bg-sunk px-5 py-3 text-sm font-semibold">
          <p className="text-mute">Often</p>
          <p>With LINGUA</p>
        </div>
        {rows.map(([a, b]) => (
          <div key={a} className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4">
            <p className="flex gap-2 text-mute">
              <X size={18} className="mt-0.5 shrink-0 text-coral" aria-hidden="true" /> {a}
            </p>
            <p className="flex gap-2">
              <Check size={18} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" /> {b}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function FreePromise() {
  return (
    <section id="free" className="scroll-mt-16 bg-cobalt py-20 text-white md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">The core of LINGUA is free, and it stays that way.</h2>
          <p className="mt-4 text-lg text-white/85">
            Learning a language should not depend on what you can pay. Here is exactly what that means.
          </p>
          <Link href="/signup" className="btn mt-8 bg-white text-cobalt hover:bg-white/90">
            Start for free <ArrowRight size={18} />
          </Link>
        </div>
        <ul className="space-y-3">
          {[
            "All courses, lessons and exercises",
            "Vocabulary flashcards and spaced repetition",
            "Progress and skill analytics",
            "No ads and no selling of your learning data",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-1 shrink-0" size={18} aria-hidden="true" /> {t}
            </li>
          ))}
          <li className="flex gap-3 border-t border-white/25 pt-4 text-white/85">
            <Sparkles className="mt-1 shrink-0" size={18} aria-hidden="true" />
            AI conversations have a daily limit, because each reply costs real money to generate. The limit never
            blocks regular lessons.
          </li>
        </ul>
      </div>
    </section>
  );
}

const FAQS = [
  ["Is LINGUA really free?", "Yes. Courses, lessons, exercises, vocabulary review and analytics are free. AI conversations have a daily limit to keep running costs sustainable."],
  ["Which languages can I learn?", "Spanish and French at launch. New languages, courses and lessons are added by administrators, so more will follow."],
  ["Do I need the AI features?", "No. The lesson engine works on its own. If the AI service is unavailable, lessons and vocabulary review are unaffected."],
  ["How is my data protected?", "Your progress is private to your account and enforced by database row-level security. You can export your data or delete your account from Settings."],
  ["How does placement work?", "After sign-up you answer a few questions from your chosen language. The result suggests a starting level; you can still pick any level yourself."],
  ["Can I practise speaking?", "Yes, in browsers that support speech recognition your phrase is compared with the target. Elsewhere you can self-rate, which is saved but not counted in your speaking score."],
];

export function Faq() {
  return (
    <Section id="faq" title="Questions, answered">
      <div className="max-w-3xl divide-y divide-line border-y border-line">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <span className="text-2xl leading-none text-cobalt transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-mute">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 text-center">
      <Mic className="mx-auto text-cobalt" size={28} aria-hidden="true" />
      <h2 className="mx-auto mt-4 max-w-xl text-3xl font-extrabold sm:text-4xl">Say your first sentence today.</h2>
      <Link href="/signup" className="btn-primary mt-8 !px-6 !py-3 text-base">
        Create a free account
      </Link>
    </section>
  );
}
