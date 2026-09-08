import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const CALENDAR_PLAN_CODE = process.env.PAYSTACK_CALENDAR_PLAN_CODE;
const CALENDAR_MONTHLY_NGN = 2800;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  if (calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Only the calendar's manager can complete payment" }, { status: 403 });
  }
  if (calendar.billingStatus === "ACTIVE") {
    return NextResponse.json({ error: "This calendar is already active" }, { status: 400 });
  }
  if (!CALENDAR_PLAN_CODE) {
    console.error("PAYSTACK_CALENDAR_PLAN_CODE is not set — cannot start calendar subscription checkout.");
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  const reference = `showwork_calendar_sub_${calendar.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback&calendarId=${calendar.id}`,
      planCode: CALENDAR_PLAN_CODE,
      amount: CALENDAR_MONTHLY_NGN * 100,
      metadata: { calendarId: calendar.id },
    });

    await db.socialCalendar.update({
      where: { id: calendar.id },
      data: { pendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    console.error("Calendar retry-payment initialize error:", err);
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}