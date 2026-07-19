import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction, cancelSubscription } from "@/lib/paystack";
import { tierFromPlanCode } from "@/lib/subscriptionTiers";

function extractPlanCode(data: any): string | null {
  if (!data?.plan) return null;
  return typeof data.plan === "string" ? data.plan : data.plan?.plan_code ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Paystack webhook: invalid signature, rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // ── One-time project payments (legacy per-project model) ──
  if (event.event === "charge.success" && !extractPlanCode(event.data)) {
    const reference: string = event.data.reference;
    const verification = await verifyTransaction(reference);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === reference;

    if (isActuallySuccessful) {
      const project = await db.project.findUnique({ where: { paystackRef: reference } });
      if (project && !project.paid) {
        await db.project.update({
          where: { id: project.id },
          data: { paid: true, paidAt: new Date(), badgeVisible: false },
        });

        // Log the payment — this table is what revenue reporting reads from.
        await db.paymentRecord.create({
          data: {
            creatorId: project.creatorId,
            amountNgn: Math.round((verification?.data?.amount ?? 0) / 100),
            type: "PROJECT_ONE_TIME",
            paystackReference: reference,
          },
        });
      }
    }
  }

  // ── Subscription created (first charge on a plan — either a brand
  //    new subscriber, or someone switching to a different tier) ──
  if (event.event === "subscription.create") {
    const data = event.data;
    const customerEmail: string | undefined = data?.customer?.email;
    const planCode = extractPlanCode(data);
    const tier = planCode ? tierFromPlanCode(planCode) : null;

    if (customerEmail && tier) {
      const existing = await db.creator.findUnique({ where: { email: customerEmail } });

      if (
        existing?.paystackSubscriptionCode &&
        existing?.paystackEmailToken &&
        data.subscription_code &&
        existing.paystackSubscriptionCode !== data.subscription_code
      ) {
        try {
          await cancelSubscription(existing.paystackSubscriptionCode, existing.paystackEmailToken);
        } catch (err) {
          console.error("Failed to cancel previous subscription during switch:", err);
        }
      }

      const updated = await db.creator.update({
        where: { email: customerEmail },
        data: {
          subscriptionActive: true,
          subscriptionTier: tier,
          paystackCustomerCode: data.customer?.customer_code ?? null,
          paystackSubscriptionCode: data.subscription_code ?? null,
          paystackEmailToken: data.email_token ?? null,
          subscriptionRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
          currentCycleStart: new Date(),
        },
      });

      await db.paymentRecord.create({
        data: {
          creatorId: updated.id,
          amountNgn: Math.round((data.amount ?? 0) / 100),
          type: "SUBSCRIPTION_INITIAL",
          tier,
          paystackReference: data.reference ?? null,
        },
      });
    }
  }

  // ── Renewal charge succeeded ──
  if (event.event === "charge.success" && extractPlanCode(event.data)) {
    const customerEmail: string | undefined = event.data?.customer?.email;
    const planCode = extractPlanCode(event.data);
    const tier = planCode ? tierFromPlanCode(planCode) : null;

    if (customerEmail && tier) {
      const updated = await db.creator.update({
        where: { email: customerEmail },
        data: { subscriptionActive: true, subscriptionTier: tier, currentCycleStart: new Date() },
      });

      await db.paymentRecord.create({
        data: {
          creatorId: updated.id,
          amountNgn: Math.round((event.data.amount ?? 0) / 100),
          type: "SUBSCRIPTION_RENEWAL",
          tier,
          paystackReference: event.data.reference ?? null,
        },
      });
    }
  }

  // ── Renewal charge failed ──
  if (event.event === "invoice.payment_failed") {
    const customerEmail: string | undefined = event.data?.customer?.email;
    if (customerEmail) {
      await db.creator.updateMany({
        where: { email: customerEmail },
        data: { subscriptionActive: false },
      });
    }
  }

  // ── Subscription cancelled ──
  if (event.event === "subscription.disable") {
    const data = event.data;
    if (data?.subscription_code) {
      await db.creator.updateMany({
        where: { paystackSubscriptionCode: data.subscription_code },
        data: { subscriptionActive: false },
      });
    }
  }

  return NextResponse.json({ received: true });
}