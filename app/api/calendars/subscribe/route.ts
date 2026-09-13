import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";
import {
  CONTENT_WORKSPACE_PLANS,
  getContentWorkspacePlanCode,
  type ContentWorkspaceBillingCycle,
  type ContentWorkspacePlan,
} from "@/lib/contentWorkspaceEntitlements";

function resolvePlan(
  value: unknown
): ContentWorkspacePlan | null {
  if (value === "CREATOR" || value === "STUDIO") {
    return value;
  }

  return null;
}

function resolveBillingCycle(
  value: unknown
): ContentWorkspaceBillingCycle {
  return value === "ANNUAL" ? "ANNUAL" : "MONTHLY";
}

// POST — starts or restarts the account-level Content Workspace
// subscription.
//
// Billing belongs to the Content Workspace product as a whole,
// not to an individual calendar/workspace.
//
// Creator:
//   ₦2,800/month
//
// Studio:
//   ₦15,000/month
//
// AI is included in both plans.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    plan?: unknown;
    billingCycle?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    // An empty body is allowed because the account may already
    // have a Content Workspace plan saved.
  }

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
      contentWorkspacePendingSubscriptionRef: true,

      isComped: true,

      // Temporary backwards compatibility for accounts created
      // under the previous Individual/Company Calendar billing.
      calendarAccountType: true,
    },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (creator.isComped) {
    return NextResponse.json(
      {
        error:
          "Your Content Workspace access is already provided by your account.",
      },
      { status: 400 }
    );
  }

  if (
    creator.contentWorkspaceBillingStatus === "ACTIVE"
  ) {
    return NextResponse.json(
      {
        error:
          "Your Content Workspace subscription is already active",
      },
      { status: 400 }
    );
  }

  /*
   * Resolve the plan.
   *
   * New requests should send `plan`.
   * Existing accounts already have contentWorkspacePlan.
   *
   * As a temporary migration fallback:
   * INDIVIDUAL -> CREATOR
   * COMPANY    -> STUDIO
   */
  let plan =
    resolvePlan(body.plan) ??
    creator.contentWorkspacePlan;

  if (!plan) {
    if (creator.calendarAccountType === "INDIVIDUAL") {
      plan = "CREATOR";
    } else if (creator.calendarAccountType === "COMPANY") {
      plan = "STUDIO";
    }
  }

  if (!plan) {
    return NextResponse.json(
      {
        error:
          "Choose a Content Workspace plan first: Creator or Studio",
      },
      { status: 400 }
    );
  }

  /*
   * Resolve billing cycle.
   *
   * Monthly remains the default so existing callers that don't
   * provide a cycle continue to work.
   */
  const billingCycle = resolveBillingCycle(
    body.billingCycle ??
      creator.contentWorkspaceBillingCycle
  );

  const planConfig =
    CONTENT_WORKSPACE_PLANS[plan];

  let planCode: string;

  try {
    planCode = getContentWorkspacePlanCode(
      plan,
      billingCycle
    );
  } catch (error) {
    console.error(
      "Content Workspace Paystack plan configuration error:",
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

  const amountNgn =
    billingCycle === "ANNUAL"
      ? planConfig.priceNgnAnnual
      : planConfig.priceNgnMonthly;

  const reference =
    `showwork_content_workspace_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,

      callbackUrl:
        `${appUrl()}/dashboard/calendars` +
        `?subscriptionPayment=callback`,

      planCode,

      // Paystack expects kobo.
      amount: amountNgn * 100,

      metadata: {
        creatorId: creator.id,
        contentWorkspacePlan: plan,
        billingCycle,
      },
    });

    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePlan: plan,
        contentWorkspaceBillingCycle: billingCycle,
        contentWorkspacePendingSubscriptionRef: reference,
      },
    });

    return NextResponse.json({
      authorizationUrl:
        result.data.authorization_url,
      plan,
      billingCycle,
    });
  } catch (error) {
    console.error(
      "Content Workspace subscribe initialize error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to start payment — try again",
      },
      { status: 500 }
    );
  }
}