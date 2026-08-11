import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// DELETE — remove a collaborator. Owner-only. Tasks already assigned
// to them are left untouched (they keep whatever tasks they had, just
// lose the ability to see/update them going forward) — no cascade
// reassignment attempted here, since guessing who should inherit an
// orphaned task isn't a safe default.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, collaboratorId } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collaborator = await db.managedProjectCollaborator.findUnique({ where: { id: collaboratorId } });
  if (!collaborator || collaborator.managedProjectId !== id) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  await db.managedProjectCollaborator.delete({ where: { id: collaboratorId } });

  return NextResponse.json({ ok: true });
}