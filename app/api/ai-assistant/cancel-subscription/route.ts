import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSubscription } from "@/lib/paystack";

// POST — deliberate, self-service cancellation of the AI content
// assistant add-on. Sets billing to PENDING_SETUP rather than
// OFFLINE, same reasoning as the calendar cancel route: OFFLINE is
// reserved for "a renewal charge failed," not a deliberate choice.
// Cancelling this never touches calendar billing — the two
// subscriptions are completely independent.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      aiAssistantBillingStatus: true,
      aiAssistantPaystackSubscriptionCode: true,
      aiAssistantPaystackEmailToken: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.aiAssistantBillingStatus !== "ACTIVE") {
    return NextResponse.json({ error: "You don't have an active AI assistant subscription to cancel" }, { status: 400 });
  }

  if (creator.aiAssistantPaystackSubscriptionCode && creator.aiAssistantPaystackEmailToken) {
    try {
      await cancelSubscription(creator.aiAssistantPaystackSubscriptionCode, creator.aiAssistantPaystackEmailToken);
    } catch (err) {
      console.error("Failed to cancel AI assistant subscription with Paystack:", err);
      return NextResponse.json({ error: "Failed to cancel with our payment provider — try again" }, { status: 500 });
    }
  }

  await db.creator.update({
    where: { id: creator.id },
    data: {
      aiAssistantBillingStatus: "PENDING_SETUP",
      aiAssistantSubscriptionRenewsAt: null,
      aiAssistantWentOfflineAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}