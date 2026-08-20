import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public — a client submitting a testimonial never needs an account.
// Always created with isApproved: false, regardless of what's sent in
// the request — approval is exclusively the creator's decision, made
// afterward in their dashboard, never something a submitter can set.
export async function POST(req: NextRequest) {
  const { portfolioSlug, clientName, clientRole, quote, rating } = await req.json();

  if (!portfolioSlug) {
    return NextResponse.json({ error: "Missing portfolio" }, { status: 400 });
  }
  if (!clientName?.trim() || !quote?.trim()) {
    return NextResponse.json({ error: "Your name and the testimonial itself are both required" }, { status: 400 });
  }

  const portfolio = await db.portfolio.findUnique({ where: { slug: portfolioSlug }, select: { id: true } });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  await db.portfolioTestimonial.create({
    data: {
      portfolioId: portfolio.id,
      clientName: clientName.trim(),
      clientRole: clientRole?.trim() || null,
      quote: quote.trim(),
      rating: typeof rating === "number" && rating > 0 ? rating : null,
      isApproved: false,
    },
  });

  return NextResponse.json({ ok: true });
}