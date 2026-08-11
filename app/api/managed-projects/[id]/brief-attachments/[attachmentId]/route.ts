import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";

// DELETE — owner-only, same as adding one.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachment = await db.briefAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.managedProjectId !== id) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await db.briefAttachment.delete({ where: { id: attachmentId } });
  deleteObject(attachment.fileKey).catch((err) => console.error("Failed to delete brief attachment from R2:", err));

  return NextResponse.json({ ok: true });
}