import { useI18n } from "@/lib/i18n/context";

interface UnderlyingNeedBadgeProps {
  need: string;
}

const NEED_COLORS: Record<string, string> = {
  // English
  "quality time":
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  reassurance:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  validation:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  space: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  assistance:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  attention:
    "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  communication:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  // Indonesian equivalents
  "waktu berkualitas":
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "waktu bersama":
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  kepastian:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  keyakinan:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  validasi:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  pengakuan:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  ruang: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  bantuan:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  dukungan:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  perhatian:
    "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  komunikasi:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

function getNeedColor(need: string): string {
  const key = need.toLowerCase();
  for (const [pattern, cls] of Object.entries(NEED_COLORS)) {
    if (key.includes(pattern)) return cls;
  }
  return "border-slate-600/40 bg-slate-700/20 text-slate-300";
}

export default function UnderlyingNeedBadge({
  need,
}: UnderlyingNeedBadgeProps) {
  const { t } = useI18n();
  const colorClass = getNeedColor(need);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {t.results.underlyingNeed}
      </p>
      <span
        className={`inline-block rounded-lg border px-3 py-1.5 text-sm font-semibold ${colorClass}`}
      >
        {need}
      </span>
    </div>
  );
}
