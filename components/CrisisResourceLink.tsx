"use client";

import type { CrisisResource } from "@/lib/crisis/types";
import type { Locale } from "@/lib/i18n/translations";
import { translations } from "@/lib/i18n/translations";
import { trackCrisisResourceTapClient } from "@/lib/analytics/crisis-client";

interface CrisisResourceLinkProps {
  resource: CrisisResource;
  locale: Locale;
  roomId: string;
  messageId: string;
}

export default function CrisisResourceLink({
  resource,
  locale,
  roomId,
  messageId,
}: CrisisResourceLinkProps) {
  const t = translations[locale].crisis;

  function handleTap() {
    trackCrisisResourceTapClient({
      resourceId: resource.id,
      locale,
      roomId,
      messageId,
    });
  }

  return (
    <div className="rounded-md border border-hairline-strong bg-surface-elevated/80 px-4 py-3">
      <p className="text-sm font-semibold text-body-strong">{resource.name}</p>
      {resource.subtitle && (
        <p className="mt-0.5 text-xs text-muted">{resource.subtitle}</p>
      )}
      <div className="mt-2 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2">
        {resource.tel && (
          <a
            href={`tel:${resource.tel}`}
            onClick={handleTap}
            aria-label={t.callAction(resource.name)}
            className="inline-flex min-h-12 items-center rounded-md px-1 text-sm font-semibold text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {resource.tel}
          </a>
        )}
        {resource.tel && resource.url && (
          <span className="hidden text-muted sm:inline" aria-hidden>
            ·
          </span>
        )}
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTap}
            aria-label={t.openWebsiteAction(resource.name)}
            className="inline-flex min-h-12 items-center rounded-md px-1 text-sm font-semibold text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {t.visitWebsite}
          </a>
        )}
      </div>
    </div>
  );
}
