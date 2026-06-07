import type { PartialResult } from "@/lib/partialParse";
import { useI18n } from "@/lib/i18n/context";
import type { Translations } from "@/lib/i18n/translations";
import UrgencyMeter from "./UrgencyMeter";

function getStreamingPhase(
  partial: PartialResult,
  phase: Translations["streaming"]["phase"],
): string {
  if (partial.action_plan?.length) return phase.finishing;
  if (partial.urgency_level !== undefined) return phase.building;
  if (partial.underlying_need) return phase.identifying;
  if (partial.translation || partial.translationPartial) return phase.decoding;
  return phase.analyzing;
}

interface StreamingResultsProps {
  partial: PartialResult;
}

function Skeleton({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded-full bg-surface-elevated"
          style={{ width: i === lines - 1 && lines > 1 ? "65%" : "100%" }}
        />
      ))}
    </div>
  );
}

export default function StreamingResults({ partial }: StreamingResultsProps) {
  const { t } = useI18n();

  const hasTranslation = partial.translation || partial.translationPartial;
  const hasNeed = !!partial.underlying_need;
  const hasUrgency = partial.urgency_level !== undefined;
  const hasPlan = !!partial.action_plan?.length;
  const phaseLabel = getStreamingPhase(partial, t.streaming.phase);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Status banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          {t.streaming.status}
        </span>
        <span className="ml-auto text-xs text-muted">{phaseLabel}</span>
      </div>

      {/* Decoded Signal card */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-primary/20" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            {t.results.decodedSignal}
          </p>
          <div className="h-px flex-1 bg-primary/20" />
        </div>
        {hasTranslation ? (
          <p className="text-base font-semibold leading-relaxed text-body-strong">
            {partial.translation ?? partial.translationPartial}
            {!partial.translation && (
              <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary align-middle" />
            )}
          </p>
        ) : (
          <Skeleton lines={3} />
        )}
      </div>

      {/* Need + Urgency grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Underlying Need */}
        <div className="rounded-lg border border-hairline-strong/50 bg-surface-elevated/60 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            {t.results.underlyingNeed}
          </p>
          {hasNeed ? (
            <span
              className="inline-block rounded-md border px-3 py-1.5 text-sm font-semibold"
              style={
                partial.underlying_need_hue !== undefined
                  ? {
                      color: `hsl(${partial.underlying_need_hue} 75% 75%)`,
                      backgroundColor: `hsl(${partial.underlying_need_hue} 70% 55% / 0.12)`,
                      borderColor: `hsl(${partial.underlying_need_hue} 70% 55% / 0.35)`,
                    }
                  : {
                      borderColor: "rgb(58 58 58)",
                      backgroundColor: "#1a1a1a",
                      color: "#e6e6e6",
                    }
              }
            >
              {partial.underlying_need}
            </span>
          ) : (
            <Skeleton />
          )}
        </div>

        {/* Urgency */}
        {hasUrgency ? (
          <UrgencyMeter
            level={partial.urgency_level!}
            label={partial.urgency_label}
            desc={partial.urgency_summary}
          />
        ) : (
          <div className="rounded-lg border border-hairline-strong/50 bg-surface-elevated/60 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              {t.results.threatLevel}
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="h-2 flex-1 animate-pulse rounded-full bg-surface-elevated"
                  />
                ))}
              </div>
              <Skeleton />
            </div>
          </div>
        )}
      </div>

      {/* Action Plan */}
      <div className="rounded-lg border border-hairline-strong/50 bg-surface-elevated/60 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          {t.results.actionPlan}
        </p>

        {hasPlan ? (
          <ol className="flex flex-col gap-3">
            {partial.action_plan!.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-hairline-strong bg-surface-card text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-body">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 shrink-0 animate-pulse rounded-md bg-surface-elevated" />
                <Skeleton lines={2} className="flex-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
