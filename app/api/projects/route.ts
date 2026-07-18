import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { getCreatorUsage } from "@/lib/subscriptionUsage";

// GET: list the logged-in creator's projects
export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { media: true, viewerEmails: true } } },
  });

  return NextResponse.json({ projects });
}

// POST: create a new project — blocked once the creator's tier limit
// for this billing cycle is reached.
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

  const { clientName, password, captureViewerEmail } = await req.json();

  if (!clientName || !password) {
    return NextResponse.json(
      { error: "clientName and password are required" },
      { status: 400 }
    );
  }

  const slug = await generateUniqueSlug(clientName);
  const passwordHash = await hashPassword(password);

  const project = await db.project.create({
    data: {
      slug,
      clientName,
      passwordHash,
      accessCode: password,
      captureViewerEmail: captureViewerEmail ?? true,
      creatorId: creator.id,
    },
  });

  return NextResponse.json({ project });
}