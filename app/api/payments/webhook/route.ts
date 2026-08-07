import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction, cancelSubscription } from "@/lib/paystack";
import { tierFromPlanCode } from "@/lib/subscriptionTiers";

function extractPlanCode(data: any): string | null {
  if (!data?.plan) return null;
  return typeof data.plan === "string" ? data.plan : data.plan?.plan_code ?? null;
}

// Every creator lookup here goes through this — Paystack's
// customer.email and the email actually stored on the Creator record
// can differ only in casing or stray whitespace (a very common real
// mismatch), and Prisma's exact-match lookup treats those as
// completely different strings. Normalizing both sides before the
// lookup is what a silent "payment succeeded, nothing updated" bug
// most often actually is.
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Paystack webhook: invalid signature, rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  // Logged unconditionally, every time — this line alone is what
  // turns the next silent failure into something visible in your
  // server logs instead of a mystery.
  console.log(`Paystack webhook received: ${event.event}`, {
    reference: event.data?.reference,
    email: event.data?.customer?.email,
    planCode: extractPlanCode(event.data),
  });

  // ── One-time project payments (legacy per-project model) ──
  if (event.event === "charge.success" && !extractPlanCode(event.data)) {
    const reference: string = event.data.reference;
    const verification = await verifyTransaction(reference);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === reference;

    if (!isActuallySuccessful) {
      console.warn(`Paystack webhook: charge.success for ${reference} failed re-verification`, {
        verifiedStatus: verification?.data?.status,
      });
    } else {
      const project = await db.project.findUnique({ where: { paystackRef: reference } });
      if (!project) {
        console.warn(`Paystack webhook: no project found for reference ${reference}`);
      } else if (project.paid) {
        console.log(`Paystack webhook: project ${project.id} already marked paid, skipping (likely a retried webhook)`);
      } else {
        await db.project.update({
          where: { id: project.id },
          data: { paid: true, paidAt: new Date(), badgeVisible: false },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: project.creatorId,
              amountNgn: Math.round((verification?.data?.amount ?? 0) / 100),
              type: "PROJECT_ONE_TIME",
              paystackReference: reference,
            },
          });
        } catch (err) {
          // A duplicate reference (Paystack redelivering the same
          // webhook) would land here — logged, not swallowed, and
          // doesn't prevent the response below from confirming
          // receipt.
          console.error(`Paystack webhook: failed to create PaymentRecord for reference ${reference}`, err);
        }
      }
    }
  }

  // ── Subscription created (first charge on a plan — either a brand
  //    new subscriber, or someone switching to a different tier or
  //    billing cycle) ──
  if (event.event === "subscription.create") {
    const data = event.data;
    const customerEmail = normalizeEmail(data?.customer?.email);
    const planCode = extractPlanCode(data);
    const match = planCode ? tierFromPlanCode(planCode) : null;

    if (!customerEmail) {
      console.error("Paystack webhook: subscription.create had no customer email", { data });
    } else if (!match) {
      // This is almost certainly the actual bug if revenue silently
      // isn't updating — a plan code Paystack sent that this app's
      // tierFromPlanCode mapping doesn't recognize. Logged loudly so
      // it's impossible to miss in the logs, instead of the handler
      // just quietly doing nothing.
      console.error(
        `Paystack webhook: subscription.create with unrecognized plan code "${planCode}" — no matching tier, nothing was updated. Check that this plan code exists in tierFromPlanCode.`,
        { planCode, rawPlan: data?.plan }
      );
    } else {
      const { tier, cycle } = match;
      const existing = await db.creator.findFirst({
        where: { email: { equals: customerEmail, mode: "insensitive" } },
      });

      if (!existing) {
        console.error(`Paystack webhook: subscription.create for unknown email "${customerEmail}" — no matching Creator account.`);
      } else {
        if (
          existing.paystackSubscriptionCode &&
          existing.paystackEmailToken &&
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
          where: { id: existing.id },
          data: {
            subscriptionActive: true,
            subscriptionTier: tier,
            subscriptionCycle: cycle,
            paystackCustomerCode: data.customer?.customer_code ?? null,
            paystackSubscriptionCode: data.subscription_code ?? null,
            paystackEmailToken: data.email_token ?? null,
            subscriptionRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
            currentCycleStart: new Date(),
          },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: updated.id,
              amountNgn: Math.round((data.amount ?? 0) / 100),
              type: "SUBSCRIPTION_INITIAL",
              tier,
              cycle,
              paystackReference: data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for subscription.create (creator ${updated.id})`, err);
        }
      }
    }
  }

  // ── Renewal charge succeeded ──
  if (event.event === "charge.success" && extractPlanCode(event.data)) {
    const customerEmail = normalizeEmail(event.data?.customer?.email);
    const planCode = extractPlanCode(event.data);
    const match = planCode ? tierFromPlanCode(planCode) : null;

    if (!customerEmail) {
      console.error("Paystack webhook: renewal charge.success had no customer email", { data: event.data });
    } else if (!match) {
      console.error(
        `Paystack webhook: renewal charge.success with unrecognized plan code "${planCode}" — nothing was updated.`,
        { planCode }
      );
    } else {
      const { tier, cycle } = match;
      const existing = await db.creator.findFirst({
        where: { email: { equals: customerEmail, mode: "insensitive" } },
      });

      if (!existing) {
        console.error(`Paystack webhook: renewal charge.success for unknown email "${customerEmail}" — no matching Creator account.`);
      } else {
        const updated = await db.creator.update({
          where: { id: existing.id },
          data: { subscriptionActive: true, subscriptionTier: tier, subscriptionCycle: cycle, currentCycleStart: new Date() },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: updated.id,
              amountNgn: Math.round((event.data.amount ?? 0) / 100),
              type: "SUBSCRIPTION_RENEWAL",
              tier,
              cycle,
              paystackReference: event.data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for renewal (creator ${updated.id})`, err);
        }
      }
    }
  }

  // ── Renewal charge failed ──
  if (event.event === "invoice.payment_failed") {
    const customerEmail = normalizeEmail(event.data?.customer?.email);
    if (customerEmail) {
      await db.creator.updateMany({
        where: { email: { equals: customerEmail, mode: "insensitive" } },
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