import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// PATCH — two different levels of access on the same task:
//   - The assignee can move its status, and only its status. This is
//     the "collaborator updates their own end" behavior.
//   - The project owner can change anything: title, description,
//     reassignment, priority, due date, milestone, and status too.
// Anyone else (a different collaborator on the same project, say)
// gets a 404, same as every other ownership check in this app.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { managedProject: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  // Typed as Prisma's real update input, same fix already applied to
  // the ManagedProject routes — a loose Record<string, unknown>
  // doesn't get checked against the model's actual fields at all.
  const data: Prisma.TaskUncheckedUpdateInput = {};

  if ("status" in body) {
    if (!["TODO", "IN_PROGRESS", "DONE"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    // completedAt tracks the moment a task actually became DONE,
    // separate from updatedAt (which changes on any edit at all) —
    // set automatically here, never accepted directly from the client.
    data.completedAt = body.status === "DONE" ? new Date() : null;
  }

  // Everything below is owner-only — an assignee sending these
  // fields simply has them ignored rather than erroring, so a
  // same-request status+note update from an assignee doesn't fail
  // outright over fields they weren't allowed to touch.
  if (isOwner) {
    if (typeof body.title === "string") {
      if (!body.title.trim()) return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
      data.title = body.title.trim();
    }
    if ("description" in body) {
      data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
    }
    if (typeof body.assignedToCreatorId === "string") {
      const isValidAssignee =
        body.assignedToCreatorId === task.managedProject.creatorId ||
        (await db.managedProjectCollaborator.findFirst({
          where: { managedProjectId: task.managedProjectId, creatorId: body.assignedToCreatorId },
        })) !== null;
      if (!isValidAssignee) {
        return NextResponse.json({ error: "That person isn't on this project" }, { status: 400 });
      }
      data.assignedToCreatorId = body.assignedToCreatorId;
    }
    if (typeof body.priority === "string") {
      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      data.priority = body.priority;
    }
    if ("dueDate" in body) {
      if (!body.dueDate) {
        data.dueDate = null;
      } else {
        const parsed = new Date(body.dueDate);
        if (isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
        data.dueDate = parsed;
      }
    }
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ task: updated });
}

// DELETE — owner-only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.task.delete({ where: { id: taskId } });

  return NextResponse.json({ ok: true });
}