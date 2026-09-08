import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

async function requireAdmin() {
  const creator = await getCurrentCreator();

  if (!creator || !isAdminEmail(creator.email)) {
    return null;
  }

  return creator;
}

// PATCH — admin billing controls for the account that owns a
// client workspace. Calendar billing is account-level: one
// calendar subscription covers every workspace owned by the creator.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Find the client workspace and its owner.
  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    select: {
      id: true,
      managerId: true,
    },
  });

  if (!calendar) {
    return NextResponse.json(
      { error: "Client workspace not found" },
      { status: 404 }
    );
  }

  const { action } = await req.json();

  // ─────────────────────────────────────────────
  // GRANT FREE MONTH
  // ─────────────────────────────────────────────
  //
  // Calendar billing lives on Creator, not SocialCalendar.
  // Granting a free month therefore gives the entire account
  // one month of calendar access across all of its workspaces.
  //
  if (action === "grant_free_month") {
    const now = new Date();

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const updated = await db.creator.update({
      where: {
        id: calendar.managerId,
      },
      data: {
        calendarBillingStatus: "ACTIVE",
        calendarSubscriptionRenewsAt: oneMonthFromNow,
        calendarWentOfflineAt: null,
        calendarLastPaymentReminderSentAt: null,
        calendarTrialEndsAt: null,
      },
      select: {
        id: true,
        calendarAccountType: true,
        calendarBillingStatus: true,
        calendarSubscriptionRenewsAt: true,
        calendarTrialEndsAt: true,
      },
    });

    return NextResponse.json({
      creator: updated,
      message:
        "One free month granted for the account's calendar access.",
    });
  }

  // ─────────────────────────────────────────────
  // RESET BILLING
  // ─────────────────────────────────────────────
  //
  // Completely resets the account's calendar billing state.
  // This does NOT delete or modify any client workspaces,
  // posts, collaborators, or other calendar data.
  //
  if (action === "reset_billing") {
    const updated = await db.creator.update({
      where: {
        id: calendar.managerId,
      },
      data: {
        calendarBillingStatus: "PENDING_SETUP",
        calendarPaystackCustomerCode: null,
        calendarPaystackSubscriptionCode: null,
        calendarPaystackEmailToken: null,
        calendarSubscriptionRenewsAt: null,
        calendarPendingSubscriptionRef: null,
        calendarWentOfflineAt: null,
        calendarLastPaymentReminderSentAt: null,
        calendarTrialEndsAt: null,
      },
      select: {
        id: true,
        calendarAccountType: true,
        calendarBillingStatus: true,
        calendarSubscriptionRenewsAt: true,
        calendarTrialEndsAt: true,
      },
    });

    return NextResponse.json({
      creator: updated,
      message: "Calendar billing has been reset for the account.",
    });
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 }
  );
}