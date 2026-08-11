import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import { sendTaskAssignedEmail } from "@/lib/resend";

// GET — owner or any collaborator can see the full task list.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = managedProject.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.managedProjectCollaborator.findFirst({ where: { managedProjectId: id, creatorId: creator.id } })) !== null;
  if (!isOwner && !isCollaborator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await db.task.findMany({
    where: { managedProjectId: id },
    orderBy: { createdAt: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      linkedAssets: {
        select: {
          id: true,
          filename: true,
          fileKey: true,
          type: true,
          internalReviewStatus: true,
          internalReviewNote: true,
          promotedToMediaId: true,
          uploadedByCreatorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const tasksWithUrls = tasks.map((task) => ({
    ...task,
    linkedAssets: task.linkedAssets.map((asset) => ({ ...asset, url: publicUrlFor(asset.fileKey) })),
  }));

  return NextResponse.json({ tasks: tasksWithUrls });
}

// POST — create a task. Owner-only to create (matches "assigned by"
// being meaningfully distinct from "assigned to" — collaborators
// receive tasks, they don't create their own on this project).
// Can be assigned to the owner themself or to any existing
// collaborator — never to someone not yet on the project.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, description, assignedToCreatorId, priority, dueDate, milestoneId } = await req.json();

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Give this task a title" }, { status: 400 });
  }
  if (typeof assignedToCreatorId !== "string" || !assignedToCreatorId) {
    return NextResponse.json({ error: "This task needs to be assigned to someone" }, { status: 400 });
  }

  // The assignee must be the owner themself or an existing
  // collaborator on this exact project — never an arbitrary account.
  const isValidAssignee =
    assignedToCreatorId === creator.id ||
    (await db.managedProjectCollaborator.findFirst({
      where: { managedProjectId: id, creatorId: assignedToCreatorId },
    })) !== null;
  if (!isValidAssignee) {
    return NextResponse.json({ error: "That person isn't on this project" }, { status: 400 });
  }

  if (priority && !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  let parsedDueDate: Date | null = null;
  if (dueDate) {
    parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
  }

  if (milestoneId) {
    const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.managedProjectId !== id) {
      return NextResponse.json({ error: "Invalid milestone" }, { status: 400 });
    }
  }

  const task = await db.task.create({
    data: {
      managedProjectId: id,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      assignedToCreatorId,
      createdByCreatorId: creator.id,
      priority: priority || "MEDIUM",
      dueDate: parsedDueDate,
      milestoneId: milestoneId || null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify the assignee — unless they assigned this to themself, in
  // which case there's nothing to tell them they don't already know.
  // Without this, a collaborator had no way to find out a task even
  // existed for them, which is exactly why work kept ending up back
  // with the project owner instead.
  if (task.assignedToCreatorId !== creator.id) {
    try {
      await sendTaskAssignedEmail({
        to: task.assignedTo.email,
        assignedByName: creator.name || creator.email,
        taskTitle: task.title,
        projectName: managedProject.name,
        projectUrl: `${appUrl()}/dashboard/managed/${id}`,
      });
    } catch (err) {
      console.error("Failed to send task-assigned email:", err);
    }
  }

  return NextResponse.json({ task });
}