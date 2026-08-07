/**
 * One-off recovery script — reconciles real, active Paystack
 * subscriptions into the database, for subscribers who paid while the
 * webhook URL was never configured in Paystack (meaning none of their
 * payment events ever reached the app).
 *
 * Pulls every active subscription directly from Paystack's API,
 * matches each one to a Creator by email, and updates their
 * subscription fields plus creates a PaymentRecord — exactly what the
 * webhook would have done, done manually and after the fact.
 *
 * Safe to re-run: any subscription whose subscription_code is already
 * correctly stored on a Creator is skipped rather than duplicated.
 *
 * Run with:
 *   npx tsx scripts/reconcile-subscriptions.ts
 *
 * Requires PAYSTACK_SECRET_KEY and DATABASE_URL to be set in your
 * environment — run this against the same .env your production app
 * actually uses, not a local/dev database, since the point is to fix
 * real production data.
 */

import { PrismaClient } from "@prisma/client";
import { tierFromPlanCode } from "../lib/subscriptionTiers";

const db = new PrismaClient();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  console.error("Missing PAYSTACK_SECRET_KEY in environment. Aborting.");
  process.exit(1);
}

interface PaystackSubscription {
  subscription_code: string;
  email_token: string;
  amount: number;
  status: string;
  next_payment_date: string | null;
  createdAt: string;
  plan: { plan_code: string; name: string };
  customer: { email: string; customer_code: string };
}

async function fetchAllActiveSubscriptions(): Promise<PaystackSubscription[]> {
  const all: PaystackSubscription[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const res = await fetch(`${PAYSTACK_BASE_URL}/subscription?page=${page}&perPage=${perPage}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Paystack list subscriptions failed: ${await res.text()}`);
    }
    const json = await res.json();
    const batch: PaystackSubscription[] = json.data ?? [];
    all.push(...batch);

    const totalPages = Math.ceil((json.meta?.total ?? batch.length) / perPage);
    if (page >= totalPages || batch.length === 0) break;
    page++;
  }

  return all.filter((s) => s.status === "active");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  console.log("Fetching active subscriptions from Paystack...\n");
  const subscriptions = await fetchAllActiveSubscriptions();
  console.log(`Found ${subscriptions.length} active subscription(s) on Paystack.\n`);

  let updated = 0;
  let skippedAlreadyCorrect = 0;
  let skippedNoCreator = 0;
  let skippedUnknownPlan = 0;

  for (const sub of subscriptions) {
    const email = normalizeEmail(sub.customer.email);
    const match = tierFromPlanCode(sub.plan.plan_code);

    console.log(`── ${email} — plan "${sub.plan.name}" (${sub.plan.plan_code})`);

    if (!match) {
      console.log(`   ✗ Skipped — plan code doesn't match any known tier. Check subscriptionTiers.ts.\n`);
      skippedUnknownPlan++;
      continue;
    }
    const { tier, cycle } = match;

    const creator = await db.creator.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!creator) {
      console.log(`   ✗ Skipped — no Creator account found with this email. May need manual review.\n`);
      skippedNoCreator++;
      continue;
    }

    if (
      creator.subscriptionActive &&
      creator.subscriptionTier === tier &&
      creator.subscriptionCycle === cycle &&
      creator.paystackSubscriptionCode === sub.subscription_code
    ) {
      console.log(`   • Already correct — no change needed.\n`);
      skippedAlreadyCorrect++;
      continue;
    }

    await db.creator.update({
      where: { id: creator.id },
      data: {
        subscriptionActive: true,
        subscriptionTier: tier,
        subscriptionCycle: cycle,
        paystackCustomerCode: sub.customer.customer_code,
        paystackSubscriptionCode: sub.subscription_code,
        paystackEmailToken: sub.email_token,
        subscriptionRenewsAt: sub.next_payment_date ? new Date(sub.next_payment_date) : null,
        currentCycleStart: new Date(sub.createdAt),
      },
    });

    // A synthetic, clearly-marked reference — the original transaction
    // reference isn't available from the subscription list endpoint,
    // and this makes it obvious in the data that this record was a
    // manual backfill rather than a normal webhook-created one.
    const syntheticReference = `RECONCILED-${sub.subscription_code}`;

    const existingRecord = await db.paymentRecord.findFirst({
      where: { paystackReference: syntheticReference },
    });

    if (!existingRecord) {
      await db.paymentRecord.create({
        data: {
          creatorId: creator.id,
          amountNgn: Math.round(sub.amount / 100),
          type: "SUBSCRIPTION_INITIAL",
          tier,
          cycle,
          paystackReference: syntheticReference,
        },
      });
    }

    console.log(`   ✓ Updated Creator and recorded ₦${Math.round(sub.amount / 100).toLocaleString()} payment.\n`);
    updated++;
  }

  console.log("──────────────────────────────");
  console.log(`Done. ${updated} updated, ${skippedAlreadyCorrect} already correct, ${skippedNoCreator} no matching Creator, ${skippedUnknownPlan} unknown plan code.`);

  if (skippedNoCreator > 0) {
    console.log("\n⚠ Some subscriptions had no matching Creator account — review these manually before assuming they're resolved.");
  }
}

main()
  .catch((err) => {
    console.error("Reconciliation script failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());