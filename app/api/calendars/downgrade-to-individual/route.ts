import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription, cancelSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const INDIVIDUAL_PLAN_CODE = process.env.PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE;
const INDIVIDUAL_MONTHLY_NGN = 2800;

// POST — switches a Company account back to Individual. Blocked
// entirely if any collaborator or pending invite still exists on any
// calendar this account owns.
//
// What happens next mirrors the upgrade route's logic exactly, just
// in the other direction:
//   - ACTIVE: always straight to checkout (cancel old, start new).
//   - TRIAL, already expired: also straight to checkout automatically
//     — already locked out either way.
//   - TRIAL, still valid: only case with a real choice — `payNow`
//     (set by the frontend after prompting the person) decides
//     whether to check out now or just apply the switch and leave
//     them on the remainder of their trial.
//   - PENDING_SETUP / OFFLINE: straight to checkout, same as expired.
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

  if (creator.calendarAccountType !== "COMPANY") {
    return NextResponse.json({ error: "Your account is already Individual" }, { status: 400 });
  }

  const [collaboratorCount, pendingInviteCount] = await Promise.all([
    db.calendarCollaborator.count({ where: { calendar: { managerId: creator.id } } }),
    db.calendarInvite.count({ where: { calendar: { managerId: creator.id }, status: "PENDING" } }),
  ]);
  if (collaboratorCount + pendingInviteCount > 0) {
    return NextResponse.json(
      { error: "Remove every collaborator and pending invite from all your calendars before switching to Individual." },
      { status: 400 }
    );
  }

  await db.creator.update({
    where: { id: creator.id },
    data: { calendarAccountType: "INDIVIDUAL" },
  });

  const trialStillValid =
    creator.calendarBillingStatus === "TRIAL" &&
    !!creator.calendarTrialEndsAt &&
    creator.calendarTrialEndsAt.getTime() > Date.now();

  if (trialStillValid && !payNow) {
    return NextResponse.json({ ok: true, requiresPayment: false, stillInTrial: true });
  }

  if (!INDIVIDUAL_PLAN_CODE) {
    console.error("PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE is not set — cannot start Individual checkout.");
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  if (creator.calendarPaystackSubscriptionCode && creator.calendarPaystackEmailToken) {
    try {
      await cancelSubscription(creator.calendarPaystackSubscriptionCode, creator.calendarPaystackEmailToken);
    } catch (err) {
      console.error("Failed to cancel previous Company calendar subscription during downgrade:", err);
    }
  }

  const reference = `showwork_calendar_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback`,
      planCode: INDIVIDUAL_PLAN_CODE,
      amount: INDIVIDUAL_MONTHLY_NGN * 100,
      metadata: { creatorId: creator.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { calendarPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, requiresPayment: true });
  } catch (err) {
    console.error("Individual downgrade checkout initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}