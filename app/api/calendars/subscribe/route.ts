import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const INDIVIDUAL_PLAN_CODE = process.env.PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE;
const COMPANY_PLAN_CODE = process.env.PAYSTACK_CALENDAR_COMPANY_PLAN_CODE;
const INDIVIDUAL_MONTHLY_NGN = 2800;
const COMPANY_MONTHLY_NGN = 15000;

// POST — starts (or restarts) the account-level calendar
// subscription. Unlike app/api/calendars/[id]/retry-payment, this
// doesn't need any specific calendar in scope at all — it's what the
// dashboard's trial countdown banner calls, where there's no single
// "current calendar" to anchor the request to. Both routes end up
// doing the same underlying thing, just reached from different
// places in the product.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, calendarAccountType: true, calendarBillingStatus: true },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.calendarBillingStatus === "ACTIVE") {
    return NextResponse.json({ error: "Your account is already active" }, { status: 400 });
  }
  if (!creator.calendarAccountType) {
    return NextResponse.json({ error: "No account type set — contact support" }, { status: 400 });
  }

  const planCode = creator.calendarAccountType === "COMPANY" ? COMPANY_PLAN_CODE : INDIVIDUAL_PLAN_CODE;
  const amountNgn = creator.calendarAccountType === "COMPANY" ? COMPANY_MONTHLY_NGN : INDIVIDUAL_MONTHLY_NGN;

  if (!planCode) {
    console.error(`Paystack plan code for ${creator.calendarAccountType} calendars is not set — cannot start checkout.`);
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  const reference = `showwork_calendar_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback`,
      planCode,
      amount: amountNgn * 100,
      metadata: { creatorId: creator.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { calendarPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    console.error("Calendar subscribe initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}