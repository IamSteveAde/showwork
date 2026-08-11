import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// DELETE: remove an active collaborator from the project — owner
// only. Their past uploads stay on the project (Media.uploadedByCreator
// uses onDelete: SetNull, not Cascade) — removing someone's access
// doesn't remove the work they already did.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, collaboratorId } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const collaborator = await db.projectCollaborator.findUnique({ where: { id: collaboratorId } });
  if (!collaborator || collaborator.projectId !== id) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  await db.projectCollaborator.delete({ where: { id: collaboratorId } });

  return NextResponse.json({ ok: true });
}