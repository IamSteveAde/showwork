import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// GET: fetch one project (only the owning creator can see it, including
// unpublished/unpaid state)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { media: { orderBy: { displayOrder: "asc" } } },
  });

  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PATCH: update branding / settings, plus the client-facing name and
// access code. Deliberately does NOT touch the project's slug (its
// public URL) — renaming a project or changing its access code should
// never silently break a link already shared with a client.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "clientName",
    "accessCode",
    "captureViewerEmail",
    "logoUrl",
    "primaryColor",
    "bgColor",
    "heroMediaId",
    "heroTagline",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  // clientName and accessCode both need real content — an empty
  // string would leave the delivery displaying a blank title, or
  // worse, a blank access code a client could unlock with nothing.
  if ("clientName" in data && (typeof data.clientName !== "string" || data.clientName.trim().length === 0)) {
    return NextResponse.json({ error: "Project name can't be empty" }, { status: 400 });
  }
  if ("accessCode" in data && (typeof data.accessCode !== "string" || data.accessCode.trim().length === 0)) {
    return NextResponse.json({ error: "Access code can't be empty" }, { status: 400 });
  }
  if (typeof data.clientName === "string") data.clientName = data.clientName.trim();
  if (typeof data.accessCode === "string") data.accessCode = data.accessCode.trim();

  // deliveryStatus is an enum, not free-form — validated explicitly
  // rather than passed through blindly like the fields above, since an
  // invalid value here would break both the creator and client status
  // displays, which are meant to always stay in sync.
  if ("deliveryStatus" in body) {
    if (!["DELIVERED", "APPROVED", "PAID"].includes(body.deliveryStatus)) {
      return NextResponse.json(
        { error: "deliveryStatus must be DELIVERED, APPROVED, or PAID" },
        { status: 400 }
      );
    }
    data.deliveryStatus = body.deliveryStatus;
  }

  const updated = await db.project.update({ where: { id }, data });
  return NextResponse.json({ project: updated });
}

// DELETE: permanently removes the project — via cascade, every Media,
// ViewerEmail, and MediaSection row tied to it goes too. Only the
// owning creator can do this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft delete — hides it from every view, but keeps the row so it
  // still counts against the cycle it was created in. Prevents a
  // create-then-delete loop from bypassing the tier limit for free.
  await db.project.update({ where: { id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ ok: true });
}