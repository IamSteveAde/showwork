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

// POST — restarts checkout for an account whose calendar billing
// isn't active (never paid, trial expired, or a past renewal
// failed). Billing is account-level now, so this activates the whole
// account, not just the one calendar the manager happened to click
// through from — but it's still reached from a specific calendar's
// locked screen, hence the [id] in the URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  if (calendar.managerId !== session.id) {
    return NextResponse.json({ error: "Only the calendar's manager can complete payment" }, { status: 403 });
  }

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
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback&calendarId=${calendar.id}`,
      planCode,
      amount: amountNgn * 100,
      metadata: { creatorId: creator.id, calendarId: calendar.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { calendarPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    console.error("Calendar retry-payment initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}