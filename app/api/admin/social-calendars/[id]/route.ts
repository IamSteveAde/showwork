import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

async function requireAdmin() {
  const creator = await getCurrentCreator();
  if (!creator || !isAdminEmail(creator.email)) return null;
  return creator;
}

// PATCH — grant one free month, or fully reset a calendar's billing
// state back to a clean slate (mirrors the creator-level tools
// exactly, just scoped to one calendar instead of one account).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const { action } = await req.json();

  if (action === "grant_free_month") {
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        billingStatus: "ACTIVE",
        subscriptionRenewsAt: oneMonthFromNow,
        wentOfflineAt: null,
        lastPaymentReminderSentAt: null,
        lastFreeMonthGrantedAt: now,
      },
    });
    return NextResponse.json({ calendar: updated });
  }

  // Full reset — for a calendar stuck in an inconsistent billing
  // state (leftover Paystack fields with nothing real behind them
  // anymore). Doesn't touch posts, collaborators, or anything else —
  // only the billing fields, same scope as the creator-level reset.
  if (action === "reset_billing") {
    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        billingStatus: "PENDING_SETUP",
        paystackCustomerCode: null,
        paystackSubscriptionCode: null,
        paystackEmailToken: null,
        subscriptionRenewsAt: null,
        pendingSubscriptionRef: null,
        wentOfflineAt: null,
        lastPaymentReminderSentAt: null,
      },
    });
    return NextResponse.json({ calendar: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}