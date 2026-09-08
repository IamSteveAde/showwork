import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription, cancelSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const COMPANY_PLAN_CODE = process.env.PAYSTACK_CALENDAR_COMPANY_PLAN_CODE;
const COMPANY_MONTHLY_NGN = 15000;

// POST — switches an Individual account to Company, the only way to
// unlock collaboration. The account type itself changes immediately
// regardless of billing state (an account still inside its free
// trial gets to invite people right away, same trial window, no
// payment required yet). A real Paystack checkout is only ever
// started here if the account is currently ACTIVE and paying — in
// that case, the existing Individual subscription is cancelled and a
// new Company one takes its place, same "switch" pattern already
// used for the main platform's own subscription tiers.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      calendarAccountType: true,
      calendarBillingStatus: true,
      calendarPaystackSubscriptionCode: true,
      calendarPaystackEmailToken: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.calendarAccountType === "COMPANY") {
    return NextResponse.json({ ok: true, alreadyCompany: true });
  }

  await db.creator.update({
    where: { id: creator.id },
    data: { calendarAccountType: "COMPANY" },
  });

  // Not currently an active paying subscription — trial, offline, or
  // never-paid all land here. The type switch above is all that's
  // needed; billing (if any is ever owed) is handled the normal way,
  // through the existing trial-expiry or retry-payment flow, which
  // already reads calendarAccountType fresh and will charge the
  // Company price once it actually runs.
  if (creator.calendarBillingStatus !== "ACTIVE") {
    return NextResponse.json({ ok: true, requiresPayment: false });
  }

  // Currently paying as Individual — cancel that subscription and
  // start a fresh Company one in its place.
  if (!COMPANY_PLAN_CODE) {
    console.error("PAYSTACK_CALENDAR_COMPANY_PLAN_CODE is not set — cannot start Company checkout.");
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  if (creator.calendarPaystackSubscriptionCode && creator.calendarPaystackEmailToken) {
    try {
      await cancelSubscription(creator.calendarPaystackSubscriptionCode, creator.calendarPaystackEmailToken);
    } catch (err) {
      console.error("Failed to cancel previous Individual calendar subscription during upgrade:", err);
    }
  }

  const reference = `showwork_calendar_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback`,
      planCode: COMPANY_PLAN_CODE,
      amount: COMPANY_MONTHLY_NGN * 100,
      metadata: { creatorId: creator.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { calendarPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, requiresPayment: true });
  } catch (err) {
    console.error("Company upgrade checkout initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}