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
  if (!(await hasCalendarPermission(creator.id, id, "VIEW_ONLY"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(await canAccessCalendarById(id))) {
    return NextResponse.json({ error: "This workspace isn’t active." }, { status: 403 });
  }
  try {
    return NextResponse.json(await getCalendarReportingData(id, req.nextUrl.searchParams, true));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load reporting." }, { status: 400 });
  }
}
