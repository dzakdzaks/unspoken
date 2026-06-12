import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/api/auth";
import { trackCrisisResourceTap } from "@/lib/analytics/crisis";
import { langfuseSpanProcessor } from "@/instrumentation";

const CrisisTapSchema = z.object({
  resourceId: z.string().min(1).max(80),
  locale: z.enum(["en", "id"]),
  roomId: z.string().min(1).max(80),
  messageId: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CrisisTapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  trackCrisisResourceTap(parsed.data);
  await langfuseSpanProcessor.forceFlush();

  return NextResponse.json({ ok: true });
}
