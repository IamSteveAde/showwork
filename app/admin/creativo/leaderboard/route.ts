import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

const CATEGORIES = ["Photography", "Videography", "Motion", "Editing"];

// GET — every leaderboard entry, most recent period first, for the
// admin's own management table.
export async function GET() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db.creativoLeaderboardEntry.findMany({
    orderBy: [{ periodDate: "desc" }, { points: "desc" }],
  });
  return NextResponse.json({ entries });
}

// POST — creates one leaderboard entry. periodDate is normalized to
// the 1st of whatever month was submitted, so every entry for the
// same month lands on an identical date and groups together
// correctly regardless of which day of the month it was entered.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, profileImageUrl, category, whatTheyDo, contact, wonFor, points, periodDate } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!wonFor || !wonFor.trim()) {
    return NextResponse.json({ error: "\"Won for\" is required" }, { status: 400 });
  }
  if (!periodDate) {
    return NextResponse.json({ error: "periodDate is required" }, { status: 400 });
  }

  const submitted = new Date(periodDate);
  const normalizedPeriod = new Date(Date.UTC(submitted.getUTCFullYear(), submitted.getUTCMonth(), 1));

  const entry = await db.creativoLeaderboardEntry.create({
    data: {
      name: name.trim(),
      profileImageUrl: profileImageUrl?.trim() || null,
      category,
      whatTheyDo: whatTheyDo?.trim() || null,
      contact: contact?.trim() || null,
      wonFor: wonFor.trim(),
      points: typeof points === "number" ? points : 0,
      periodDate: normalizedPeriod,
    },
  });

  return NextResponse.json({ entry });
}