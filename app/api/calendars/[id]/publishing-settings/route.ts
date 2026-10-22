import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "calendar.view"))) return NextResponse.json({ error: "You cannot access this workspace." }, { status: 403 });
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { autoPublishEnabled: true } });
  if (!calendar) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  return NextResponse.json(calendar, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(request: NextRequest, { params }: Context) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "publishing.manage"))) return NextResponse.json({ error: "You cannot change publishing settings." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.autoPublishEnabled !== "boolean") return NextResponse.json({ error: "Choose whether auto-publishing is on or off." }, { status: 400 });
  const result = await db.socialCalendar.updateMany({ where: { id }, data: { autoPublishEnabled: body.autoPublishEnabled } });
  if (!result.count) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  return NextResponse.json({ autoPublishEnabled: body.autoPublishEnabled });
}
