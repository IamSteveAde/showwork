import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const creator = await db.creator.findUnique({ where: { email } });

  // Deliberately the same response whether or not the account exists —
  // otherwise this endpoint could be used to check which emails have
  // Showwork accounts, which isn't something to leak.
  if (creator) {
    // Clear any previous unused reset links for this account — only the
    // newest one should ever work.
    await db.passwordResetToken.deleteMany({ where: { creatorId: creator.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db.passwordResetToken.create({
      data: {
        creatorId: creator.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    try {
      await sendPasswordResetEmail(
        creator.email,
        `${appUrl()}/reset-password?token=${token}`,
        creator.name
      );
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({
    message: "If an account exists for that email, we've sent a reset link.",
  });
}