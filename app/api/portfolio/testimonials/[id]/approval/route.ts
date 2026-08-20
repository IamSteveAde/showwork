import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH — approve or hide a testimonial on the creator's own
// portfolio. Ownership is checked via the portfolio relation, not
// just the testimonial id, so a creator can only toggle testimonials
// that actually belong to their own portfolio.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { isApproved } = await req.json();
  if (typeof isApproved !== "boolean") {
    return NextResponse.json({ error: "isApproved must be a boolean" }, { status: 400 });
  }

  const testimonial = await db.portfolioTestimonial.findUnique({
    where: { id },
    include: { portfolio: { select: { creatorId: true } } },
  });
  if (!testimonial || testimonial.portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.portfolioTestimonial.update({ where: { id }, data: { isApproved } });
  return NextResponse.json({ testimonial: updated });
}