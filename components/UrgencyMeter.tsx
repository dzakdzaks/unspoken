import { useI18n } from "@/lib/i18n/context";

interface UrgencyMeterProps {
  level: number;
}

const LEVEL_STYLE: Record<
  number,
  { color: string; barColor: string; bg: string }
> = {
  1: {
    color: "text-emerald-400",
    barColor: "bg-emerald-500",
    bg: "border-emerald-500/20 bg-emerald-500/5",
  },
  2: {
    color: "text-teal-400",
    barColor: "bg-teal-400",
    bg: "border-teal-500/20 bg-teal-500/5",
  },
  3: {
    color: "text-amber-400",
    barColor: "bg-amber-400",
    bg: "border-amber-500/20 bg-amber-500/5",
  },
  4: {
    color: "text-orange-400",
    barColor: "bg-orange-500",
    bg: "border-orange-500/20 bg-orange-500/5",
  },
  5: {
    color: "text-red-400",
    barColor: "bg-red-500",
    bg: "border-red-500/20 bg-red-500/5",
  },
};

export default function UrgencyMeter({ level }: UrgencyMeterProps) {
  const { t } = useI18n();
  const safe = Math.min(5, Math.max(1, Math.round(level))) as 1 | 2 | 3 | 4 | 5;
  const style = LEVEL_STYLE[safe];
  const urgency = t.urgency[safe];

  return (
    <div className={`rounded-lg border p-5 ${style.bg}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        {t.results.threatLevel}
      </p>
      <div className="flex flex-col gap-2.5">
        <div
          className="flex gap-1"
          role="img"
          aria-label={`${t.results.threatLevel}: ${t.urgency.score(safe, urgency.label)}`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                n <= safe ? style.barColor : "bg-surface-elevated"
              }`}
            />
          ))}
        </div>
        <span className={`text-sm font-bold ${style.color}`}>
          {t.urgency.score(safe, urgency.label)}
        </span>
        <p className="text-xs leading-relaxed text-muted">{urgency.desc}</p>
      </div>
    </div>
  );
}
