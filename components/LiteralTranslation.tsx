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
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-amber-500/20" />
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/70">
          {t.results.decodedSignal}
        </p>
        <div className="h-px flex-1 bg-amber-500/20" />
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold text-amber-500/50 transition-colors hover:text-amber-400"
        >
          {copied ? t.actions.copied : t.actions.copy}
        </button>
      </div>
      <p className="text-base font-semibold leading-relaxed text-slate-100">
        {text}
      </p>
    </div>
  );
}
