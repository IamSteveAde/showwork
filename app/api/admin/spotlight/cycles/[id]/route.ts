import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.spotlightCycle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("monthLabel" in body) data.monthLabel = body.monthLabel?.trim();
  if ("submissionOpensAt" in body) data.submissionOpensAt = new Date(body.submissionOpensAt);
  if ("submissionDeadline" in body) data.submissionDeadline = new Date(body.submissionDeadline);
  if ("heroImageUrl" in body) data.heroImageUrl = body.heroImageUrl?.trim() || null;
  if ("heroHeadline" in body) data.heroHeadline = body.heroHeadline?.trim() || null;
  if ("heroDescription" in body) data.heroDescription = body.heroDescription?.trim() || null;

  const cycle = await db.$transaction(async (tx) => {
    // Activating this cycle deactivates every other one first, in
    // the same transaction — never a moment where two cycles are
    // simultaneously accepting submissions.
    if ("isActive" in body && body.isActive) {
      await tx.spotlightCycle.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }
    if ("isActive" in body) data.isActive = !!body.isActive;
    return tx.spotlightCycle.update({ where: { id }, data });
  });

  return NextResponse.json({ cycle });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.spotlightCycle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}