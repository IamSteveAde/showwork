import { syncVerifiedPayment } from "@/lib/paymentSync";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

// POST — called right after Paystack redirects back from the
// subscription checkout. Confirms the first charge directly with
// Paystack's API rather than assuming the webhook already updated the
// row — the webhook is still the primary path in production, but it
// structurally cannot reach localhost during development, so this is
// what actually unblocks local testing. Safe to call repeatedly: if
// the portfolio is already ACTIVE, this is a no-op.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const portfolio = await db.portfolio.findUnique({ where: { id } });

  if (!portfolio || portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (portfolio.billingStatus === "ACTIVE" && portfolio.paystackSubscriptionCode && !portfolio.pendingSubscriptionRef) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  if (!portfolio.pendingSubscriptionRef) {
    return NextResponse.json({ error: "No payment has been started for this portfolio yet" }, { status: 400 });
  }

  try {
    const verification = await verifyTransaction(portfolio.pendingSubscriptionRef);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === portfolio.pendingSubscriptionRef;

    if (!isActuallySuccessful) {
      return NextResponse.json(
        { error: "Payment not yet confirmed by Paystack", verifiedStatus: verification?.data?.status ?? null },
        { status: 402 }
      );
    }

    await syncVerifiedPayment(portfolio.pendingSubscriptionRef, verification, { expectedCreatorId: creator.id });

    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        billingStatus: "ACTIVE",
        paystackCustomerCode: verification?.data?.customer?.customer_code ?? null,
        // paystackSubscriptionCode intentionally left alone here —
        // Paystack's transaction-verify response isn't a reliable
        // source for it; the subscription.create webhook event is
        // what actually delivers it, and fills it in whenever it
        // fires (immediately in production, or whenever this webhook
        // can actually be reached).
      },
    });


    return NextResponse.json({ ok: true, alreadyActive: false });
  } catch (err) {
    console.error("Direct subscription verification failed:", err);
    return NextResponse.json({ error: "Couldn't verify payment — try again" }, { status: 500 });
  }
}