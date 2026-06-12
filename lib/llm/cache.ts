import type { Locale } from "@/lib/i18n/translations";

export type PromptCacheKind =
  | "decode"
  | "chat"
  | "suggest"
  | "summarize"
  | "clarify"
  | "guardrail";

export function promptCacheKey(kind: PromptCacheKind, locale: Locale): string {
  return `unspoken-${kind}-${locale}`;
}
