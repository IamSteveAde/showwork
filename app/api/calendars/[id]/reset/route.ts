import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { managerId: true } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  if (calendar.managerId !== creator.id) return NextResponse.json({ error: "Only the workspace owner can reset this calendar." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.confirmation !== "RESET") return NextResponse.json({ error: "Confirm the reset by typing RESET." }, { status: 400 });

  try {
    const result = await db.$transaction(async (tx) => {
      const publishing = await tx.calendarPost.count({ where: { calendarId: id, OR: [
        { instagramPublishStatus: "PUBLISHING" }, { tikTokPublishStatus: "PUBLISHING" }, { publishStatus: "PUBLISHING" },
      ] } });
      if (publishing) return null;
      const assets = await tx.calendarPostAsset.findMany({ where: { post: { calendarId: id } }, select: { fileKey: true } });
      const deleted = await tx.calendarPost.deleteMany({ where: { calendarId: id } });
      await tx.calendarImport.deleteMany({ where: { calendarId: id } });
      await tx.socialCalendar.update({ where: { id }, data: {
        planStatus: "BUILDING", planSubmittedAt: null, planApprovedAt: null, planApprovalNote: null,
      } });
      return { assets, deletedCount: deleted.count };
    }, { isolationLevel: "Serializable" });
    if (!result) return NextResponse.json({ error: "A post is currently publishing. Wait for publishing to finish, then try again." }, { status: 409 });
    // Delete files only after the database reset commits successfully.
    for (const asset of result.assets) {
      try { await deleteObject(asset.fileKey); }
      catch (error) { console.error("Failed to clean up reset calendar asset", error); }
    }
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Calendar reset failed", error);
    return NextResponse.json({ error: "The calendar could not be reset. Please try again." }, { status: 500 });
  }
}
