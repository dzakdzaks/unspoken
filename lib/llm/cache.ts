import type { Locale } from "@/lib/i18n/translations";

export type PromptCacheKind = "decode" | "chat" | "suggest" | "summarize";

export function promptCacheKey(
  kind: PromptCacheKind,
  locale: Locale,
  variant?: string
): string {
  return ["unspoken", kind, locale, variant].filter(Boolean).join("-");
}
