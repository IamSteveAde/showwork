import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { releaseContentWorkspaceStorageReservation } from "@/lib/contentWorkspaceUsage";

/** Releases only a pending receipt; never deletes shared/publishing media. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const creator = await getCurrentCreator();
  if (!creator)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
  if (
    !body ||
    typeof body.reservationId !== "string" ||
    typeof body.fileKey !== "string"
  )
    return NextResponse.json(
      { error: "Upload receipt required" },
      { status: 400 },
    );
  const prefix = `calendars/${id}/`;
  if (!body.fileKey.startsWith(prefix))
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const path = body.fileKey.slice(prefix.length);
  const permission = path.startsWith("business-documents/")
    ? "knowledge.manage"
    : /^banner-(desktop|mobile)\//.test(path)
      ? "delivery.manage"
      : "ADD_CONTENT";
  if (!(await hasCalendarPermission(creator.id, id, permission)))
    return NextResponse.json(
      { error: "You cannot cancel uploads in this workspace" },
      { status: 403 },
    );
  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    select: { managerId: true },
  });
  if (!calendar)
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  try {
    const result = await releaseContentWorkspaceStorageReservation(
      body.reservationId,
      calendar.managerId,
      id,
      body.fileKey,
    );
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({
      ok: true,
      alreadyReleased: result.alreadyReleased ?? false,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not release the upload reservation. Automatic expiry cleanup will retry.",
      },
      { status: 503 },
    );
  }
}
