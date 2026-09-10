import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const AI_ASSISTANT_PLAN_CODE = process.env.PAYSTACK_AI_ASSISTANT_PLAN_CODE;
const AI_ASSISTANT_MONTHLY_NGN = 15000;

// POST — starts (or restarts) the account-level AI content assistant
// subscription. Completely independent of calendar billing — an
// account can be on any calendar tier (or none at all) and still
// subscribe to this separately. No trial: this charges immediately.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, aiAssistantBillingStatus: true },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.aiAssistantBillingStatus === "ACTIVE") {
    return NextResponse.json({ error: "The AI content assistant is already active on your account" }, { status: 400 });
  }

  if (!AI_ASSISTANT_PLAN_CODE) {
    console.error("PAYSTACK_AI_ASSISTANT_PLAN_CODE is not set — cannot start checkout.");
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  const reference = `showwork_ai_assistant_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?aiAssistantPayment=callback`,
      planCode: AI_ASSISTANT_PLAN_CODE,
      amount: AI_ASSISTANT_MONTHLY_NGN * 100,
      metadata: { creatorId: creator.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { aiAssistantPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    console.error("AI assistant subscribe initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}