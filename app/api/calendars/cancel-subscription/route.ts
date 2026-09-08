import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSubscription } from "@/lib/paystack";

// POST — deliberate, self-service cancellation. Cancels the real
// Paystack subscription (if one exists) and sets billing to
// PENDING_SETUP rather than OFFLINE — OFFLINE is reserved for "a
// renewal charge failed," which is a different situation from
// someone choosing to stop on purpose, and showing an "offline —
// payment failed" style badge after a deliberate cancellation would
// be misleading.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      calendarBillingStatus: true,
      calendarPaystackSubscriptionCode: true,
      calendarPaystackEmailToken: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.calendarBillingStatus !== "ACTIVE") {
    return NextResponse.json({ error: "You don't have an active subscription to cancel" }, { status: 400 });
  }

  if (creator.calendarPaystackSubscriptionCode && creator.calendarPaystackEmailToken) {
    try {
      await cancelSubscription(creator.calendarPaystackSubscriptionCode, creator.calendarPaystackEmailToken);
    } catch (err) {
      console.error("Failed to cancel calendar subscription with Paystack:", err);
      return NextResponse.json({ error: "Failed to cancel with our payment provider — try again" }, { status: 500 });
    }
  }

  await db.creator.update({
    where: { id: creator.id },
    data: {
      calendarBillingStatus: "PENDING_SETUP",
      calendarSubscriptionRenewsAt: null,
      calendarWentOfflineAt: null,
      calendarLastPaymentReminderSentAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}