import { useI18n } from "@/lib/i18n/context";

interface ActionPlanProps {
  steps: string[];
}

export default function ActionPlan({ steps }: ActionPlanProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {t.results.actionPlan}
      </p>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-600 bg-slate-900/60 text-xs font-bold text-amber-500">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-slate-300">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
