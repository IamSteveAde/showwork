import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// Searches existing accounts by name, email, or company name — used
// when inviting a collaborator who might already be on Showwork.
// Deliberately returns only public-safe fields: no password hash, no
// billing/subscription details, nothing another creator shouldn't see
// about someone else's account.
export async function GET(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const matches = await db.creator.findMany({
    where: {
      AND: [
        { id: { not: creator.id } }, // never suggest inviting yourself
        { isDeactivated: false },
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      avatarUrl: true,
    },
    take: 8,
  });

  return NextResponse.json({ results: matches });
}