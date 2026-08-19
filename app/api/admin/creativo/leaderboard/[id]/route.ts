import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

const CATEGORIES = ["Photography", "Videography", "Motion", "Editing"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("name" in body) data.name = body.name?.trim();
  if ("profileImageUrl" in body) data.profileImageUrl = body.profileImageUrl?.trim() || null;
  if ("category" in body) {
    if (!CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = body.category;
  }
  if ("whatTheyDo" in body) data.whatTheyDo = body.whatTheyDo?.trim() || null;
  if ("contact" in body) data.contact = body.contact?.trim() || null;
  if ("portfolioUrl" in body) data.portfolioUrl = body.portfolioUrl?.trim() || null;
  if ("whatsappNumber" in body) {
    data.whatsappNumber = body.whatsappNumber ? body.whatsappNumber.replace(/[^0-9]/g, "") || null : null;
  }
  if ("wonFor" in body) data.wonFor = body.wonFor?.trim();
  if ("points" in body) data.points = typeof body.points === "number" ? body.points : 0;
  if ("periodDate" in body) {
    const submitted = new Date(body.periodDate);
    data.periodDate = new Date(Date.UTC(submitted.getUTCFullYear(), submitted.getUTCMonth(), 1));
  }

  const entry = await db.creativoLeaderboardEntry.update({ where: { id }, data });
  return NextResponse.json({ entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.creativoLeaderboardEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}