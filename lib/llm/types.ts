import type { TranslationResult } from "@/lib/schema";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  input?: number;
  output?: number;
  total?: number;
}

export interface LLMRequestOptions {
  /** Stable key so providers can reuse cached system prompt prefixes. */
  promptCacheKey?: string;
  /** Provider-specific hint for reasoning models; ignored by providers that do not support it. */
  reasoningEffort?: "low" | "medium" | "high";
}

export interface LLMProvider {
  name: string;
  translate(input: string, systemPrompt: string): Promise<TranslationResult>;
  translateStream(
    input: string,
    systemPrompt: string,
    options?: LLMRequestOptions
  ): AsyncGenerator<string, TokenUsage | undefined>;
  /** Free-form conversational streaming for multi-turn chat (plain text, no JSON). */
  chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: LLMRequestOptions
  ): AsyncGenerator<string, TokenUsage | undefined>;
}

export type LLMErrorCode =
  | "MISSING_API_KEY"
  | "API_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_PROVIDER";

export class LLMError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMError";
  }
}
