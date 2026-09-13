import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSubscription } from "@/lib/paystack";

// POST — deliberate, self-service cancellation of the account-level
// Content Workspace subscription.
//
// A deliberate cancellation is different from a failed renewal:
// - OFFLINE = payment failed
// - PENDING_SETUP = subscription deliberately cancelled
//
// Cancelling the Content Workspace subscription affects the whole
// Content Workspace product for the account, including all workspaces
// and included AI access.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const creator = await db.creator.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,

      contentWorkspaceBillingStatus: true,
      contentWorkspacePaystackSubscriptionCode: true,
      contentWorkspacePaystackEmailToken: true,
    },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (
    creator.contentWorkspaceBillingStatus !==
    "ACTIVE"
  ) {
    return NextResponse.json(
      {
        error:
          "You don't have an active Content Workspace subscription to cancel",
      },
      { status: 400 }
    );
  }

  /*
   * Cancel the actual Paystack subscription first.
   *
   * If Paystack cancellation fails, we leave the local subscription
   * active so the account isn't incorrectly locked out.
   */
  if (
    creator.contentWorkspacePaystackSubscriptionCode &&
    creator.contentWorkspacePaystackEmailToken
  ) {
    try {
      await cancelSubscription(
        creator.contentWorkspacePaystackSubscriptionCode,
        creator.contentWorkspacePaystackEmailToken
      );
    } catch (error) {
      console.error(
        "Failed to cancel Content Workspace subscription with Paystack:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to cancel with our payment provider — try again",
        },
        { status: 500 }
      );
    }
  }

  /*
   * Deliberate cancellation:
   *
   * PENDING_SETUP means there is no active paid subscription.
   * The plan itself is retained so that when the customer subscribes
   * again, we know which Content Workspace plan they were using.
   */
  await db.creator.update({
    where: {
      id: creator.id,
    },
    data: {
      contentWorkspaceBillingStatus:
        "PENDING_SETUP",

      contentWorkspaceSubscriptionRenewsAt:
        null,

      contentWorkspacePaystackSubscriptionCode:
        null,

      contentWorkspacePaystackEmailToken:
        null,

      contentWorkspaceWentOfflineAt:
        null,

      contentWorkspacePendingSubscriptionRef:
        null,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}