import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { processReferralCommission } from "@/lib/partnerCommissions";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import {
  contentWorkspacePlanFromPaystackPlanCode,
  type ContentWorkspacePlan,
  type ContentWorkspaceBillingCycle,
} from "@/lib/contentWorkspaceEntitlements";

// POST — called after Paystack redirects back from the Content
// Workspace subscription checkout.
//
// Content Workspace billing belongs to the creator account,
// not to an individual calendar.
//
// The webhook remains the primary source of subscription data.
// This direct verification is a fallback for the case where Paystack
// has confirmed payment but the webhook has not reached us yet.
export async function POST() {
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
      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspacePaystackCustomerCode: true,
      contentWorkspacePaystackSubscriptionCode: true,
      contentWorkspacePaystackEmailToken: true,
      contentWorkspacePendingSubscriptionRef: true,
    },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  /*
   * If the webhook already activated the subscription,
   * there is nothing else to do.
   */
  if (
    creator.contentWorkspaceBillingStatus === "ACTIVE" &&
    creator.contentWorkspacePaystackSubscriptionCode
  ) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
    });
  }

  if (!creator.contentWorkspacePendingSubscriptionRef) {
    return NextResponse.json(
      {
        error:
          "No payment has been started for this account yet",
      },
      { status: 400 }
    );
  }

  const pendingReference =
    creator.contentWorkspacePendingSubscriptionRef;

  try {
    const verification = await verifyTransaction(
      pendingReference
    );

    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === pendingReference;

    if (!isActuallySuccessful) {
      return NextResponse.json(
        {
          error:
            "Payment not yet confirmed by Paystack",
          verifiedStatus:
            verification?.data?.status ?? null,
        },
        { status: 402 }
      );
    }

    /*
     * Determine the plan from the Paystack transaction.
     *
     * The transaction's plan code is the authoritative billing
     * identifier. Metadata is used as a fallback because the
     * checkout route also sends the Content Workspace plan.
     */
    const transactionPlanCode =
      typeof verification?.data?.plan === "string"
        ? verification.data.plan
        : verification?.data?.plan?.plan_code ?? null;

    const planFromPaystack =
      transactionPlanCode
        ? contentWorkspacePlanFromPaystackPlanCode(
            transactionPlanCode
          )
        : null;

    const metadata = verification?.data?.metadata;

    const metadataPlan =
      metadata?.contentWorkspacePlan === "CREATOR" ||
      metadata?.contentWorkspacePlan === "STUDIO"
        ? (metadata.contentWorkspacePlan as ContentWorkspacePlan)
        : null;

    const metadataCycle =
      metadata?.billingCycle === "MONTHLY" ||
      metadata?.billingCycle === "ANNUAL"
        ? (metadata.billingCycle as ContentWorkspaceBillingCycle)
        : null;

    const plan =
      planFromPaystack?.plan ??
      metadataPlan ??
      creator.contentWorkspacePlan;

    const cycle =
      planFromPaystack?.cycle ??
      metadataCycle ??
      creator.contentWorkspaceBillingCycle ??
      "MONTHLY";

    /*
     * We should never activate a Content Workspace subscription
     * without being able to identify its plan.
     */
    if (!plan) {
      console.error(
        "Content Workspace payment verified but plan could not be determined",
        {
          creatorId: creator.id,
          reference: pendingReference,
          transactionPlanCode,
          metadataPlan,
        }
      );

      return NextResponse.json(
        {
          error:
            "Payment was received, but the Content Workspace plan could not be identified. Contact support.",
        },
        { status: 500 }
      );
    }

    /*
     * Activate the account-level Content Workspace subscription.
     */
    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePlan: plan,
        contentWorkspaceBillingStatus: "ACTIVE",
        contentWorkspaceBillingCycle: cycle,
        contentWorkspacePaystackCustomerCode:
          verification?.data?.customer?.customer_code ?? null,
        contentWorkspaceWentOfflineAt: null,
      },
    });

    /*
     * Record the initial payment.
     *
     * The webhook can also receive the same payment.
     * paystackReference is unique, so a duplicate webhook/payment
     * record will be safely ignored below.
     */
    let paymentRecord;

try {
  paymentRecord = await db.paymentRecord.create({
    data: {
      creatorId: creator.id,
      amountNgn: Math.round(
        (verification?.data?.amount ?? 0) / 100
      ),
      type: "CONTENT_WORKSPACE_SUBSCRIPTION_INITIAL",
      contentWorkspacePlan: plan,
      paystackReference: pendingReference,
    },
  });
} catch (err) {
  console.error(
    `PaymentRecord already exists during direct Content Workspace subscription verification (creator ${creator.id})`,
    err
  );

  paymentRecord = await db.paymentRecord.findUnique({
    where: {
      paystackReference: pendingReference,
    },
  });
}

if (paymentRecord) {
  try {
    await processReferralCommission(paymentRecord);
  } catch (err) {
    console.error(
      `Failed to process partner commission for Content Workspace payment ${paymentRecord.id}`,
      err
    );
  }
}
    return NextResponse.json({
      ok: true,
      alreadyActive: false,
      plan,
      billingCycle: cycle,
    });
  } catch (err) {
    console.error(
      "Direct Content Workspace subscription verification failed:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Couldn't verify payment — try again",
      },
      { status: 500 }
    );
  }
}