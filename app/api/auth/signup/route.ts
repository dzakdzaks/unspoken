import { NextRequest, NextResponse } from "next/server";
import { SignUpRequestSchema } from "@/lib/schema";
import { hashPassword } from "@/lib/auth/password";
import { createUser } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SignUpRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.message ?? "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash });

  if (!user) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
}
