import { syncContentWorkspaceRenewal } from "@/lib/syncContentWorkspaceRenewal";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import {
  tierFromPlanCode,
  type BillingCycle,
} from "@/lib/subscriptionTiers";
import {
  verifyTransaction,
  fetchCustomerSubscriptions,
  cancelSubscription,
} from "@/lib/paystack";
import BillingSubscriptions from "./BillingSubscriptions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment?: string;
    reference?: string;
    trxref?: string;

    product?: string;

    tier?: string;
    cycle?: string;
  }>;
}) {
  const {
    payment,
    reference,
    trxref,
    product: productParam,
    tier: selectedTierParam,
    cycle: cycleParam,
  } = await searchParams;

  /*
   * ------------------------------------------------------------
   * PRODUCT CONTEXT
   * ------------------------------------------------------------
   *
   * delivery
   * content-workspace
   *
   * The product query parameter lets every CTA return the user
   * to the exact subscription they were trying to purchase.
   */
  const selectedProduct =
    productParam === "content-workspace"
      ? "content-workspace"
      : "delivery";

  /*
   * ------------------------------------------------------------
   * BILLING CYCLE
   * ------------------------------------------------------------
   *
   * Monthly is the default; explicit annual links keep their selection.
   */
  const selectedCycle: BillingCycle =
    cycleParam === "ANNUAL" ? "ANNUAL" : "MONTHLY";

  /*
   * ------------------------------------------------------------
   * AUTH
   * ------------------------------------------------------------
   *
   * If someone arrives at Billing while logged out, preserve:
   *
   * - product
   * - tier
   * - billing cycle
   *
   * through login.
   *
   * This is what makes:
   *
   * Subscribe
   * → Login
   * → return to exact subscription
   *
   * work correctly.
   */
  let creator = await getCurrentCreator();

  if (!creator) {
    const params = new URLSearchParams();

    params.set("product", selectedProduct);

    if (selectedTierParam) {
      params.set("tier", selectedTierParam);
    }

    params.set("cycle", selectedCycle);

    const nextUrl = `/dashboard/billing?${params.toString()}`;

    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  /*
   * ------------------------------------------------------------
   * PROJECT DELIVERY PAYMENT CALLBACK
   * ------------------------------------------------------------
   *
   * Paystack returns here after checkout.
   *
   * The webhook remains the normal source of truth, but this
   * callback gives us a fallback confirmation path, especially
   * useful during local development.
   */
  const ref = reference ?? trxref;

  let paymentVerified = false;
  if (selectedProduct === "delivery" && payment === "callback" && ref &&
      ref.startsWith(`showwork_sub_${creator.id}_`)) {
    try {
      const verification = await verifyTransaction(ref);

      const isSuccessful =
        verification?.data?.status === "success";

      const planCode: string | undefined =
        typeof verification?.data?.plan === "string"
          ? verification.data.plan
          : verification?.data?.plan?.plan_code;

      const match = planCode
        ? tierFromPlanCode(planCode)
        : null;
        console.log("Showwork subscription callback verification:", {
  reference: ref,
  verificationStatus: verification?.data?.status ?? null,
  planCode,
  match,
  customerCode: verification?.data?.customer?.customer_code ?? null,
});

      const customerCode =
        verification?.data?.customer?.customer_code;

      const paidAt = verification?.data?.paid_at;
      const alreadyProcessed = paidAt && creator.currentCycleStart &&
        new Date(paidAt).getTime() < creator.currentCycleStart.getTime();

      if (isSuccessful && match && customerCode && alreadyProcessed) {
        paymentVerified = true;
      }

      if (isSuccessful && match && customerCode && !alreadyProcessed) {
        const { tier, cycle } = match;

        const subs =
          await fetchCustomerSubscriptions(customerCode);

        const matchingSub = subs?.data?.find(
          (subscription: any) =>
            (typeof subscription.plan === "string"
              ? subscription.plan
              : subscription.plan?.plan_code) === planCode
        );

        /*
         * If the user switched Project Delivery plans,
         * cancel the previous Paystack subscription so they
         * don't get charged twice.
         */
        if (
          creator.paystackSubscriptionCode &&
          creator.paystackEmailToken &&
          matchingSub?.subscription_code &&
          creator.paystackSubscriptionCode !==
            matchingSub.subscription_code
        ) {
          try {
            await cancelSubscription(
              creator.paystackSubscriptionCode,
              creator.paystackEmailToken
            );
          } catch (error) {
            console.error(
              "Failed to cancel previous subscription during switch:",
              error
            );
          }
        }

        creator = await db.creator.update({
          where: {
            id: creator.id,
          },

          data: {
            subscriptionActive: true,
            subscriptionTier: tier,
            subscriptionCycle: cycle,

            paystackCustomerCode: customerCode,

            paystackSubscriptionCode:
              matchingSub?.subscription_code ?? null,

            paystackEmailToken:
              matchingSub?.email_token ?? null,

            subscriptionRenewsAt:
              matchingSub?.next_payment_date
                ? new Date(
                    matchingSub.next_payment_date
                  )
                : null,

            currentCycleStart: new Date(),
          },
        });
        paymentVerified = true;
      }
    } catch (error) {
      console.error(
        "Subscription callback verification error:",
        error
      );
    }
  }

  // Remove the transaction from the URL so refreshes and cancellation cannot
  // replay an old checkout and restore the previous plan.
  if (paymentVerified) {
    redirect(`/dashboard/billing?product=delivery&cycle=${creator.subscriptionCycle ?? selectedCycle}`);
  }

  /*
   * ------------------------------------------------------------
   * FETCH CURRENT BILLING STATE
   * ------------------------------------------------------------
   */

  const [
    usage,
    workspaceBilling,
  ] = await Promise.all([
    getCreatorUsage(creator),

    db.creator.findUnique({
      where: {
        id: creator.id,
      },

      select: {
  contentWorkspacePlan: true,
  contentWorkspaceBillingStatus: true,
  contentWorkspaceBillingCycle: true,
  contentWorkspaceTrialUsedAt: true,
  contentWorkspaceTrialEndsAt: true,
  contentWorkspaceSubscriptionRenewsAt: true,
  isComped: true,
  compedUntil: true,
},
    }),

  ]);

  if (workspaceBilling?.contentWorkspaceBillingStatus === "ACTIVE") {
    workspaceBilling.contentWorkspaceSubscriptionRenewsAt = await syncContentWorkspaceRenewal(creator.id);
  }

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <BillingSubscriptions
      creator={{
        name: creator.name,
        email: creator.email,
      }}
      usage={usage}
      workspaceBilling={workspaceBilling}
      selectedProduct={selectedProduct}
      selectedTier={selectedTierParam ?? null}
      selectedCycle={selectedCycle}
    />
  );
}
