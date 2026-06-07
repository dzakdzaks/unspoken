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
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
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
              w-full resize-none rounded-xl border bg-slate-900/80 px-4 py-3
              text-base leading-relaxed text-slate-100 placeholder-slate-600
              outline-none transition-all duration-200
              focus:ring-2 focus:border-amber-500/60 focus:ring-amber-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isOverLimit
                ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                : "border-slate-700 hover:border-slate-600"
              }
            `}
            aria-label={t.input.ariaLabel}
          />
          <span
            className={`
              absolute bottom-3 right-3 text-xs font-medium tabular-nums
              ${isOverLimit ? "text-red-400" : remaining <= 50 ? "text-amber-400" : "text-slate-600"}
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
              className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
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
          w-full rounded-xl py-4 text-base font-bold tracking-wide transition-all duration-200
          active:scale-95 disabled:cursor-not-allowed disabled:opacity-40
          ${isLoading
            ? "bg-amber-500/40 text-amber-200 cursor-not-allowed"
            : "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
            {t.input.submitting}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {t.input.submit}
            <span className="hidden rounded border border-slate-950/30 px-1 py-px text-xs font-normal opacity-60 sm:inline">
              ⌘↵
            </span>
          </span>
        )}
      </button>
    </form>
  );
}
