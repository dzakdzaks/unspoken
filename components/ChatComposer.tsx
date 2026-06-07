"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";

const MAX_CHARS = 500;

interface ChatComposerProps {
  onSend: (input: string) => void;
  disabled: boolean;
  placeholder: string;
}

export default function ChatComposer({
  onSend,
  disabled,
  placeholder,
}: ChatComposerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const isEmpty = value.trim().length === 0;
  const canSend = !isEmpty && !isOverLimit && !disabled;

  function trySubmit() {
    if (canSend) {
      onSend(value.trim());
      setValue("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      trySubmit();
    }
  }

  return (
    <div className="border-t border-hairline bg-surface-card/80 p-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className={`w-full resize-none rounded-lg border bg-surface-elevated/80 px-4 py-3 pr-12 text-base leading-relaxed text-body-strong placeholder-muted-soft outline-none transition-all focus:ring-2 focus:ring-primary/20 ${
              isOverLimit
                ? "border-accent-rose/60 focus:border-accent-rose/60"
                : "border-hairline-strong focus:border-primary/60"
            }`}
            aria-label={placeholder}
          />
          {value.length > MAX_CHARS - 60 && (
            <span
              className={`absolute bottom-2 right-3 text-xs font-medium tabular-nums ${
                isOverLimit ? "text-accent-rose" : "text-primary"
              }`}
            >
              {remaining}
            </span>
          )}
        </div>
        <button
          onClick={trySubmit}
          disabled={!canSend}
          aria-label={t.chat.send}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-all hover:bg-primary-active active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
