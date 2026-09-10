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
// client workspace.
//
// Calendar billing is account-level:
// one calendar subscription covers every workspace owned
// by the creator.
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

  let body: { action?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { action } = body;

  // ─────────────────────────────────────────────
  // GRANT FREE AI ASSISTANT MONTH
  // ─────────────────────────────────────────────
  //
  // Same mechanics as grant_free_month below, but for the AI content
  // assistant add-on specifically — a completely separate
  // subscription from calendar billing. Granting this never touches
  // calendarBillingStatus or anything else calendar-related; it only
  // ever sets the account's AI assistant billing fields.
  //
  if (action === "grant_free_ai_month") {
    const now = new Date();

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const updated = await db.creator.update({
      where: {
        id: calendar.managerId,
      },
      data: {
        aiAssistantBillingStatus: "ACTIVE",
        aiAssistantSubscriptionRenewsAt: oneMonthFromNow,
        aiAssistantWentOfflineAt: null,
      },
      select: {
        id: true,
        aiAssistantBillingStatus: true,
        aiAssistantSubscriptionRenewsAt: true,
      },
    });

    return NextResponse.json({
      creator: updated,
      message: "One free month of the AI content assistant granted for this account.",
    });
  }

  // ─────────────────────────────────────────────
  // GRANT FREE MONTH
  // ─────────────────────────────────────────────
  //
  // Billing belongs to Creator, so this grants one
  // month of calendar access to the entire account.
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
  // Resets the account-level calendar billing state.
  //
  // This does NOT delete workspaces, posts,
  // collaborators, or any other calendar data.
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