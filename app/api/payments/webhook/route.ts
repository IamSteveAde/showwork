import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction, cancelSubscription } from "@/lib/paystack";
import { tierFromPlanCode } from "@/lib/subscriptionTiers";
import { sendPortfolioPaymentFailedEmail, sendCalendarPaymentFailedEmail } from "@/lib/resend";

// Set once, matching the single plan created in the Paystack dashboard
// for the ₦1,000/month portfolio recurring charge — same pattern as
// the tier plan codes in subscriptionTiers.ts, just for one plan
// rather than several.
const PORTFOLIO_PLAN_CODE = process.env.PAYSTACK_PORTFOLIO_PLAN_CODE;
// Calendar billing is account-level now — one of these two plans
// covers every calendar a Creator owns, rather than one plan per
// calendar the way it used to work.
const CALENDAR_INDIVIDUAL_PLAN_CODE = process.env.PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE;
const CALENDAR_COMPANY_PLAN_CODE = process.env.PAYSTACK_CALENDAR_COMPANY_PLAN_CODE;
// The AI content assistant — one flat ₦15,000/month account-level
// add-on, completely independent of calendar billing above. An
// account can have this active regardless of its calendar tier, and
// cancelling one never touches the other.
const AI_ASSISTANT_PLAN_CODE = process.env.PAYSTACK_AI_ASSISTANT_PLAN_CODE;

function isCalendarPlanCode(planCode: string | null): boolean {
  return !!planCode && (planCode === CALENDAR_INDIVIDUAL_PLAN_CODE || planCode === CALENDAR_COMPANY_PLAN_CODE);
}

function isAiAssistantPlanCode(planCode: string | null): boolean {
  return !!planCode && planCode === AI_ASSISTANT_PLAN_CODE;
}

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
    } else if (isCalendarPlanCode(planCode)) {
      // Account-level: metadata.creatorId is set by both the create
      // route and retry-payment, so this should always be present —
      // customerEmail is kept only as a defensive fallback in case a
      // checkout was somehow started without it.
      const creatorId = data?.metadata?.creatorId ?? null;
      const creator = creatorId
        ? await db.creator.findUnique({ where: { id: creatorId } })
        : customerEmail
        ? await db.creator.findFirst({ where: { email: { equals: customerEmail, mode: "insensitive" } } })
        : null;

      if (!creator) {
        console.error(`Paystack webhook: calendar subscription.create with no matching creator (metadata.creatorId: ${creatorId}, email: ${customerEmail})`);
      } else {
        // Safety net for the Individual→Company upgrade path — the
        // upgrade route already tries to cancel the old subscription
        // itself before starting this new one, but if that call
        // failed for any reason, this catches it here too rather
        // than leaving two live subscriptions charging the same
        // account.
        if (
          creator.calendarPaystackSubscriptionCode &&
          creator.calendarPaystackEmailToken &&
          data.subscription_code &&
          creator.calendarPaystackSubscriptionCode !== data.subscription_code
        ) {
          try {
            await cancelSubscription(creator.calendarPaystackSubscriptionCode, creator.calendarPaystackEmailToken);
          } catch (err) {
            console.error("Failed to cancel previous calendar subscription during switch:", err);
          }
        }

        await db.creator.update({
          where: { id: creator.id },
          data: {
            calendarBillingStatus: "ACTIVE",
            calendarPaystackCustomerCode: data.customer?.customer_code ?? null,
            calendarPaystackSubscriptionCode: data.subscription_code ?? null,
            calendarPaystackEmailToken: data.email_token ?? null,
            calendarSubscriptionRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
            calendarWentOfflineAt: null,
            calendarLastPaymentReminderSentAt: null,
          },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: creator.id,
              amountNgn: Math.round((data.amount ?? 0) / 100),
              type: "CALENDAR_SUBSCRIPTION_INITIAL",
              calendarId: data?.metadata?.calendarId ?? null,
              paystackReference: data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for calendar subscription.create (creator ${creator.id})`, err);
        }
      }
    } else if (isAiAssistantPlanCode(planCode)) {
      // Account-level, same as calendar billing above — completely
      // independent subscription, never touches calendar billing.
      const creatorId = data?.metadata?.creatorId ?? null;
      const creator = creatorId
        ? await db.creator.findUnique({ where: { id: creatorId } })
        : customerEmail
        ? await db.creator.findFirst({ where: { email: { equals: customerEmail, mode: "insensitive" } } })
        : null;

      if (!creator) {
        console.error(`Paystack webhook: AI assistant subscription.create with no matching creator (metadata.creatorId: ${creatorId}, email: ${customerEmail})`);
      } else {
        await db.creator.update({
          where: { id: creator.id },
          data: {
            aiAssistantBillingStatus: "ACTIVE",
            aiAssistantPaystackCustomerCode: data.customer?.customer_code ?? null,
            aiAssistantPaystackSubscriptionCode: data.subscription_code ?? null,
            aiAssistantPaystackEmailToken: data.email_token ?? null,
            aiAssistantSubscriptionRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
            aiAssistantWentOfflineAt: null,
          },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: creator.id,
              amountNgn: Math.round((data.amount ?? 0) / 100),
              type: "AI_ASSISTANT_SUBSCRIPTION_INITIAL",
              paystackReference: data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for AI assistant subscription.create (creator ${creator.id})`, err);
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
    } else if (isCalendarPlanCode(planCode)) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      const creator = subscriptionCode
        ? await db.creator.findFirst({ where: { calendarPaystackSubscriptionCode: subscriptionCode } })
        : null;

      if (!creator) {
        console.error(`Paystack webhook: calendar renewal charge.success with no matching account (subscription_code: ${subscriptionCode})`);
      } else {
        await db.creator.update({
          where: { id: creator.id },
          data: { calendarBillingStatus: "ACTIVE", calendarWentOfflineAt: null, calendarLastPaymentReminderSentAt: null },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: creator.id,
              amountNgn: Math.round((event.data.amount ?? 0) / 100),
              type: "CALENDAR_SUBSCRIPTION_RENEWAL",
              paystackReference: event.data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for calendar renewal (creator ${creator.id})`, err);
        }
      }
    } else if (isAiAssistantPlanCode(planCode)) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      const creator = subscriptionCode
        ? await db.creator.findFirst({ where: { aiAssistantPaystackSubscriptionCode: subscriptionCode } })
        : null;

      if (!creator) {
        console.error(`Paystack webhook: AI assistant renewal charge.success with no matching account (subscription_code: ${subscriptionCode})`);
      } else {
        await db.creator.update({
          where: { id: creator.id },
          data: { aiAssistantBillingStatus: "ACTIVE", aiAssistantWentOfflineAt: null },
        });

        try {
          await db.paymentRecord.create({
            data: {
              creatorId: creator.id,
              amountNgn: Math.round((event.data.amount ?? 0) / 100),
              type: "AI_ASSISTANT_SUBSCRIPTION_RENEWAL",
              paystackReference: event.data.reference ?? null,
            },
          });
        } catch (err) {
          console.error(`Paystack webhook: failed to create PaymentRecord for AI assistant renewal (creator ${creator.id})`, err);
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
    } else if (isCalendarPlanCode(planCode)) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      if (subscriptionCode) {
        const creator = await db.creator.findFirst({ where: { calendarPaystackSubscriptionCode: subscriptionCode } });
        if (creator) {
          await db.creator.update({ where: { id: creator.id }, data: { calendarBillingStatus: "OFFLINE", calendarWentOfflineAt: new Date() } });
          try {
            await sendCalendarPaymentFailedEmail({ to: creator.email, name: creator.name });
          } catch (err) {
            console.error(`Failed to send calendar payment-failed email (creator ${creator.id})`, err);
          }
        } else {
          console.error(`Paystack webhook: calendar invoice.payment_failed with no matching account (subscription_code: ${subscriptionCode})`);
        }
      }
    } else if (isAiAssistantPlanCode(planCode)) {
      const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code ?? null;
      if (subscriptionCode) {
        const creator = await db.creator.findFirst({ where: { aiAssistantPaystackSubscriptionCode: subscriptionCode } });
        if (creator) {
          await db.creator.update({ where: { id: creator.id }, data: { aiAssistantBillingStatus: "OFFLINE", aiAssistantWentOfflineAt: new Date() } });
          // TODO: send an AI-assistant-specific payment-failed email,
          // mirroring sendCalendarPaymentFailedEmail, once that
          // function exists in lib/resend.ts.
          console.warn(`AI assistant payment failed for creator ${creator.id} — no notification email sent yet (not built).`);
        } else {
          console.error(`Paystack webhook: AI assistant invoice.payment_failed with no matching account (subscription_code: ${subscriptionCode})`);
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
      const calendarAccount = !portfolio
        ? await db.creator.findFirst({ where: { calendarPaystackSubscriptionCode: data.subscription_code } })
        : null;
      const aiAssistantAccount = !portfolio && !calendarAccount
        ? await db.creator.findFirst({ where: { aiAssistantPaystackSubscriptionCode: data.subscription_code } })
        : null;

      if (portfolio) {
        await db.portfolio.update({ where: { id: portfolio.id }, data: { billingStatus: "OFFLINE", wentOfflineAt: new Date() } });
      } else if (calendarAccount) {
        await db.creator.update({ where: { id: calendarAccount.id }, data: { calendarBillingStatus: "OFFLINE", calendarWentOfflineAt: new Date() } });
      } else if (aiAssistantAccount) {
        await db.creator.update({ where: { id: aiAssistantAccount.id }, data: { aiAssistantBillingStatus: "OFFLINE", aiAssistantWentOfflineAt: new Date() } });
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