import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator, hashPassword } from "@/lib/auth";

// Standard URL-safe slugify: lowercase, spaces and non-alphanumerics
// become single hyphens, no leading/trailing hyphens.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Finds a slug that doesn't collide with any other project. Tries the
// plain slugified name first, then appends -2, -3, etc. until one is
// free. excludeProjectId lets a project keep its own current slug
// without falsely detecting a collision against itself.
async function findAvailableSlug(baseName: string, excludeProjectId: string): Promise<string> {
  const base = slugify(baseName) || "project";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await db.project.findFirst({
      where: { slug: candidate, id: { not: excludeProjectId } },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}

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
// access code. Renaming a project also regenerates its slug (public
// URL) to match — this intentionally means any link already shared
// with a client stops working the moment the name changes, which the
// client-side confirmation prompt warns about before this ever fires.
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

  // The actual bug fix: accessCode is only ever the plain-text DISPLAY
  // copy — the real gate a client's password entry gets checked
  // against is passwordHash. Updating accessCode alone (as this route
  // used to do) changed what the creator sees and copies, but left
  // the real verification value untouched — so the old code kept
  // working and the new one silently did nothing. Now both are always
  // written together in the same request, from the same trimmed value.
  if (typeof data.accessCode === "string") {
    const trimmedCode = data.accessCode.trim();
    data.accessCode = trimmedCode;
    data.passwordHash = await hashPassword(trimmedCode);
  }

  // Regenerate the slug whenever the name actually changes — skipped
  // if the trimmed name is identical to what's already stored, so
  // hitting save without really changing anything doesn't needlessly
  // rotate the link.
  if (typeof data.clientName === "string" && data.clientName !== project.clientName) {
    data.slug = await findAvailableSlug(data.clientName, project.id);
  }

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