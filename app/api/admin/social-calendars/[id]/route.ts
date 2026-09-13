import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { ContentWorkspacePlan } from "@prisma/client";

async function requireAdmin() {
  const creator = await getCurrentCreator();

  if (!creator || !isAdminEmail(creator.email)) {
    return null;
  }

  return creator;
}

// PATCH — admin billing controls for the account that owns a
// client workspace. Content Workspace billing is account-level:
// one subscription covers every workspace owned by the creator.
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
      manager: {
        select: {
          id: true,
          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          contentWorkspaceBillingCycle: true,
          contentWorkspacePaystackCustomerCode: true,
          contentWorkspacePaystackSubscriptionCode: true,
          contentWorkspacePaystackEmailToken: true,
          contentWorkspaceSubscriptionRenewsAt: true,
          contentWorkspacePendingSubscriptionRef: true,
          contentWorkspaceTrialUsedAt: true,
          contentWorkspaceTrialEndsAt: true,
          contentWorkspaceWentOfflineAt: true,
        },
      },
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
  // Content Workspace billing lives on Creator, not SocialCalendar.
  // Granting a free month therefore gives the entire account
  // one month of Content Workspace access across all workspaces.
  //
  // AI Studio is included automatically because it is part of
  // the Content Workspace subscription.
  //
  if (action === "grant_free_month") {
    const now = new Date();

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const plan: ContentWorkspacePlan =
      calendar.manager.contentWorkspacePlan ?? "CREATOR";

    const updated = await db.creator.update({
      where: {
        id: calendar.managerId,
      },
      data: {
        contentWorkspacePlan: plan,
        contentWorkspaceBillingStatus: "ACTIVE",
        contentWorkspaceSubscriptionRenewsAt: oneMonthFromNow,
        contentWorkspaceWentOfflineAt: null,
        contentWorkspaceTrialEndsAt: null,
        contentWorkspacePendingSubscriptionRef: null,
      },
      select: {
        id: true,
        contentWorkspacePlan: true,
        contentWorkspaceBillingStatus: true,
        contentWorkspaceBillingCycle: true,
        contentWorkspaceSubscriptionRenewsAt: true,
        contentWorkspaceTrialEndsAt: true,
      },
    });

    return NextResponse.json({
      creator: updated,
      message:
        "One free month granted for the account's Content Workspace access.",
    });
  }

  // ─────────────────────────────────────────────
  // RESET BILLING
  // ─────────────────────────────────────────────
  //
  // Completely resets the account's Content Workspace billing state.
  // This does NOT delete or modify any client workspaces, posts,
  // collaborators, AI history, documents, or other workspace data.
  //
  if (action === "reset_billing") {
    const updated = await db.creator.update({
      where: {
        id: calendar.managerId,
      },
      data: {
        contentWorkspaceBillingStatus: "PENDING_SETUP",
        contentWorkspacePaystackCustomerCode: null,
        contentWorkspacePaystackSubscriptionCode: null,
        contentWorkspacePaystackEmailToken: null,
        contentWorkspaceSubscriptionRenewsAt: null,
        contentWorkspacePendingSubscriptionRef: null,
        contentWorkspaceWentOfflineAt: null,
        contentWorkspaceTrialEndsAt: null,
      },
      select: {
        id: true,
        contentWorkspacePlan: true,
        contentWorkspaceBillingStatus: true,
        contentWorkspaceBillingCycle: true,
        contentWorkspaceSubscriptionRenewsAt: true,
        contentWorkspaceTrialEndsAt: true,
      },
    });

    return NextResponse.json({
      creator: updated,
      message: "Content Workspace billing has been reset for the account.",
    });
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 }
  );
}