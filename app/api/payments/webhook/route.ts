import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { tierFromPlanCode } from "@/lib/subscriptionTiers";

// Pulls the plan_code out of a Paystack event payload, whether it comes
// through as a plain string or a nested plan object — different event
// types shape this slightly differently.
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

  // ── One-time project payments (legacy per-project model — kept
  //    working for any project still paid this way) ──
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
      }
    }
  }

  // ── Subscription created (the first successful charge on a plan) ──
  if (event.event === "subscription.create") {
    const data = event.data;
    const customerEmail: string | undefined = data?.customer?.email;
    const planCode = extractPlanCode(data);
    const tier = planCode ? tierFromPlanCode(planCode) : null;

    if (customerEmail && tier) {
      await db.creator.updateMany({
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
    }
  }

  // ── Renewal charge succeeded (recurring charges also fire
  //    charge.success, distinguishable by carrying a plan reference) ──
  if (event.event === "charge.success" && extractPlanCode(event.data)) {
    const customerEmail: string | undefined = event.data?.customer?.email;
    const planCode = extractPlanCode(event.data);
    const tier = planCode ? tierFromPlanCode(planCode) : null;

    if (customerEmail && tier) {
      await db.creator.updateMany({
        where: { email: customerEmail },
        data: {
          subscriptionActive: true,
          subscriptionTier: tier,
          currentCycleStart: new Date(), // a new billing cycle just began
        },
      });
    }
  }

  // ── Renewal charge failed — Paystack does not retry subscription
  //    charges, so this is final for that billing cycle ──
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