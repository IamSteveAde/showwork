import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Current password and a new password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, creator.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.creator.update({ where: { id: creator.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}