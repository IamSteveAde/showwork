import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { variant } = await req.json();

  if (variant !== "deliver" && variant !== "portfolio") {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  try {
    await db.blogPost.update({
      where: { slug },
      data: variant === "deliver" ? { deliverCtaClicks: { increment: 1 } } : { portfolioCtaClicks: { increment: 1 } },
    });
  } catch {
    // A missing/renamed slug shouldn't block the person from actually
    // continuing to the page they clicked toward — this is
    // best-effort tracking, not something worth failing the click over.
  }

  return NextResponse.json({ ok: true });
}