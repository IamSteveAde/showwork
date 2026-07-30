import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";

// DELETE — removes a single portfolio file, including its actual R2
// storage object.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const media = await db.portfolioMedia.findUnique({
    where: { id: mediaId },
    include: { portfolio: { select: { creatorId: true } } },
  });
  if (!media || media.portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.portfolioMedia.delete({ where: { id: mediaId } });
  deleteObject(media.fileKey).catch((err) => console.error("Failed to delete R2 object:", err));

  return NextResponse.json({ ok: true });
}