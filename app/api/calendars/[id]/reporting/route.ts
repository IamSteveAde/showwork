import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { canAccessCalendarById } from "@/lib/calendarPermissions";
import { getCalendarReportingData } from "@/lib/reporting/data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "analytics.view"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Saved reporting stays readable after expiry; premium actions are separately gated.
  try {
    return NextResponse.json(await getCalendarReportingData(id, req.nextUrl.searchParams, true, await hasCalendarPermission(creator.id, id, "leads.view")));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load reporting." }, { status: 400 });
  }
}
