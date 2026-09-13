import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  initializeSubscription,
  cancelSubscription,
} from "@/lib/paystack";
import { appUrl } from "@/lib/url";
import {
  getContentWorkspacePlanCode,
  type ContentWorkspaceBillingCycle,
} from "@/lib/contentWorkspaceEntitlements";

const CREATOR_MONTHLY_NGN = 2800;
const CREATOR_ANNUAL_NGN = 31920;

// POST — switches a Studio Content Workspace account back to Creator.
//
// Creator allows collaboration, so collaborators and pending invites
// are NOT blockers.
//
// The Creator plan supports only 1 active client workspace, so the
// account must reduce its active workspaces to 1 or fewer before
// downgrading.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { payNow } = await req.json().catch(() => ({
    payNow: false,
  }));

  const creator = await db.creator.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,
      email: true,

      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspaceTrialEndsAt: true,

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

  if (creator.contentWorkspacePlan !== "STUDIO") {
    return NextResponse.json(
      {
        error:
          "Your Content Workspace account is already on Creator",
      },
      { status: 400 }
    );
  }

  /*
   * Creator supports only 1 active client workspace.
   *
   * Collaborators are allowed on Creator, so we deliberately do not
   * block this downgrade based on collaborators or pending invites.
   */
  const activeWorkspaceCount = await db.socialCalendar.count({
    where: {
      managerId: creator.id,
    },
  });

  if (activeWorkspaceCount > 1) {
    return NextResponse.json(
      {
        error:
          "Creator supports 1 active client workspace. Remove or deactivate your extra workspaces before switching to Creator.",
        activeWorkspaceCount,
        allowedWorkspaceCount: 1,
      },
      { status: 400 }
    );
  }

  /*
   * Preserve the current billing cycle where possible.
   *
   * If no cycle has been established yet, use monthly.
   */
  const billingCycle: ContentWorkspaceBillingCycle =
    creator.contentWorkspaceBillingCycle === "ANNUAL"
      ? "ANNUAL"
      : "MONTHLY";

  /*
   * Change the selected plan immediately.
   */
  await db.creator.update({
    where: {
      id: creator.id,
    },
    data: {
      contentWorkspacePlan: "CREATOR",
    },
  });

  const trialStillValid =
    creator.contentWorkspaceBillingStatus === "TRIAL" &&
    !!creator.contentWorkspaceTrialEndsAt &&
    creator.contentWorkspaceTrialEndsAt.getTime() > Date.now();

  /*
   * During an active trial, payment is optional unless the user
   * explicitly chooses to pay immediately.
   */
  if (trialStillValid && !payNow) {
    return NextResponse.json({
      ok: true,
      requiresPayment: false,
      stillInTrial: true,
      plan: "CREATOR",
      billingCycle,
    });
  }

  let creatorPlanCode: string;

  try {
    creatorPlanCode = getContentWorkspacePlanCode(
      "CREATOR",
      billingCycle
    );
  } catch (error) {
    console.error(
      "Content Workspace Creator Paystack plan code is not configured:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Billing isn't configured yet — contact support",
      },
      { status: 500 }
    );
  }

  /*
   * Cancel the existing Studio subscription before starting the
   * Creator subscription.
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
      /*
       * Preserve the previous behavior: a Paystack cancellation
       * failure should not prevent the customer from attempting
       * the new checkout.
       */
      console.error(
        "Failed to cancel previous Content Workspace subscription during Creator downgrade:",
        error
      );
    }
  }

  const reference =
    `showwork_content_workspace_sub_${creator.id}_${randomUUID()}`;

  const amount =
    billingCycle === "ANNUAL"
      ? CREATOR_ANNUAL_NGN
      : CREATOR_MONTHLY_NGN;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl:
        `${appUrl()}/dashboard/calendars?subscriptionPayment=callback`,
      planCode: creatorPlanCode,
      amount: amount * 100,
      metadata: {
        creatorId: creator.id,
        contentWorkspacePlan: "CREATOR",
        billingCycle,
      },
    });

    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePendingSubscriptionRef: reference,
        contentWorkspaceBillingCycle: billingCycle,
      },
    });

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      requiresPayment: true,
      plan: "CREATOR",
      billingCycle,
    });
  } catch (error) {
    console.error(
      "Content Workspace Creator downgrade checkout initialize error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to start payment — try again",
      },
      { status: 500 }
    );
  }
}