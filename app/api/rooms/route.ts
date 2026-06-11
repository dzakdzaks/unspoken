import { NextRequest, NextResponse } from "next/server";
import { CreateRoomRequestSchema } from "@/lib/schema";
import { getUserId } from "@/lib/api/auth";
import { createRoom, listRooms } from "@/lib/db/repository";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  try {
    const rooms = await listRooms(userId);
    return NextResponse.json({ rooms });
  } catch {
    return NextResponse.json({ error: "Failed to load rooms." }, { status: 500 });
  }
}

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

  const parsed = CreateRoomRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const room = await createRoom(
      userId,
      parsed.data.title ?? "New chat",
      parsed.data.lang
    );
    return NextResponse.json({ room }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create room." }, { status: 500 });
  }
}
