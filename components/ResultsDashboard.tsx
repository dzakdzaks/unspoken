"use client";

import { useState } from "react";
import type { TranslationResult } from "@/lib/schema";
import { useI18n } from "@/lib/i18n/context";
import LiteralTranslation from "./LiteralTranslation";
import UnderlyingNeedBadge from "./UnderlyingNeedBadge";
import UrgencyMeter from "./UrgencyMeter";
import ActionPlan from "./ActionPlan";

interface ResultsDashboardProps {
  result: TranslationResult;
  showInputEcho?: boolean;
}

export default function ResultsDashboard({
  result,
  showInputEcho = true,
}: ResultsDashboardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  function buildSummary(): string {
    const steps = result.action_plan.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return [
      `${t.results.decodedSignal}: ${result.translation}`,
      `${t.results.underlyingNeed}: ${result.underlying_need}`,
      `${t.results.threatLevel}: ${result.urgency_level}/5`,
      `${t.results.actionPlan}:`,
      steps,
    ].join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {showInputEcho && (
        <div className="rounded-lg border border-hairline-strong/50 bg-surface-elevated/40 px-4 py-3">
          <p className="break-words text-xs italic text-muted">
            &ldquo;{result.raw_input}&rdquo;
          </p>
        </div>
      )}

      <LiteralTranslation text={result.translation} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UnderlyingNeedBadge need={result.underlying_need} />
        <UrgencyMeter level={result.urgency_level} />
      </div>

      <ActionPlan steps={result.action_plan} />

      <div className="mt-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong bg-surface-elevated/60 px-3 py-2 text-xs font-semibold text-body transition-colors hover:border-muted-soft hover:text-ink"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-primary">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.175a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z" clipRule="evenodd" />
              <path d="M3 6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3Z" />
            </svg>
          )}
          {copied ? t.actions.copied : t.suggestions.quickActions.copy}
        </button>
      </div>
    </div>
  );
}
