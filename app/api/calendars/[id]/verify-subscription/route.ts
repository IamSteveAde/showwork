import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

// POST — called right after Paystack redirects back from the calendar
// subscription checkout. Confirms the first charge directly with
// Paystack's API rather than assuming the webhook already updated the
// row. Safe to call repeatedly: if the account is already ACTIVE,
// this is a no-op.
//
// Billing lives on the manager's account now, not the calendar — this
// activates the whole account, so every calendar they own becomes
// usable at once, not just the one this route happens to be reached
// through.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });

  if (!calendar || calendar.managerId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      calendarBillingStatus: true,
      calendarPaystackSubscriptionCode: true,
      calendarPendingSubscriptionRef: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (creator.calendarBillingStatus === "ACTIVE" && creator.calendarPaystackSubscriptionCode) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  if (!creator.calendarPendingSubscriptionRef) {
    return NextResponse.json({ error: "No payment has been started for this account yet" }, { status: 400 });
  }

  try {
    const verification = await verifyTransaction(creator.calendarPendingSubscriptionRef);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === creator.calendarPendingSubscriptionRef;

    if (!isActuallySuccessful) {
      return NextResponse.json(
        { error: "Payment not yet confirmed by Paystack", verifiedStatus: verification?.data?.status ?? null },
        { status: 402 }
      );
    }

    await db.creator.update({
      where: { id: creator.id },
      data: {
        calendarBillingStatus: "ACTIVE",
        calendarPaystackCustomerCode: verification?.data?.customer?.customer_code ?? null,
        // calendarPaystackSubscriptionCode intentionally left alone
        // here — the subscription.create webhook is the reliable
        // source for it, and fills it in whenever it fires.
      },
    });

    try {
      await db.paymentRecord.create({
        data: {
          creatorId: creator.id,
          amountNgn: Math.round((verification?.data?.amount ?? 0) / 100),
          type: "CALENDAR_SUBSCRIPTION_INITIAL",
          calendarId: calendar.id,
          paystackReference: creator.calendarPendingSubscriptionRef,
        },
      });
    } catch (err) {
      console.error(`Failed to create PaymentRecord during direct calendar subscription verification (creator ${creator.id})`, err);
    }

    return NextResponse.json({ ok: true, alreadyActive: false });
  } catch (err) {
    console.error("Direct calendar subscription verification failed:", err);
    return NextResponse.json({ error: "Couldn't verify payment — try again" }, { status: 500 });
  }
}