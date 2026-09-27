import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { getSocialInbox } from "@/lib/socialInbox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "VIEW_ONLY"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canAccessCalendarById(id))) return NextResponse.json({ error: "This workspace isn’t active." }, { status: 403 });
  try { return NextResponse.json(await getSocialInbox(id, req.nextUrl.searchParams)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the inbox." }, { status: 400 }); }
}
