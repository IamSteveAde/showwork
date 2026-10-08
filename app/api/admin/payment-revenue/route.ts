import { paymentRevenueSchema } from "@/lib/paymentRevenueSchema";
import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  paymentIntegration,
  reconcilePaymentBatch,
} from "@/lib/paymentReconciliation";
export const maxDuration = 60;
async function authorized() {
  const creator = await getCurrentCreator();
  return !!creator && isAdminEmail(creator.email);
}
export async function GET() {
  if (!(await authorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const integration = paymentIntegration();
    const schema = await paymentRevenueSchema();
    if (!schema.receipts || !schema.state || !schema.issues) {
      return NextResponse.json({
        live: integration.live,
        migrationRequired: true,
        lastSyncedAt: null,
        inProgress: false,
        busy: false,
        issues: 0,
        unattributed: 0,
      });
    }
    const state = await db.paymentRevenueSyncState.findUnique({
      where: { id: integration.id },
    });
    const issues = await db.paymentRevenueSyncIssue.count({
      where: { integration: integration.id, resolvedAt: null },
    });
    const unattributed = await db.paymentRevenueReceipt.count({
      where: { tool: "unattributed" },
    });
    return NextResponse.json({
      live: integration.live,
      migrationRequired: false,
      lastSyncedAt: state?.lastSyncedAt ?? null,
      inProgress: !!state?.scanTo,
      busy: !!state?.leaseUntil && state.leaseUntil > new Date(),
      issues,
      unattributed,
    });
  } catch (error) {
    console.error("Payment sync status unavailable", error);
    return NextResponse.json(
      { error: "Payment sync status is unavailable" },
      { status: 503 },
    );
  }
}
export async function POST() {
  if (!(await authorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await reconcilePaymentBatch();
    return NextResponse.json(result, { status: result.failed ? 503 : 200 });
  } catch (error) {
    console.error("Admin payment sync failed", error);
    return NextResponse.json(
      {
        error:
          "Payment sync failed. Check the live billing connection and try again.",
      },
      { status: 503 },
    );
  }
}
