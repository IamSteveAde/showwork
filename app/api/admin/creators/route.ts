import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// POST — admin creates a creator account directly, already "verified"
// (no OTP step, since the admin is vouching for this account existing).
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, name, password } = await req.json();
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const existing = await db.creator.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const creator = await db.creator.create({
    data: { email, name: name || null, passwordHash },
  });

  return NextResponse.json({ creator });
}