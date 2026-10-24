import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "inbox.view"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const count = await db.socialLeadConversation.count({ where: { calendarId: id, aiPausedAt: { not: null }, aiHandoffAcknowledgedAt: null } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store, private" } });
}
