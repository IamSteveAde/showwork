import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// GET — list every folder in a section, plus how many files are in
// each (useful for the picker UI, so someone can see at a glance
// which folder already has work in it).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.mediaSection.findUnique({
    where: { id: sectionId },
    include: { project: { select: { creatorId: true, id: true } } },
  });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const isOwner = section.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: section.project.id, creatorId: creator.id },
    })) !== null;
  if (!isOwner && !isCollaborator) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const folders = await db.folder.findMany({
    where: { sectionId },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { media: true } } },
  });

  return NextResponse.json({ folders });
}

// POST — create a new folder within a section. Owner or collaborator
// — the same people who can upload to a section can organize it into
// folders, since folders are just structure around their own work.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.mediaSection.findUnique({
    where: { id: sectionId },
    include: { project: { select: { creatorId: true, id: true } } },
  });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const isOwner = section.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: section.project.id, creatorId: creator.id },
    })) !== null;
  if (!isOwner && !isCollaborator) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Give this folder a name" }, { status: 400 });
  }

  const existingCount = await db.folder.count({ where: { sectionId } });

  const folder = await db.folder.create({
    data: {
      sectionId,
      name: name.trim(),
      displayOrder: existingCount,
    },
  });

  return NextResponse.json({ folder });
}