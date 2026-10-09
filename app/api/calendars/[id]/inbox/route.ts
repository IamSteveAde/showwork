import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { normalizeReplyProfile } from "@/lib/socialMessaging/replyProfile";
import { getSocialInbox } from "@/lib/socialInbox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "inbox.view"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Keep saved conversations readable; writes and syncs require Social Inbox access.
  try {
    const inbox = await getSocialInbox(id, req.nextUrl.searchParams);
    if (!(await hasCalendarPermission(creator.id, id, "workspace.manage"))) {
      inbox.settings = { ...inbox.settings, aiAutoReplyInstructions: null, aiReplyProfile: normalizeReplyProfile({ tone: inbox.settings.aiReplyProfile.tone }) };
    }
    return NextResponse.json(inbox, { headers: { "Cache-Control": "no-store, private" } });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the inbox." }, { status: 400 }); }
}
