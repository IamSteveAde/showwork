import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: calendarId } = await params;
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: { managerId: true },
  });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be true or false." }, { status: 400 });
  }
  const now = new Date();
  const permission = await db.calendarReportingPermission.upsert({
    where: { calendarId },
    create: {
      calendarId,
      enabled: body.enabled,
      grantedById: body.enabled ? creator.id : null,
      grantedAt: body.enabled ? now : null,
      revokedAt: body.enabled ? null : now,
    },
    update: {
      enabled: body.enabled,
      grantedById: body.enabled ? creator.id : undefined,
      grantedAt: body.enabled ? now : undefined,
      revokedAt: body.enabled ? null : now,
    },
  });
  return NextResponse.json({
    enabled: permission.enabled,
    grantedAt: permission.grantedAt?.toISOString() ?? null,
    revokedAt: permission.revokedAt?.toISOString() ?? null,
  });
}
