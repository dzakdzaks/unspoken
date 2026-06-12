import type { TranslationResult } from "@/lib/schema";
import type { Locale } from "@/lib/i18n/translations";

export type Role = "user" | "assistant";
export type MessageKind = "text" | "decode" | "clarify";

export interface Room {
  id: string;
  title: string;
  lang: Locale;
  /** Rolling summary of messages outside the recent context window. */
  contextSummary?: string;
  /** Last message id included in `contextSummary`. */
  summaryThroughMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  role: Role;
  kind: MessageKind;
  content: string;
  decoded?: TranslationResult;
  /** Contextual follow-up prompts surfaced under the latest assistant reply. */
  suggestions?: string[];
  createdAt: string;
}
