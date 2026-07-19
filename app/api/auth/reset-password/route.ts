import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "A valid token and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await db.creator.update({
    where: { id: resetToken.creatorId },
    data: { passwordHash },
  });

  // Single-use — and clear any other pending reset tokens for this
  // account too, since a successful reset makes them all moot.
  await db.passwordResetToken.deleteMany({ where: { creatorId: resetToken.creatorId } });

  return NextResponse.json({ ok: true });
}