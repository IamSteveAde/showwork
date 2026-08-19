import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// GET — the current label, for pre-filling the admin form.
export async function GET() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ creativoMemberCountLabel: settings?.creativoMemberCountLabel ?? null });
}

// POST — sets the rough member count shown on the Creativo landing
// page (e.g. "50+ members"). Deliberately free text, not a number —
// this is a hand-typed approximation, never a live query.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { creativoMemberCountLabel } = await req.json();
  if (typeof creativoMemberCountLabel !== "string") {
    return NextResponse.json({ error: "creativoMemberCountLabel must be a string" }, { status: 400 });
  }

  await db.platformSettings.upsert({
    where: { id: "singleton" },
    update: { creativoMemberCountLabel: creativoMemberCountLabel.trim() || null },
    create: { id: "singleton", creativoMemberCountLabel: creativoMemberCountLabel.trim() || null },
  });

  return NextResponse.json({ ok: true });
}