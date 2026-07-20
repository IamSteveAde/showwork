import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendOtpEmail, generateOtpCode } from "@/lib/resend";
import { isValidNigerianPhone } from "@/lib/phone";

// Step 1 of signup: validate details, generate a code, email it, and
// hold everything in PendingSignup. No Creator row exists yet — that
// only happens once the code is confirmed in /api/auth/verify-otp.
export async function POST(req: NextRequest) {
  const { email, password, name, phone } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  if (!phone || !isValidNigerianPhone(phone)) {
    return NextResponse.json(
      { error: "Enter a valid Nigerian phone number, e.g. +2348012345678" },
      { status: 400 }
    );
  }

  const existingCreator = await db.creator.findUnique({ where: { email } });
  if (existingCreator) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // upsert: if they already started signing up (e.g. didn't finish
  // verifying last time), this just refreshes their code instead of
  // erroring on the unique email constraint.
  await db.pendingSignup.upsert({
    where: { email },
    update: { name, phone, passwordHash, otpCode, otpExpiresAt },
    create: { email, name, phone, passwordHash, otpCode, otpExpiresAt },
  });

  try {
    await sendOtpEmail(email, otpCode, name);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json(
      { error: "Couldn't send the verification email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ email });
}