import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, type, caption, displayOrder, sectionId } = await req.json();

  if (!projectId || !fileKey || !type) {
    return NextResponse.json(
      { error: "projectId, fileKey, and type are required" },
      { status: 400 }
    );
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json(
      { error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" },
      { status: 400 }
    );
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Same fix as every other route in this chain — a collaborator
  // completing their own upload isn't the project owner.
  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // If a sectionId was passed, confirm it actually belongs to this
  // project before attaching — otherwise a file could get silently
  // tied to a section from a completely different project.
  if (sectionId) {
    const section = await db.mediaSection.findUnique({ where: { id: sectionId } });
    if (!section || section.projectId !== projectId) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

  const media = await db.media.create({
    data: {
      projectId,
      fileKey,
      type,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
      sectionId: sectionId ?? null,
      // The actual point of the collaboration feature — every file
      // now remembers exactly who uploaded it, whether that's the
      // project owner or a collaborator. This is what will let client
      // feedback get routed to the right specific person instead of
      // always going to the project owner.
      uploadedByCreatorId: creator.id,
    },
  });

  return NextResponse.json({ media });
}