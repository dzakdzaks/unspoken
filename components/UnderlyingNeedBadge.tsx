import { useI18n } from "@/lib/i18n/context";

interface UnderlyingNeedBadgeProps {
  need: string;
  hue?: number;
}

function getNeedStyle(hue?: number): React.CSSProperties | undefined {
  if (hue === undefined || Number.isNaN(hue)) return undefined;
  const h = ((hue % 360) + 360) % 360;
  return {
    color: `hsl(${h} 75% 75%)`,
    backgroundColor: `hsl(${h} 70% 55% / 0.12)`,
    borderColor: `hsl(${h} 70% 55% / 0.35)`,
  };
}

export default function UnderlyingNeedBadge({
  need,
  hue,
}: UnderlyingNeedBadgeProps) {
  const { t } = useI18n();
  const style = getNeedStyle(hue);

  return (
    <div className="rounded-lg border border-hairline-strong/50 bg-surface-elevated/60 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        {t.results.underlyingNeed}
      </p>
      <span
        className="inline-block rounded-md border px-3 py-1.5 text-sm font-semibold"
        style={
          style ?? {
            borderColor: "rgb(58 58 58 / 0.4)",
            backgroundColor: "rgb(36 36 36 / 0.4)",
            color: "#cccccc",
          }
        }
      >
        {need}
      </span>
    </div>
  );
}
