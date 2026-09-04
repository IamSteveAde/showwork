import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlugFor(base: string, excludePortfolioId?: string): Promise<string> {
  let candidate = base || "portfolio";
  let suffix = 0;
  while (true) {
    const existing = await db.portfolio.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludePortfolioId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

// GET — the current creator's own portfolio, or null if they haven't
// created one yet.
export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const portfolio = await db.portfolio.findFirst({
    where: { creatorId: creator.id },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: { media: { orderBy: { displayOrder: "asc" } } },
      },
      media: true,
      testimonials: { orderBy: { displayOrder: "asc" } },
    },
  });

  return NextResponse.json({ portfolio });
}

// POST — creates the creator's portfolio the first time (one per
// creator, enforced by the unique creatorId). Free regardless of
// subscription tier — deliberately no plan/usage check here at all.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (existing) {
    return NextResponse.json({ error: "You already have a portfolio — use PATCH to update it" }, { status: 409 });
  }

  const { companyName, heroTagline, contactEmail, whatsappNumber, ctaText } = await req.json();
  if (!companyName || !companyName.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const slug = await uniqueSlugFor(slugify(companyName));

  const portfolio = await db.portfolio.create({
    data: {
      creatorId: creator.id,
      companyName: companyName.trim(),
      heroTagline: heroTagline?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      whatsappNumber: whatsappNumber?.trim() || null,
      ctaText: ctaText?.trim() || null,
      slug,
    },
  });

  return NextResponse.json({ portfolio });
}

// PATCH — updates the existing portfolio's details (name, tagline,
// branding, chosen banner file).
export async function PATCH(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  const body = await req.json();
    const allowedFields = [
    "heroTagline",
    "heroMediaId",
        "heroBannerDesktopUrl",
    "heroBannerDesktopType",
    "heroBannerMobileUrl",
    "heroBannerMobileType",
    "logoUrl",
    "primaryColor",
    "bgColor",
    "contactEmail",
    "whatsappNumber",
    "ctaText",
    "instagramUrl",
    "twitterUrl",
    "linkedinUrl",
    "tiktokUrl",
    "facebookUrl",
    "youtubeUrl",
    "bioText",
    "bioPhotoUrl",
    "bioSkills",
    "bioStat",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }
  if ("companyName" in body && body.companyName?.trim()) {
    data.companyName = body.companyName.trim();
  }

  const updated = await db.portfolio.update({ where: { id: portfolio.id }, data });
  return NextResponse.json({ portfolio: updated });
}