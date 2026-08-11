import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/resend";

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

  const alreadyExists = await db.creator.findUnique({ where: { email } });
  if (alreadyExists) {
    await db.pendingSignup.delete({ where: { email } });
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const now = new Date();
  const creator = await db.creator.create({
    data: {
      email: pending.email,
      name: pending.name,
      phone: pending.phone,
      companyName: pending.companyName,
      passwordHash: pending.passwordHash,
      // The anchor point the whole lifecycle email sequence counts
      // from — set right here at real account creation, not left for
      // the daily cron job to fill in later, so "day 1" and "day 2"
      // genuinely mean 1 and 2 days after this exact signup.
      lifecycleSequenceStartedAt: now,
    },
  });

  await db.pendingSignup.delete({ where: { email } });

  // Sent immediately rather than waiting for the next scheduled run —
  // best-effort: a failure here shouldn't block the actual signup
  // from succeeding. welcomeEmailSentAt intentionally isn't set here;
  // the daily lifecycle check sees it's still null and sends it again
  // as a safety net if this direct send ever fails.
  try {
    await sendWelcomeEmail({ to: creator.email, name: creator.name });
    await db.creator.update({ where: { id: creator.id }, data: { welcomeEmailSentAt: now } });
  } catch (err) {
    console.error("Failed to send welcome email at signup:", err);
  }

  const token = createSessionToken(creator.id);
  await setSessionCookie(token);

  return NextResponse.json({ id: creator.id, email: creator.email });
}