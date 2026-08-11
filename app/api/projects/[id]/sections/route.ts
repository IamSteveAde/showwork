import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — creates a new named section on a project (e.g. "Room Renders",
// "Logo Concepts"), tagged as either PHOTO or VIDEO. Files get uploaded
// into this section afterward via the normal presign/complete flow,
// passing the returned sectionId.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // A collaborator needs to be able to create their own section to
  // upload into (e.g. a videographer adding "B-Roll"), not just the
  // project owner.
  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { name, mediaType } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Give this section a name" }, { status: 400 });
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(mediaType)) {
    return NextResponse.json(
      { error: "mediaType must be PHOTO, VIDEO, DOCUMENT, or PDF" },
      { status: 400 }
    );
  }

  const existingCount = await db.mediaSection.count({ where: { projectId } });

  const section = await db.mediaSection.create({
    data: {
      projectId,
      name: name.trim(),
      mediaType,
      displayOrder: existingCount,
    },
  });

  return NextResponse.json({ section });
}