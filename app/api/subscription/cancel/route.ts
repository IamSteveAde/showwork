import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { cancelSubscription } from "@/lib/paystack";

export async function POST() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!creator.paystackSubscriptionCode || !creator.paystackEmailToken) {
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
  }

  try {
    await cancelSubscription(creator.paystackSubscriptionCode, creator.paystackEmailToken);

    // Don't wait for the webhook to catch up — reflect the cancellation
    // immediately so the dashboard updates right away.
    await db.creator.update({
      where: { id: creator.id },
      data: { subscriptionActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}