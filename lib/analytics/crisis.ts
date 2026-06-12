import { startObservation } from "@langfuse/tracing";
import type { Locale } from "@/lib/i18n/translations";

export interface CrisisResourceTapParams {
  resourceId: string;
  locale: Locale;
  roomId: string;
  messageId: string;
}

export function trackCrisisResourceTap(params: CrisisResourceTapParams): void {
  startObservation(
    "crisis-resource-tap",
    {
      input: params,
      metadata: {
        resourceId: params.resourceId,
        locale: params.locale,
        roomId: params.roomId,
        messageId: params.messageId,
      },
    },
    { asType: "event" },
  ).end();
}
