"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";

const MAX_CHARS = 500;

interface TranslatorInputProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function TranslatorInput({ onSubmit, isLoading, initialValue = "" }: TranslatorInputProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const isEmpty = value.trim().length === 0;

  function trySubmit() {
    if (!isEmpty && !isOverLimit && !isLoading) {
      onSubmit(value.trim());
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    trySubmit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      trySubmit();
    }
  }

  function fillExample(example: string) {
    // Strip surrounding quotes from the chip label before filling
    const stripped = example.replace(/^["']|["']$/g, "");
    setValue(stripped);
    textareaRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted">
          {t.input.label}
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={t.input.placeholder}
            rows={5}
            className={`
              w-full resize-none rounded-lg border bg-surface-card px-4 py-3
              text-base leading-relaxed text-body-strong placeholder-muted-soft
              outline-none transition-all duration-200
              focus:ring-2 focus:border-primary/60 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isOverLimit
                ? "border-accent-rose/60 focus:border-accent-rose/60 focus:ring-accent-rose/20"
                : "border-hairline-strong hover:border-muted-soft"
              }
            `}
            aria-label={t.input.ariaLabel}
          />
          <span
            className={`
              absolute bottom-3 right-3 text-xs font-medium tabular-nums
              ${isOverLimit ? "text-accent-rose" : remaining <= 50 ? "text-primary" : "text-muted-soft"}
            `}
          >
            {remaining}
          </span>
        </div>

        {/* Example chips */}
        <div className="mt-2 flex flex-wrap gap-2">
          {t.input.examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => fillExample(ex)}
              disabled={isLoading}
              className="rounded-full border border-hairline-strong bg-surface-elevated/60 px-3 py-1 text-xs text-muted transition-colors hover:border-muted-soft hover:text-body disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isEmpty || isOverLimit || isLoading}
        className={`
          w-full rounded-md py-4 text-base font-bold tracking-wide transition-all duration-200
          active:scale-95 disabled:cursor-not-allowed disabled:opacity-40
          ${isLoading
            ? "bg-primary/40 text-on-primary cursor-not-allowed"
            : "bg-primary text-on-primary hover:bg-primary-active"
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
            {t.input.submitting}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {t.input.submit}
            <span className="hidden rounded border border-on-primary/30 px-1 py-px text-xs font-normal opacity-60 sm:inline">
              ⌘↵
            </span>
          </span>
        )}
      </button>
    </form>
  );
}
