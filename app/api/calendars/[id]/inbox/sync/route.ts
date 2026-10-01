import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { syncSocialInboxes } from "@/lib/socialMessaging/x";

export const maxDuration = 60;
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) return NextResponse.json({ error: "You don't have permission to sync this inbox." }, { status: 403 });
  if (!(await canAccessCalendarById(id))) return NextResponse.json({ error: "This workspace isn't active." }, { status: 403 });
  const participantUsername = new URL(req.url).searchParams.get("username")?.trim().replace(/^@/, "");
  if (participantUsername && !/^[A-Za-z0-9_]{1,15}$/.test(participantUsername)) return NextResponse.json({ error: "Enter a valid X sender username." }, { status: 400 });
  try {
    // Runs locally as well as on Netlify. Limit the interactive request; the
    // background cron handles larger histories. Never enables AI replies.
    const summary = await syncSocialInboxes(id, { fullHistory: true, maxPages: 2, pageSize: 25, ...(participantUsername ? { participantUsername } : {}) });
    if (!summary.checked) return NextResponse.json({ error: "Connect an X account in Channels before syncing messages." }, { status: 409 });
    return NextResponse.json(summary, { status: summary.errors.length && !summary.synced ? 502 : 200 });
  } catch {
    return NextResponse.json({ error: "Could not sync X messages. Check database connectivity and try again." }, { status: 503 });
  }
}
