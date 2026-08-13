import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// GET — list every folder on a task, plus how many assets are in each.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const folders = await db.taskFolder.findMany({
    where: { taskId },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { assets: true } } },
  });

  return NextResponse.json({ folders });
}

// POST — create a new folder within a task's own uploads. Owner or
// the task's assignee — the same people who can upload to this task
// can organize it into folders.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Give this folder a name" }, { status: 400 });
  }

  const existingCount = await db.taskFolder.count({ where: { taskId } });

  const folder = await db.taskFolder.create({
    data: {
      taskId,
      name: name.trim(),
      displayOrder: existingCount,
    },
  });

  return NextResponse.json({ folder });
}