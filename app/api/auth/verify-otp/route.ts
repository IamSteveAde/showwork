import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

// Step 2 of signup: confirms the code, then actually creates the
// Creator row from whatever was held in PendingSignup.
export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const pending = await db.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json(
      { error: "No signup in progress for this email. Please sign up again." },
      { status: 404 }
    );
  }

  if (pending.otpExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please request a new one." },
      { status: 400 }
    );
  }

  if (pending.otpCode !== code.trim()) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  // Guard against a race where the email got taken between signup
  // start and now (e.g. two tabs, or a slow verify).
  const alreadyExists = await db.creator.findUnique({ where: { email } });
  if (alreadyExists) {
    await db.pendingSignup.delete({ where: { email } });
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const creator = await db.creator.create({
    data: {
      email: pending.email,
      name: pending.name,
      passwordHash: pending.passwordHash,
    },
  });

  await db.pendingSignup.delete({ where: { email } });

  const token = createSessionToken(creator.id);
  await setSessionCookie(token);

  return NextResponse.json({ id: creator.id, email: creator.email });
}