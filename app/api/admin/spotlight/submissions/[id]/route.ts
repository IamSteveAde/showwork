import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// Points assigned by rank, purely so a Spotlight-promoted winner sorts
// correctly on the public Creativo leaderboard alongside any entries
// an admin added by hand for the same month — 1st/2nd/3rd aren't
// really "points" in the voting sense, this just needs to outrank
// anything manually entered at a lower position.
const POINTS_FOR_RANK: Record<number, number> = { 1: 300, 2: 200, 3: 100 };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.spotlightSubmission.findUnique({
    where: { id },
    include: { cycle: { select: { submissionDeadline: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ("rank" in body && body.rank !== null) {
    const rank = Number(body.rank);
    if (![1, 2, 3].includes(rank)) {
      return NextResponse.json({ error: "Rank must be 1, 2, or 3" }, { status: 400 });
    }
    // Only one submission per cycle can hold a given rank — clear it
    // from whoever currently has it before assigning it here, so two
    // submissions can never both be "1st place" at once.
    await db.spotlightSubmission.updateMany({
      where: { cycleId: existing.cycleId, rank, id: { not: id } },
      data: { rank: null },
    });
  }

  const data: Record<string, unknown> = {};
  if ("isShortlisted" in body) data.isShortlisted = !!body.isShortlisted;
  if ("rank" in body) data.rank = body.rank === null ? null : Number(body.rank);

  const submission = await db.spotlightSubmission.update({ where: { id }, data });

  // The Creativo public leaderboard is the actual, existing display —
  // ranking a submission here needs to create or update a real entry
  // there, not a separate leaderboard of its own. Un-ranking removes
  // it from that same leaderboard just as directly.
  if ("rank" in body) {
    if (submission.rank === null) {
      await db.creativoLeaderboardEntry.deleteMany({ where: { sourceSubmissionId: submission.id } });
    } else {
      const submissionMonth = existing.cycle.submissionDeadline;
      const periodDate = new Date(Date.UTC(submissionMonth.getUTCFullYear(), submissionMonth.getUTCMonth(), 1));

      await db.creativoLeaderboardEntry.upsert({
        where: { sourceSubmissionId: submission.id },
        create: {
          sourceSubmissionId: submission.id,
          name: submission.name,
          category: submission.category,
          wonFor: submission.description,
          portfolioUrl: submission.projectLink,
          points: POINTS_FOR_RANK[submission.rank],
          periodDate,
        },
        update: {
          name: submission.name,
          category: submission.category,
          wonFor: submission.description,
          portfolioUrl: submission.projectLink,
          points: POINTS_FOR_RANK[submission.rank],
        },
      });
    }
  }

  return NextResponse.json({ submission });
}