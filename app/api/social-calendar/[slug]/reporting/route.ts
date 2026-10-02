import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyViewerToken } from "@/lib/auth";
import { getCalendarReportingData } from "@/lib/reporting/data";
import { canAccessCalendar } from "@/lib/calendarPermissions";

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const calendar = await db.socialCalendar.findUnique({
    where: { slug },
    select: {
      id: true,
      manager: {
        select: {
          id: true,
          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          contentWorkspaceBillingCycle: true,
          contentWorkspaceTrialEndsAt: true,
          isComped: true,
          compedUntil: true,
        },
      },
    },
  });
  if (!calendar) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const token = req.cookies.get(cookieNameFor(calendar.id))?.value;
  if (!token || !verifyViewerToken(token, calendar.id)) {
    return NextResponse.json({ error: "Please unlock this workspace first." }, { status: 401 });
  }
  if (!canAccessCalendar(calendar.manager)) {
    return NextResponse.json({ error: "This workspace isn’t active." }, { status: 403 });
  }
  try {
    return NextResponse.json(await getCalendarReportingData(calendar.id, req.nextUrl.searchParams, false));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load reporting." }, { status: 400 });
  }
}
