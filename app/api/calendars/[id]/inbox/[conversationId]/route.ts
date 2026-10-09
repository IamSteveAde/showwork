import { calendarFeatureGate } from "@/lib/calendarPermissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { SOCIAL_LEAD_STATUSES } from "@/lib/socialInbox";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: calendarId, conversationId } = await params;
  if (!(await hasCalendarPermission(creator.id, calendarId, "inbox.reply"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const featureLock = await calendarFeatureGate(calendarId, "socialInbox");
  if (featureLock) return featureLock;

  const body = await req.json().catch(() => null) as { leadStatus?: unknown; markRead?: unknown } | null;
  if (body?.markRead === true) {
    const updated = await db.socialLeadConversation.updateMany({ where: { id: conversationId, calendarId }, data: { unreadCount: 0 } });
    if (!updated.count) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.leadStatus !== "string" || !SOCIAL_LEAD_STATUSES.includes(body.leadStatus as (typeof SOCIAL_LEAD_STATUSES)[number])) {
    return NextResponse.json({ error: "Choose a valid lead status." }, { status: 400 });
  }
  if (!(await hasCalendarPermission(creator.id, calendarId, "leads.manage"))) return NextResponse.json({ error: "You do not have permission to manage leads." }, { status: 403 });
  const updated = await db.socialLeadConversation.updateMany({ where: { id: conversationId, calendarId }, data: { leadStatus: body.leadStatus as (typeof SOCIAL_LEAD_STATUSES)[number] } });
  if (!updated.count) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  await db.calendarLead.updateMany({
    where: { calendarId, socialConversationId: conversationId },
    data: { status: body.leadStatus === "NOT_A_LEAD" ? "LOST" : body.leadStatus as "NEW" | "CONTACTED" | "QUALIFIED" | "CUSTOMER" },
  });
  return NextResponse.json({ ok: true });
}
