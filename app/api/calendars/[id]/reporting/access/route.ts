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
  // Reporting is always available to clients who can unlock the workspace.
  return NextResponse.json({ enabled: true });
}
