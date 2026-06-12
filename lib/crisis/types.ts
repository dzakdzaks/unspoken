import type { Locale } from "@/lib/i18n/translations";

export interface CrisisResource {
  id: string;
  name: string;
  subtitle: string;
  tel?: string;
  url?: string;
}

export type CrisisLocale = Locale;
