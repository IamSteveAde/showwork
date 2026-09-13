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

const STUDIO_MONTHLY_NGN = 15000;
const STUDIO_ANNUAL_NGN = 171000;

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

// POST — switches a Creator Content Workspace account to Studio.
//
// If the account is still inside its valid 3-day trial, the switch can
// happen without immediate payment unless `payNow` is true.
//
// If the account is already paying, has an expired trial, is pending
// setup, or is offline, a new Studio subscription checkout is required.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

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

  if (creator.contentWorkspacePlan === "STUDIO") {
    return NextResponse.json({
      ok: true,
      alreadyStudio: true,
    });
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

  /*
   * Update the selected plan and billing cycle immediately.
   *
   * This records the customer's intended Content Workspace
   * configuration even before payment is completed.
   */
  await db.creator.update({
    where: {
      id: creator.id,
    },
    data: {
      contentWorkspacePlan: "STUDIO",
      contentWorkspaceBillingCycle: billingCycle,
    },
  });

  const trialStillValid =
    creator.contentWorkspaceBillingStatus === "TRIAL" &&
    !!creator.contentWorkspaceTrialEndsAt &&
    creator.contentWorkspaceTrialEndsAt.getTime() >
      Date.now();

  /*
   * During an active trial, changing from Creator to Studio
   * does not require immediate payment unless the user
   * explicitly chooses `payNow`.
   */
  if (trialStillValid && !payNow) {
    return NextResponse.json({
      ok: true,
      requiresPayment: false,
      stillInTrial: true,
      plan: "STUDIO",
      billingCycle,
    });
  }

  /*
   * Resolve the Paystack plan using the EXACT billing cycle
   * selected by the customer.
   */
  let studioPlanCode: string;

  try {
    studioPlanCode = getContentWorkspacePlanCode(
      "STUDIO",
      billingCycle
    );
  } catch (error) {
    console.error(
      "Content Workspace Studio Paystack plan code is not configured:",
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
   * If there is an existing Content Workspace subscription,
   * cancel it before creating the new Studio subscription.
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
       * Preserve existing behavior: cancellation failure should
       * not prevent the customer from attempting the new checkout.
       */
      console.error(
        "Failed to cancel previous Content Workspace subscription during Studio upgrade:",
        error
      );
    }
  }

  const reference =
    `showwork_content_workspace_sub_${creator.id}_${randomUUID()}`;

  const amount =
    billingCycle === "ANNUAL"
      ? STUDIO_ANNUAL_NGN
      : STUDIO_MONTHLY_NGN;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,

      callbackUrl:
        `${appUrl()}/dashboard/calendars?subscriptionPayment=callback`,

      planCode: studioPlanCode,

      // Paystack expects kobo.
      amount: amount * 100,

      metadata: {
        creatorId: creator.id,
        contentWorkspacePlan: "STUDIO",
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
      plan: "STUDIO",
      billingCycle,
    });
  } catch (error) {
    console.error(
      "Content Workspace Studio upgrade checkout initialize error:",
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