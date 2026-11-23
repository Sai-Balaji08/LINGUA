/** Plain data shapes shared by the AI service, the API routes and the conversation UI. */

export type Difficulty = "easy" | "medium" | "hard";

export interface Correction {
  /** Exact text from the learner's message that contains the mistake. */
  original: string;
  corrected: string;
  explanation: string;
}

export interface VocabItem {
  term: string;
  translation: string;
}

/** One message stored in ai_conversations.messages. Feedback on a learner message lives on that message. */
export interface ConvoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
  corrections?: Correction[];
  alternatives?: string[];
  vocabulary?: VocabItem[];
}

export interface ConversationSummary {
  turns: number;
  durationSeconds: number;
  mistakeCount: number;
  mistakes: Correction[];
  vocabulary: VocabItem[];
}

export type AiErrorCode = "unavailable" | "timeout" | "bad_response" | "not_configured";

/** Error codes returned by the /api/ai/* routes. */
export type ApiErrorCode = "unavailable" | "quota" | "disabled" | "invalid" | "unauthenticated";
