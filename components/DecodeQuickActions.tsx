"use client";

import { useI18n } from "@/lib/i18n/context";

interface DecodeQuickActionsProps {
  onSelect: (text: string) => void;
  disabled: boolean;
}

export default function DecodeQuickActions({
  onSelect,
  disabled,
}: DecodeQuickActionsProps) {
  const { t } = useI18n();
  const qa = t.suggestions.quickActions;

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(qa.writeText.prompt)}
        disabled={disabled}
        className={buttonClass}
      >
        {qa.writeText.label}
      </button>
      <button
        type="button"
        onClick={() => onSelect(qa.makePlan.prompt)}
        disabled={disabled}
        className={buttonClass}
      >
        {qa.makePlan.label}
      </button>
    </div>
  );
}
