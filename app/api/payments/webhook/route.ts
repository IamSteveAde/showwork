import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction, cancelSubscription } from "@/lib/paystack";
import { tierFromPlanCode } from "@/lib/subscriptionTiers";
import { sendPortfolioPaymentFailedEmail } from "@/lib/resend";

// Set once, matching the single plan created in the Paystack dashboard
// for the ₦1,000/month portfolio recurring charge — same pattern as
// the tier plan codes in subscriptionTiers.ts, just for one plan
// rather than several.
const PORTFOLIO_PLAN_CODE = process.env.PAYSTACK_PORTFOLIO_PLAN_CODE;

function extractPlanCode(data: any): string | null {
  if (!data?.plan) return null;
  return typeof data.plan === "string" ? data.plan : data.plan?.plan_code ?? null;
}

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
  console.log(`Paystack webhook received: ${event.event}`, {
    reference: event.data?.reference,
    email: event.data?.customer?.email,
    planCode: extractPlanCode(event.data),
  });

  // ── One-time payments (no plan attached) — project deliveries, and
  //    now the portfolio ₦5,000 setup fee. Both use the exact same
  //    event shape, distinguished only by which reference the
  //    transaction actually matches. ──
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

      if (project) {
        if (project.paid) {
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
            console.error(`Paystack webhook: failed to create PaymentRecord for reference ${reference}`, err);
          }
        }
      } else {
        console.warn(`Paystack webhook: no project found for reference ${reference}`);
      }
    }
  }

  // ── Subscription created (first charge on a plan) ──
  if (event.event === "subscription.create") {
    const data = event.data;
    const customerEmail = normalizeEmail(data?.customer?.email);
    const planCode = extractPlanCode(data);

    if (PORTFOLIO_PLAN_CODE && planCode === PORTFOLIO_PLAN_CODE) {
      const portfolioId = data?.metadata?.portfolioId ?? null;
      const portfolio = portfolioId
        ? await db.portfolio.findUnique({ where: { id: portfolioId } })
        : null;

      if (!portfolio) {
        console.error(`Paystack webhook: portfolio subscription.create with no matching portfolio (metadata.portfolioId: ${portfolioId})`);
      } else {
        await db.portfolio.update({
          where: { id: portfolio.id },
          data: {
            billingStatus: "ACTIVE",
            paystackCustomerCode: data.customer?.customer_code ?? null,
            paystackSubscriptionCode: data.subscription_code ?? null,
            paystackEmailToken: data.email_token ?? null,
            subscriptionRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
          },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: portfolio.creatorId,
              amountNgn: Math.round((data.amount ?? 0) / 100),
              type: "PORTFOLIO_SUBSCRIPTION_INITIAL",
              portfolioId: portfolio.id,
              paystackReference: data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for portfolio subscription.create (portfolio ${portfolio.id})`, err);
        }
      }
    } else {
      const match = planCode ? tierFromPlanCode(planCode) : null;

      if (!customerEmail) {
        console.error("Paystack webhook: subscription.create had no customer email", { data });
      } else if (!match) {
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
  }

  // ── Renewal charge succeeded ──
  if (event.event === "charge.success" && extractPlanCode(event.data)) {
    const planCode = extractPlanCode(event.data);

    if (PORTFOLIO_PLAN_CODE && planCode === PORTFOLIO_PLAN_CODE) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      const portfolio = subscriptionCode
        ? await db.portfolio.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } })
        : null;

      if (!portfolio) {
        console.error(`Paystack webhook: portfolio renewal charge.success with no matching portfolio (subscription_code: ${subscriptionCode})`);
      } else {
        await db.portfolio.update({
          where: { id: portfolio.id },
          data: { billingStatus: "ACTIVE", wentOfflineAt: null, lastPaymentReminderSentAt: null },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: portfolio.creatorId,
              amountNgn: Math.round((event.data.amount ?? 0) / 100),
              type: "PORTFOLIO_SUBSCRIPTION_RENEWAL",
              portfolioId: portfolio.id,
              paystackReference: event.data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for portfolio renewal (portfolio ${portfolio.id})`, err);
        }
      }
    } else {
      const customerEmail = normalizeEmail(event.data?.customer?.email);
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
  }

  // ── Renewal charge failed ──
  if (event.event === "invoice.payment_failed") {
    const planCode = extractPlanCode(event.data) ?? extractPlanCode(event.data?.subscription);

    if (PORTFOLIO_PLAN_CODE && planCode === PORTFOLIO_PLAN_CODE) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      if (subscriptionCode) {
        const portfolio = await db.portfolio.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
        if (portfolio) {
          await db.portfolio.update({ where: { id: portfolio.id }, data: { billingStatus: "OFFLINE", wentOfflineAt: new Date() } });
          try {
            const creator = await db.creator.findUnique({ where: { id: portfolio.creatorId } });
            if (creator) {
              await sendPortfolioPaymentFailedEmail({ to: creator.email, name: creator.name, portfolioName: portfolio.companyName });
            }
          } catch (err) {
            console.error(`Failed to send portfolio payment-failed email (portfolio ${portfolio.id})`, err);
          }
        } else {
          console.error(`Paystack webhook: portfolio invoice.payment_failed with no matching portfolio (subscription_code: ${subscriptionCode})`);
        }
      }
    } else {
      const customerEmail = normalizeEmail(event.data?.customer?.email);
      if (customerEmail) {
        await db.creator.updateMany({
          where: { email: { equals: customerEmail, mode: "insensitive" } },
          data: { subscriptionActive: false },
        });
      }
    }
  }

  // ── Subscription cancelled ──
  if (event.event === "subscription.disable") {
    const data = event.data;
    if (data?.subscription_code) {
      const portfolio = await db.portfolio.findFirst({ where: { paystackSubscriptionCode: data.subscription_code } });
      if (portfolio) {
        await db.portfolio.update({ where: { id: portfolio.id }, data: { billingStatus: "OFFLINE", wentOfflineAt: new Date() } });
      } else {
        await db.creator.updateMany({
          where: { paystackSubscriptionCode: data.subscription_code },
          data: { subscriptionActive: false },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}