import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

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

  if ("flyerImageUrl" in body) data.flyerImageUrl = body.flyerImageUrl?.trim() || null;
  if ("topic" in body) data.topic = body.topic?.trim();
  if ("guests" in body) data.guests = body.guests?.trim() || null;
  if ("startsAt" in body) data.startsAt = new Date(body.startsAt);
  if ("venue" in body) data.venue = body.venue?.trim() || null;
  if ("applyUrl" in body) data.applyUrl = body.applyUrl?.trim() || null;
  if ("replayUrl" in body) data.replayUrl = body.replayUrl?.trim() || null;

  const webinar = await db.creativoWebinar.update({ where: { id }, data });
  return NextResponse.json({ webinar });
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
  await db.creativoWebinar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}