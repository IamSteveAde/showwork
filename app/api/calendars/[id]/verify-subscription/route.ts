import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

// POST — called right after Paystack redirects back from the calendar
// subscription checkout. Confirms the first charge directly with
// Paystack's API rather than assuming the webhook already updated the
// row. Safe to call repeatedly: if the calendar is already ACTIVE,
// this is a no-op.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });

  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (calendar.billingStatus === "ACTIVE" && calendar.paystackSubscriptionCode) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  if (!calendar.pendingSubscriptionRef) {
    return NextResponse.json({ error: "No payment has been started for this calendar yet" }, { status: 400 });
  }

  try {
    const verification = await verifyTransaction(calendar.pendingSubscriptionRef);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === calendar.pendingSubscriptionRef;

    if (!isActuallySuccessful) {
      return NextResponse.json(
        { error: "Payment not yet confirmed by Paystack", verifiedStatus: verification?.data?.status ?? null },
        { status: 402 }
      );
    }

    await db.socialCalendar.update({
      where: { id: calendar.id },
      data: {
        billingStatus: "ACTIVE",
        paystackCustomerCode: verification?.data?.customer?.customer_code ?? null,
        // paystackSubscriptionCode intentionally left alone here —
        // the subscription.create webhook is the reliable source for
        // it, and fills it in whenever it fires.
      },
    });

    try {
      await db.paymentRecord.create({
        data: {
          creatorId: calendar.managerId,
          amountNgn: Math.round((verification?.data?.amount ?? 0) / 100),
          type: "CALENDAR_SUBSCRIPTION_INITIAL",
          calendarId: calendar.id,
          paystackReference: calendar.pendingSubscriptionRef,
        },
      });
    } catch (err) {
      console.error(`Failed to create PaymentRecord during direct calendar subscription verification (calendar ${calendar.id})`, err);
    }

    return NextResponse.json({ ok: true, alreadyActive: false });
  } catch (err) {
    console.error("Direct calendar subscription verification failed:", err);
    return NextResponse.json({ error: "Couldn't verify payment — try again" }, { status: 500 });
  }
}