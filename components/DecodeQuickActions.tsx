"use client";

interface DecodeQuickActionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled: boolean;
}

export default function DecodeQuickActions({
  suggestions,
  onSelect,
  disabled,
}: DecodeQuickActionsProps) {
  if (!suggestions.length) return null;

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-hairline-strong bg-surface-elevated/60 px-3 py-2 text-left text-xs font-semibold text-body transition-colors hover:border-muted-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          disabled={disabled}
          className={buttonClass}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
