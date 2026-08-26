import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  console.log("[LOGIN DEBUG] attempting login for email:", JSON.stringify(email));
  const creator = await db.creator.findUnique({ where: { email } });
  console.log("[LOGIN DEBUG] creator found?", !!creator, creator ? `(id: ${creator.id})` : "");
  if (!creator) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const valid = await verifyPassword(password, creator.passwordHash);
  console.log("[LOGIN DEBUG] password valid?", valid);
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
  await setSessionCookie(token);

  return NextResponse.json({ id: creator.id, email: creator.email });
}