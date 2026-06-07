"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

interface LiteralTranslationProps {
  text: string;
}

export default function LiteralTranslation({ text }: LiteralTranslationProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-primary/20" />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          {t.results.decodedSignal}
        </p>
        <div className="h-px flex-1 bg-primary/20" />
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold text-primary/50 transition-colors hover:text-primary"
        >
          {copied ? t.actions.copied : t.actions.copy}
        </button>
      </div>
      <p className="text-base font-semibold leading-relaxed text-body-strong">
        {text}
      </p>
    </div>
  );
}
