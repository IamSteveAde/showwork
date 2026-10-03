import { calendarPaymentReturn } from "@/lib/calendarPaymentReturn";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  initializeSubscription,
} from "@/lib/paystack";
import {
  getContentWorkspacePlanCode,
  CONTENT_WORKSPACE_PLANS,
  isHigherContentWorkspacePlan,
  type ContentWorkspacePlan,
  type ContentWorkspaceBillingCycle,
} from "@/lib/contentWorkspaceEntitlements";


function resolveBillingCycle(
  value: unknown,
  fallback: ContentWorkspaceBillingCycle | null
): ContentWorkspaceBillingCycle {
  if (value === "ANNUAL") {
    return "ANNUAL";
  }

  if (value === "MONTHLY") {
    return "MONTHLY";
  }

  return fallback === "ANNUAL" ? "ANNUAL" : "MONTHLY";
}

// POST — switches to any lower Content Workspace plan after checking its workspace limit.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  if (body.plan !== undefined && body.plan !== "CREATOR" && body.plan !== "STUDIO") {
    return NextResponse.json({ error: "Choose Creator or Studio to downgrade." }, { status: 400 });
  }
  const targetPlan: ContentWorkspacePlan = body.plan === "STUDIO" ? "STUDIO" : "CREATOR";
  const limits = CONTENT_WORKSPACE_PLANS[targetPlan];

  const payNow =
    body?.payNow === true;

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

  if (!creator.contentWorkspacePlan || !isHigherContentWorkspacePlan(creator.contentWorkspacePlan, targetPlan)) {
    return NextResponse.json({ error: "Choose a lower plan to downgrade." }, { status: 400 });
  }

  /*
   * The target plan must support the existing active workspaces.
   *
   * Collaborators are allowed on Creator, so we deliberately
   * do not block this downgrade based on collaborators or
   * pending invites.
   */
  const activeWorkspaceCount =
    await db.socialCalendar.count({
      where: {
        managerId: creator.id,
      },
    });

  if (activeWorkspaceCount > limits.activeWorkspaces) {
    return NextResponse.json(
      {
        error:
          `${limits.name} supports ${limits.activeWorkspaces} active client workspace${limits.activeWorkspaces === 1 ? "" : "s"}. Remove your extra workspaces before switching to ${limits.name}.`,
        activeWorkspaceCount,
        allowedWorkspaceCount: limits.activeWorkspaces,
      },
      { status: 400 }
    );
  }

  /*
   * IMPORTANT:
   *
   * If the frontend explicitly sends a billing cycle,
   * that choice wins.
   *
   * Only fall back to the account's existing cycle when
   * no billing cycle was supplied.
   */
  const billingCycle =
    resolveBillingCycle(
      body?.billingCycle,
      creator.contentWorkspaceBillingCycle
    );

  const trialStillValid =
    creator.contentWorkspaceBillingStatus === "TRIAL" &&
    !!creator.contentWorkspaceTrialEndsAt &&
    creator.contentWorkspaceTrialEndsAt.getTime() >
      Date.now();

  /*
   * During an active trial, payment is optional unless the user
   * explicitly chooses to pay immediately.
   */
  if (trialStillValid && !payNow) {
    await db.creator.update({ where: { id: creator.id }, data: {
      contentWorkspacePlan: targetPlan, contentWorkspaceBillingCycle: billingCycle,
    } });
    return NextResponse.json({
      ok: true,
      requiresPayment: false,
      stillInTrial: true,
      plan: targetPlan,
      billingCycle,
    });
  }

  /*
   * Resolve the Paystack plan using the EXACT billing cycle
   * selected by the customer.
   */
  let creatorPlanCode: string;

  try {
    creatorPlanCode = getContentWorkspacePlanCode(
      targetPlan,
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

  // The subscription webhook cancels the previous subscription after payment.

  const reference =
    `showwork_content_workspace_sub_${creator.id}_${randomUUID()}`;

  const amount =
    billingCycle === "ANNUAL"
      ? limits.priceNgnAnnual
      : limits.priceNgnMonthly;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,

      callbackUrl:
        await calendarPaymentReturn(req, creator.id),

      planCode: creatorPlanCode,

      // Paystack expects kobo.
      amount: amount * 100,

      metadata: {
        creatorId: creator.id,
        contentWorkspacePlan: targetPlan,
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
      authorizationUrl:
        result.data.authorization_url,
      requiresPayment: true,
      plan: targetPlan,
      billingCycle,
    });
  } catch (error) {
    console.error(
      "Content Workspace Creator downgrade checkout initialize error:",
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