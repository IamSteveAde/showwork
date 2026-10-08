import { NextRequest, NextResponse } from "next/server";
import {
  paymentIntegration,
  reconcilePaymentBatch,
} from "@/lib/paymentReconciliation";
import { paymentRevenueSchema } from "@/lib/paymentRevenueSchema";
import { getLiveRevenueTotals } from "@/lib/livePaymentRevenue";
import { listSuccessfulTransactions, verifyTransaction } from "@/lib/paystack";
import { verifiedPaymentReceipt } from "@/lib/verifiedPaymentReceipt";
import { syncVerifiedPayment } from "@/lib/paymentSync";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
function authorized(req: NextRequest) {
  return (
    !!process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}
/** Read-only operational audit uses production's secret at runtime, without exporting it. */
export async function GET(req: NextRequest) {
  if (!authorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const integration = paymentIntegration();
    if (req.nextUrl.searchParams.get("mode") !== "audit") {
      return NextResponse.json({
        live: integration.live,
        schema: await paymentRevenueSchema(),
        ledger: await getLiveRevenueTotals(),
      });
    }
    if (!integration.live)
      return NextResponse.json(
        {
          error: "Production Paystack connection is in test mode",
          live: false,
        },
        { status: 409 },
      );
    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    const to = new Date(req.nextUrl.searchParams.get("to") ?? Date.now());
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isFinite(to.getTime())
    )
      return NextResponse.json(
        { error: "Invalid audit window" },
        { status: 400 },
      );
    const batch = await listSuccessfulTransactions({ page, perPage: 10, to });
    const rows = [];
    for (const charge of batch.data) {
      if (charge.domain !== "live") continue;
      const verification = await verifyTransaction(charge.reference);
      const receipt = verifiedPaymentReceipt(charge.reference, verification);
      try {
        const { payment } = await syncVerifiedPayment(
          charge.reference,
          verification,
          { apply: false },
        );
        rows.push({
          reference: charge.reference,
          amountNgn: receipt.amountNgn,
          paidAt: receipt.createdAt,
          type: payment.type,
          creatorId: payment.creatorId,
          attributed: true,
        });
      } catch (error) {
        rows.push({
          reference: charge.reference,
          amountNgn: receipt.amountNgn,
          paidAt: receipt.createdAt,
          attributed: false,
          reason:
            error instanceof Error
              ? error.message
              : "Attribution requires review",
        });
      }
    }
    return NextResponse.json({
      live: true,
      page,
      to: to.toISOString(),
      total: batch.meta?.total ?? null,
      complete:
        batch.data.length < 10 ||
        (batch.meta?.total !== undefined && page * 10 >= batch.meta.total),
      rows,
    });
  } catch (error) {
    console.error("Production payment audit failed", error);
    return NextResponse.json(
      { error: "Payment audit unavailable; retry required" },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  if (!authorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await reconcilePaymentBatch();
    return NextResponse.json(result, { status: result.failed ? 503 : 200 });
  } catch (error) {
    console.error("Revenue reconciliation failed", error);
    return NextResponse.json(
      { error: "Revenue sync failed; retry required" },
      { status: 503 },
    );
  }
}
