"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  function toggle(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      role="group"
      aria-label="Select language"
      className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/60 p-0.5 text-xs font-semibold backdrop-blur-sm"
    >
      <button
        onClick={() => toggle("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-3 py-1 transition-all duration-200 ${
          locale === "en"
            ? "bg-amber-500 text-slate-950 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => toggle("id")}
        aria-pressed={locale === "id"}
        className={`rounded-full px-3 py-1 transition-all duration-200 ${
          locale === "id"
            ? "bg-amber-500 text-slate-950 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        ID
      </button>
    </div>
  );
}
