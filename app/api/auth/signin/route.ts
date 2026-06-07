import { NextRequest, NextResponse } from "next/server";
import { SignInRequestSchema } from "@/lib/schema";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth/session";

const INVALID = "Invalid email or password.";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SignInRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const { email, password } = parsed.data;
  const userDoc = await findUserByEmail(email);
  if (!userDoc) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const valid = await verifyPassword(password, userDoc.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const token = await createSessionToken(userDoc.id);
  const user = { id: userDoc.id, name: userDoc.name, email: userDoc.email };
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
}
