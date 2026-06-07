"use client";

import { useI18n } from "@/lib/i18n/context";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled: boolean;
}

export default function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
}: SuggestionChipsProps) {
  const { t } = useI18n();

  if (!suggestions.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">
        {t.suggestions.heading}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong bg-surface-elevated/60 px-3 py-2 text-left text-xs font-semibold text-body transition-colors hover:border-muted-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
