import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE — removes a testimonial permanently.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const testimonial = await db.portfolioTestimonial.findUnique({
    where: { id },
    include: { portfolio: { select: { creatorId: true } } },
  });
  if (!testimonial || testimonial.portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.portfolioTestimonial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}