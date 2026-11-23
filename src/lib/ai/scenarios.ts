import type { Difficulty } from "@/lib/ai/types";

/** Conversation scenarios and difficulty levels. Shared by the UI (labels) and the prompts (briefs). */

export const SCENARIOS = [
  {
    key: "ordering_food",
    label: "Ordering food",
    description: "Order a meal, ask about dishes and pay the bill.",
    brief: "You are a friendly waiter or waitress in a restaurant. The learner is a customer ordering a meal.",
  },
  {
    key: "meeting_someone",
    label: "Meeting someone",
    description: "Introduce yourself and get to know a new person.",
    brief: "You are a friendly person the learner has just met at a social event. Chat and get to know each other.",
  },
  {
    key: "job_interview",
    label: "Job interview",
    description: "Answer common interview questions with confidence.",
    brief: "You are a polite interviewer at a company. The learner is a candidate in a job interview.",
  },
  {
    key: "travelling",
    label: "Travelling",
    description: "Ask for directions, tickets and hotel help.",
    brief: "You are a helpful local (station clerk, hotel receptionist or passer-by). The learner is a traveller who needs help.",
  },
  {
    key: "shopping",
    label: "Shopping",
    description: "Ask about prices, sizes and negotiate politely.",
    brief: "You are a shop assistant. The learner is a customer asking about products, sizes and prices.",
  },
  {
    key: "daily_conversation",
    label: "Daily conversation",
    description: "Chat about your day, hobbies and plans.",
    brief: "You are a friendly neighbour or friend having a relaxed everyday chat about daily life, hobbies and plans.",
  },
] as const;

export type ScenarioKey = (typeof SCENARIOS)[number]["key"];
export const SCENARIO_KEYS = SCENARIOS.map((s) => s.key) as unknown as readonly [ScenarioKey, ...ScenarioKey[]];

export const DIFFICULTIES: { key: Difficulty; label: string; hint: string; prompt: string }[] = [
  {
    key: "easy",
    label: "Easy",
    hint: "Short, simple sentences and everyday words.",
    prompt: "Beginner level (about CEFR A1). Use very short, simple sentences, present tense and very common words only.",
  },
  {
    key: "medium",
    label: "Medium",
    hint: "Natural but clear, with some new words.",
    prompt: "Intermediate level (about CEFR A2 to B1). Use clear sentences, common tenses and a few new words.",
  },
  {
    key: "hard",
    label: "Hard",
    hint: "Native-like pace, idioms and longer replies.",
    prompt: "Upper-intermediate level (about CEFR B2). Speak naturally with varied tenses and some idiomatic expressions.",
  },
];

export function scenarioByKey(key: string) {
  return SCENARIOS.find((s) => s.key === key);
}

export function scenarioLabel(key: string): string {
  return scenarioByKey(key)?.label ?? "Conversation";
}

export function difficultyByKey(key: string) {
  return DIFFICULTIES.find((d) => d.key === key) ?? DIFFICULTIES[1];
}

export const MAX_LEARNER_TURNS = 30;
export const MAX_MESSAGE_CHARS = 600;
export const HISTORY_WINDOW = 12;
