import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidNigerianPhone } from "@/lib/phone";
import bcrypt from "bcryptjs";

// PATCH — update name, phone, or the notification preference. Each
// field is only touched if it's actually present in the request body,
// so this doubles as a general-purpose partial profile update.
export async function PATCH(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, notifyOnView, companyName } = await req.json();

  const data: { name?: string; phone?: string; notifyOnView?: boolean; companyName?: string | null } = {};

  if (typeof name === "string") {
    if (!name.trim()) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    data.name = name.trim();
  }
  if (typeof phone === "string") {
    if (!isValidNigerianPhone(phone)) {
      return NextResponse.json({ error: "Enter a valid Nigerian phone number, e.g. +2348012345678" }, { status: 400 });
    }
    data.phone = phone;
  }
  if (typeof notifyOnView === "boolean") {
    data.notifyOnView = notifyOnView;
  }
  // Genuinely optional — an empty string just clears it back to null
  // rather than being rejected, unlike name/phone above.
  if (typeof companyName === "string") {
    data.companyName = companyName.trim() || null;
  }

  const updated = await db.creator.update({ where: { id: creator.id }, data });
  return NextResponse.json({ creator: updated });
}

// DELETE — permanently deletes this creator's own account, and via
// cascade, every project/media/payment record they have. Requires
// re-entering their password as confirmation — this can't be undone.
export async function DELETE(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Enter your password to confirm" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, creator.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  await db.creator.delete({ where: { id: creator.id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("spotlite_session");
  return res;
}