import type { Locale } from "@/lib/i18n/translations";

/**
 * FR-27/28: prefer the message language when it differs from the room locale.
 */
export function resolveCrisisLocale(
  _input: string,
  roomLocale: Locale,
  detectedLocale: Locale,
): Locale {
  if (detectedLocale !== roomLocale) {
    return detectedLocale;
  }
  return roomLocale;
}
