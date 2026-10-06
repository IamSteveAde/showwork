import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { email, password } = body ?? {};
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  let creator;
  try {
    creator = await db.creator.findUnique({ where: { email } });
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error("Login database lookup failed", { code });
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code ?? "")) {
      return NextResponse.json({ error: "Login is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Retry-After": "10" } });
    }
    return NextResponse.json({ error: "Unable to sign in right now. Please try again." }, { status: 500 });
  }
  if (!creator) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const valid = await verifyPassword(password, creator.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Records this as their most recent session — the basis for the
  // admin activity page tracking how often each creator actually uses
  // the platform. Best-effort: if this write somehow fails, it should
  // never block the person from actually logging in.
  try {
    await db.creator.update({
      where: { id: creator.id },
      data: { lastLoginAt: new Date() },
    });
  } catch (err) {
    console.error("Failed to record lastLoginAt:", err);
  }

   const token = createSessionToken(creator.id);
  const response = NextResponse.json({ id: creator.id, email: creator.email });
  setSessionCookie(response, token);

  return response;
}
