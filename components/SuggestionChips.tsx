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
            className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:border-primary/70 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
