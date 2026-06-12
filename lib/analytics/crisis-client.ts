import type { CrisisResourceTapParams } from "./crisis";

export async function trackCrisisResourceTapClient(
  params: CrisisResourceTapParams,
): Promise<void> {
  try {
    await fetch("/api/events/crisis-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // Analytics must not block navigation to crisis resources.
  }
}
