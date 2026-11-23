import { aiConfig } from "@/lib/env";
import type { AiErrorCode } from "@/lib/ai/types";

/**
 * Thin client for the Anthropic Messages API.
 * Server only: the key comes from process.env (never NEXT_PUBLIC_) and this file must not be imported by client components.
 */

export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export const API_URL = "https://api.anthropic.com/v1/messages";
export const API_VERSION = "2023-06-01";
export const DEFAULT_TIMEOUT_MS = 20_000;

export function isAiConfigured(): boolean {
  return aiConfig.apiKey.trim().length > 0;
}

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  system: string;
  messages: ProviderMessage[];
  maxTokens?: number;
  timeoutMs?: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Sends one request and returns the model's text. Throws AiError for every failure mode. */
export async function complete({ system, messages, maxTokens = 700, timeoutMs = DEFAULT_TIMEOUT_MS }: CompleteOptions): Promise<string> {
  if (!isAiConfigured()) throw new AiError("not_configured", "The AI provider is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": aiConfig.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: clamp(maxTokens, 64, 1500),
        system,
        messages,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AiError("unavailable", `The AI provider answered with status ${res.status}.`);

    const data = (await res.json().catch(() => null)) as { content?: { type?: string; text?: string }[] } | null;
    const text = (data?.content ?? [])
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("")
      .trim();
    if (!text) throw new AiError("bad_response", "The AI provider returned an empty answer.");
    return text;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new AiError("timeout", "The AI provider took too long to answer.");
    throw new AiError("unavailable", "Could not reach the AI provider.");
  } finally {
    clearTimeout(timer);
  }
}
