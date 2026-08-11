import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// GET — owner or any collaborator can view.
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
    (await db.managedProjectCollaborator.findFirst({
      where: { managedProjectId: id, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ managedProject });
}

// PATCH — the brief, name, status, and delivery link are owner-only
// to edit. Collaborators can read (via GET above) but never write
// here — matches "editable by project owner/admin" from the brief
// spec.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (managedProject.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const nullableBriefFields = [
    "briefObjective",
    "briefBackground",
    "briefTargetAudience",
    "briefCreativeDirection",
    "briefDeliverables",
    "briefBrandGuidelines",
    "briefReferences",
    "briefRequiredFormats",
    "briefPlatforms",
    "briefImportantNotes",
  ] as const;

  // Typed as Prisma's real update input rather than a loose Record,
  // so the compiler actually verifies every assigned field belongs
  // on this model with a compatible type.
  const data: Prisma.ManagedProjectUncheckedUpdateInput = {};

  // name is required and non-nullable on the model — handled on its
  // own rather than folded into the loop below, since assigning null
  // to it (valid for every other field here) isn't a type Prisma
  // accepts for name specifically.
  if ("name" in body) {
    const value = typeof body.name === "string" ? body.name.trim() : "";
    if (!value) {
      return NextResponse.json({ error: "Project name can't be empty" }, { status: 400 });
    }
    data.name = value;
  }

  for (const field of nullableBriefFields) {
    if (field in body) {
      const value = typeof body[field] === "string" ? body[field].trim() : null;
      data[field] = value || null;
    }
  }

  if ("briefDeadline" in body) {
    if (!body.briefDeadline) {
      data.briefDeadline = null;
    } else {
      const parsed = new Date(body.briefDeadline);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid deadline date" }, { status: 400 });
      }
      data.briefDeadline = parsed;
    }
  }

  if ("briefVisibleToClient" in body && typeof body.briefVisibleToClient === "boolean") {
    data.briefVisibleToClient = body.briefVisibleToClient;
  }

  if ("status" in body) {
    if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  // deliveryProjectId is deliberately not editable here — every
  // managed project gets its delivery automatically at creation time
  // (see POST /api/managed-projects) and that link never changes
  // afterward, so there's no "link" or "unlink" action anymore.

  const updated = await db.managedProject.update({ where: { id }, data });
  return NextResponse.json({ managedProject: updated });
}