import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — adds a testimonial the creator entered themselves. No client
// verification step (this isn't a review platform) — it's the
// creator's own portfolio, and they're vouching for the quote.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  const { clientName, clientRole, quote, rating } = await req.json();
  if (!clientName || !clientName.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }
  if (!quote || !quote.trim()) {
    return NextResponse.json({ error: "The testimonial itself can't be empty" }, { status: 400 });
  }
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const existingCount = await db.portfolioTestimonial.count({ where: { portfolioId: portfolio.id } });

  const testimonial = await db.portfolioTestimonial.create({
    data: {
      portfolioId: portfolio.id,
      clientName: clientName.trim(),
      clientRole: clientRole?.trim() || null,
      quote: quote.trim(),
      rating: rating ?? null,
      displayOrder: existingCount,
    },
  });

  return NextResponse.json({ testimonial });
}