import { NextRequest, NextResponse } from "next/server";
import { reconcileOfferExpirations } from "@/lib/billingOffers";
import { refreshExpiredComplimentaryGrants } from "@/lib/complimentaryGrants";
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const discounts = await reconcileOfferExpirations();
    const complimentaryAccounts = await refreshExpiredComplimentaryGrants();
    return NextResponse.json({ ...discounts, complimentaryAccounts }, { status: discounts.failed ? 503 : 200 });
  } catch (error) {
    console.error("Billing offer reconciliation failed", error);
    return NextResponse.json({ error: "Reconciliation failed; retry required" }, { status: 503 });
  }
}
