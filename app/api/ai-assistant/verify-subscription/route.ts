import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

// POST — called right after Paystack redirects back to the app,
// using the pending reference stored when checkout started. This is
// a faster fallback for the UI, not the source of truth — the
// webhook is what actually activates billing in the general case,
// but webhooks can lag behind the browser's own redirect by a few
// seconds, so this lets the page show the real status immediately
// rather than a stale "not active yet" for a moment.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: { id: true, aiAssistantBillingStatus: true, aiAssistantPendingSubscriptionRef: true },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.aiAssistantBillingStatus === "ACTIVE") {
    return NextResponse.json({ billingStatus: "ACTIVE" });
  }

  if (!creator.aiAssistantPendingSubscriptionRef) {
    return NextResponse.json({ billingStatus: creator.aiAssistantBillingStatus });
  }

  try {
    const result = await verifyTransaction(creator.aiAssistantPendingSubscriptionRef);
    if (result?.data?.status === "success") {
      await db.creator.update({
        where: { id: creator.id },
        data: { aiAssistantBillingStatus: "ACTIVE", aiAssistantWentOfflineAt: null },
      });
      return NextResponse.json({ billingStatus: "ACTIVE" });
    }
  } catch (err) {
    console.error("AI assistant verify-subscription error:", err);
  }

  return NextResponse.json({ billingStatus: creator.aiAssistantBillingStatus });
}