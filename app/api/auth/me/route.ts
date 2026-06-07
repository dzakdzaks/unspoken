import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  return NextResponse.json({ user });
}
