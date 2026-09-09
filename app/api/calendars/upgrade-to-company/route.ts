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
// regardless of billing state.
//
// What happens next depends on where billing actually stands:
//   - ACTIVE (already paying): always goes straight to checkout —
//     cancels the old Individual subscription and starts a new
//     Company one, since there's no valid reason to delay this once
//     real money is already involved.
//   - TRIAL, but that trial has already run out: also goes straight
//     to checkout automatically — the account is already locked out
//     either way, so there's nothing to "stay on" by waiting.
//   - TRIAL, and still genuinely valid: this is the one case with a
//     real choice. `payNow` (sent by the frontend after showing the
//     person a prompt recommending they pay now) decides whether to
//     start checkout immediately or just apply the type switch and
//     leave them on the remainder of their trial.
//   - PENDING_SETUP / OFFLINE (never paid, or a past renewal failed):
//     same as an expired trial — already locked out, so straight to
//     checkout.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payNow } = await req.json().catch(() => ({ payNow: false }));

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      calendarAccountType: true,
      calendarBillingStatus: true,
      calendarTrialEndsAt: true,
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

  const trialStillValid =
    creator.calendarBillingStatus === "TRIAL" &&
    !!creator.calendarTrialEndsAt &&
    creator.calendarTrialEndsAt.getTime() > Date.now();

  // Only case where checkout is genuinely optional: a trial that
  // hasn't run out yet, and the frontend hasn't confirmed the person
  // wants to pay right now.
  if (trialStillValid && !payNow) {
    return NextResponse.json({ ok: true, requiresPayment: false, stillInTrial: true });
  }

  // Every other case — already active, trial expired, or never paid
  // at all — needs a real checkout now.
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