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
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
        {t.suggestions.heading}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-left text-xs font-medium text-amber-300 transition-colors hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
