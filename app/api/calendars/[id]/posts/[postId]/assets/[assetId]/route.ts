import { postContentEditError } from "@/lib/publishing/editGuard";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string; assetId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId, assetId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "calendar.edit"))) {
    return NextResponse.json({ error: "You don't have permission to modify content on this calendar" }, { status: 403 });
  }

  const editError = await postContentEditError(postId, id);
  if (editError) return NextResponse.json({ error: editError }, { status: 409 });

  const asset = await db.calendarPostAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.postId !== postId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.calendarPostAsset.delete({ where: { id: assetId } });
  return NextResponse.json({ ok: true });
}