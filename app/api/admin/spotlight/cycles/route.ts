import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cycles = await db.spotlightCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return NextResponse.json({ cycles });
}

// POST — creates a new cycle. Only one cycle should ever be
// isActive; activating this one (if requested) deactivates every
// other cycle in the same transaction, so there's never a moment
// where two cycles are both accepting submissions at once.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { monthLabel, submissionOpensAt, submissionDeadline, heroImageUrl, heroHeadline, heroDescription, isActive } = await req.json();

  if (!monthLabel?.trim() || !submissionOpensAt || !submissionDeadline) {
    return NextResponse.json({ error: "Month label, open date, and deadline are required" }, { status: 400 });
  }

  const cycle = await db.$transaction(async (tx) => {
    if (isActive) {
      await tx.spotlightCycle.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return tx.spotlightCycle.create({
      data: {
        monthLabel: monthLabel.trim(),
        submissionOpensAt: new Date(submissionOpensAt),
        submissionDeadline: new Date(submissionDeadline),
        heroImageUrl: heroImageUrl?.trim() || null,
        heroHeadline: heroHeadline?.trim() || null,
        heroDescription: heroDescription?.trim() || null,
        isActive: !!isActive,
      },
    });
  });

  return NextResponse.json({ cycle });
}