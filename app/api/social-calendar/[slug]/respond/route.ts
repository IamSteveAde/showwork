import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyViewerToken } from "@/lib/auth";

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { slug } });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Confirms this specific visitor actually unlocked this specific
  // calendar with its real password — not just anyone who happens to
  // know the URL.
  const token = req.cookies.get(cookieNameFor(calendar.id))?.value;
  const viewer = token ? verifyViewerToken(token, calendar.id) : null;
  if (!viewer) {
    return NextResponse.json({ error: "Please unlock this calendar first" }, { status: 401 });
  }

  if (calendar.planStatus !== "AWAITING_APPROVAL") {
    return NextResponse.json({ error: "This plan isn't currently awaiting a response" }, { status: 400 });
  }

  const { action, note } = await req.json();

  if (action === "approve") {
    const updated = await db.socialCalendar.update({
      where: { id: calendar.id },
      data: { planStatus: "PLAN_APPROVED", planApprovedAt: new Date(), planApprovalNote: null },
    });
    return NextResponse.json({ calendar: updated });
  }

  if (action === "request_changes") {
    const updated = await db.socialCalendar.update({
      where: { id: calendar.id },
      data: { planStatus: "PLAN_NEEDS_CHANGES", planApprovalNote: note?.trim() || null },
    });
    return NextResponse.json({ calendar: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}