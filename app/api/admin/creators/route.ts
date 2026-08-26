import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendAccountRecoveryEmail } from "@/lib/resend";

// POST — admin creates a creator account directly, already "verified"
// (no OTP step, since the admin is vouching for this account existing).
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, name, phone, password } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  // Password is optional now. If one is actually provided, it still
  // needs to meet the minimum length — but leaving it blank is a
  // valid, deliberate choice: the account gets an unguessable random
  // password instead, and the person sets their own real one via the
  // recovery email below.
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters, or left blank" }, { status: 400 });
  }

  const existing = await db.creator.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = password
    ? await hashPassword(password)
    : await hashPassword(randomUUID() + randomUUID());

  const creator = await db.creator.create({
    data: { email, name: name || null, phone: phone || null, passwordHash },
  });

  // Sent regardless of whether a password was typed in here — every
  // newly created account, however it was made, gets the same
  // "here's how to get in" email pointing them to Forgot Password.
  try {
    await sendAccountRecoveryEmail({ to: creator.email });
  } catch (err) {
    console.error(`Failed to send recovery email to ${creator.email}:`, err);
  }

  return NextResponse.json({ creator });
}