import { NextRequest, NextResponse } from "next/server";
import { RenameRoomRequestSchema } from "@/lib/schema";
import { getUserId } from "@/lib/api/auth";
import { deleteRoom, renameRoom } from "@/lib/db/repository";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RenameRoomRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const room = await renameRoom(userId, id, parsed.data.title);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Failed to update room." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ok = await deleteRoom(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete room." }, { status: 500 });
  }
}
