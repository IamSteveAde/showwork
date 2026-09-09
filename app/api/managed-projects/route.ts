import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { getCreatorUsage } from "@/lib/subscriptionUsage";

// Standard URL-safe slugify — same approach used when renaming a
// delivery project elsewhere in the app.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findAvailableSlug(baseName: string): Promise<string> {
  const base = slugify(baseName) || "project";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await db.project.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}

// A short, easy-to-read access code — not a security-critical secret
// (same reasoning as every other project access code in this app),
// just needs to be simple enough for a client to type in.
function generateAccessCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// POST — creates a new managed project AND its own delivery project
// in the same step. The delivery is what actually gives this managed
// project a real client portal link from day one — before publish,
// that link shows task/progress status; once the owner publishes,
// the same link switches to showing finished files. There's no
// separate "link to an existing delivery" step anymore — every
// managed project owns exactly one delivery, created here.
//
// Since this always creates a real delivery Project row alongside
// the managed project, it's blocked by the exact same tier-limit
// check as app/api/projects/route.ts — without this, a managed
// project was a second, uncounted way to create deliveries, letting
// someone already at their cap keep creating unlimited more through
// this path alone.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await getCreatorUsage(creator);
  if (usage.atCap) {
    return NextResponse.json(
      {
        error:
          usage.tier === "FREE"
            ? "You've used your free project this month. Upgrade to create more."
            : `You've reached your ${usage.limit}-project limit for this billing cycle. Upgrade to create more.`,
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Give this project a name" }, { status: 400 });
  }
  const trimmedName = name.trim();

  const briefFields = [
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

  const briefData: Prisma.ManagedProjectUncheckedCreateInput = {
    name: trimmedName,
    creatorId: creator.id,
  };
  for (const field of briefFields) {
    if (typeof body[field] === "string" && body[field].trim()) {
      briefData[field] = body[field].trim();
    }
  }
  if (typeof body.briefDeadline === "string" && body.briefDeadline) {
    const parsed = new Date(body.briefDeadline);
    if (!isNaN(parsed.getTime())) briefData.briefDeadline = parsed;
  }

  // Create the delivery first — the managed project needs its id to
  // link to it via deliveryProjectId.
  const slug = await findAvailableSlug(trimmedName);
  const accessCode = generateAccessCode();
  const passwordHash = await hashPassword(accessCode);
  const deliveryProject = await db.project.create({
    data: {
      slug,
      clientName: trimmedName,
      passwordHash,
      accessCode,
      creatorId: creator.id,
    },
  });
  const managedProject = await db.managedProject.create({
    data: { ...briefData, deliveryProjectId: deliveryProject.id },
  });

  return NextResponse.json({ managedProject, deliveryProject });
}