import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

async function requireAdmin() {
  const creator = await getCurrentCreator();
  if (!creator || !isAdminEmail(creator.email)) return null;
  return creator;
}

// PATCH — grant one free month, or fully reset billing back to a
// clean slate. Billing lives on the manager's account now, not the
// calendar itself — one subscription (or one trial) covers every
// calendar that account owns — so both actions here update the
// manager's Creator row, found via calendar.managerId, rather than
// the calendar directly.
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

    const updated = await db.creator.update({
      where: { id: calendar.managerId },
      data: {
        calendarBillingStatus: "ACTIVE",
        calendarSubscriptionRenewsAt: oneMonthFromNow,
        calendarWentOfflineAt: null,
        calendarLastPaymentReminderSentAt: null,
        calendarLastFreeMonthGrantedAt: now,
      },
    });
    return NextResponse.json({ creator: updated });
  }

  // Full reset — for an account stuck in an inconsistent billing
  // state (leftover Paystack fields with nothing real behind them
  // anymore). Doesn't touch posts, collaborators, or anything else —
  // only the billing fields, and affects every calendar this manager
  // owns, not just the one this route happened to be reached
  // through, since billing is account-wide.
  if (action === "reset_billing") {
    const updated = await db.creator.update({
      where: { id: calendar.managerId },
      data: {
        calendarBillingStatus: "PENDING_SETUP",
        calendarPaystackCustomerCode: null,
        calendarPaystackSubscriptionCode: null,
        calendarPaystackEmailToken: null,
        calendarSubscriptionRenewsAt: null,
        calendarPendingSubscriptionRef: null,
        calendarWentOfflineAt: null,
        calendarLastPaymentReminderSentAt: null,
      },
    });
    return NextResponse.json({ creator: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}