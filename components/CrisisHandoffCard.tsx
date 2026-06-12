"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/chat/types";
import { getCrisisResources } from "@/lib/crisis/resources";
import { translations, type Locale } from "@/lib/i18n/translations";
import CrisisResourceLink from "./CrisisResourceLink";

interface CrisisHandoffCardProps {
  message: Message;
  isNew?: boolean;
}

export default function CrisisHandoffCard({
  message,
  isNew = false,
}: CrisisHandoffCardProps) {
  const locale: Locale = message.crisisLocale ?? "en";
  const t = translations[locale].crisis;
  const resources = getCrisisResources(locale);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isNew && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isNew]);

  return (
    <section
      ref={containerRef}
      tabIndex={isNew ? -1 : undefined}
      role={isNew ? "alert" : "region"}
      aria-labelledby="crisis-handoff-title"
      className="w-full rounded-lg border border-accent-rose/40 bg-accent-rose/10 p-5"
    >
      <p
        id="crisis-handoff-title"
        role="heading"
        aria-level={2}
        className="text-xs font-semibold uppercase tracking-widest text-accent-rose"
      >
        {t.eyebrow}
      </p>

      <p className="mt-3 text-sm font-medium leading-relaxed text-body-strong">
        {t.lead}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-body">{t.immediate}</p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted">
        {t.resourcesHeading}
      </p>
      <p className="mt-1 text-xs text-muted">{t.resourceHint}</p>

      <div className="mt-3 flex flex-col gap-2">
        {resources.map((resource) => (
          <CrisisResourceLink
            key={resource.id}
            resource={resource}
            locale={locale}
            roomId={message.roomId}
            messageId={message.id}
          />
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">{t.continueNote}</p>
      <p className="mt-2 text-xs text-muted-soft">{t.privacyNote}</p>
    </section>
  );
}
