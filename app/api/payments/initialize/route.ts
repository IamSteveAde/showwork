import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";

// The creator's browser calls this (e.g. when they click "Publish — ₦5,000")
// with { projectId, creatorEmail } in the body. We start a Paystack
// transaction and return the checkout URL for the browser to redirect to.
export async function POST(req: NextRequest) {
  try {
    const { projectId, creatorEmail } = await req.json();

    if (!projectId || !creatorEmail) {
      return NextResponse.json(
        { error: "projectId and creatorEmail are required" },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.paid) {
      return NextResponse.json({ error: "Project already paid" }, { status: 400 });
    }

    // First-ever publish is free for every account. "First" is computed
    // dynamically — has this creator ever had a paid project before —
    // rather than a stored flag, so there's nothing to get out of sync.
    const paidProjectsCount = await db.project.count({
      where: { creatorId: project.creatorId, paid: true },
    });

    if (paidProjectsCount === 0) {
      await db.project.update({
        where: { id: project.id },
        data: { paid: true, paidAt: new Date(), badgeVisible: false },
      });
      return NextResponse.json({ free: true });
    }

    // Unique reference we can trace back to this exact project + attempt.
    const reference = `spotlite_${project.id}_${randomUUID()}`;

    const result = await initializeTransaction({
      email: creatorEmail,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${project.id}?payment=callback`,
      metadata: { projectId: project.id },
    });

    // Save the reference now so the webhook can match it back to this
    // project even if it arrives before the creator's browser redirect does.
    await db.project.update({
      where: { id: project.id },
      data: { paystackRef: reference },
    });

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
    });
  } catch (err) {
    console.error("Payment initialize error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}