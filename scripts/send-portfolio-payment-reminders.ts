/**
 * Sends a reminder email for every portfolio currently OFFLINE due to
 * a failed monthly payment — for as long as it stays unresolved.
 * Throttled to at most once every 24 hours per portfolio via
 * lastPaymentReminderSentAt, so running this script more often than
 * daily (e.g. from a cron job that fires every few hours) never spams
 * anyone — it just catches up sooner on any portfolio genuinely due
 * for its next reminder.
 *
 * Run with:
 *   npx tsx scripts/send-portfolio-payment-reminders.ts
 *
 * Intended to be scheduled (daily is reasonable) via whatever cron
 * mechanism the rest of this app's scheduled jobs already use.
 */

import { PrismaClient } from "@prisma/client";
import { sendPortfolioOfflineReminderEmail } from "../lib/resend";

const db = new PrismaClient();

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function main() {
  console.log("Checking for offline portfolios due a payment reminder...\n");

  const offlinePortfolios = await db.portfolio.findMany({
    where: { billingStatus: "OFFLINE" },
    include: { creator: { select: { id: true, email: true, name: true } } },
  });

  console.log(`Found ${offlinePortfolios.length} offline portfolio(s).\n`);

  let sent = 0;
  let skippedRecentlyReminded = 0;
  let skippedNoOfflineTimestamp = 0;

  const now = new Date();

  for (const portfolio of offlinePortfolios) {
    console.log(`── ${portfolio.companyName} (${portfolio.id}) — owner: ${portfolio.creator.email}`);

    if (!portfolio.wentOfflineAt) {
      console.log(`   ✗ Skipped — no wentOfflineAt timestamp recorded.\n`);
      skippedNoOfflineTimestamp++;
      continue;
    }

    const dueForReminder =
      !portfolio.lastPaymentReminderSentAt ||
      now.getTime() - portfolio.lastPaymentReminderSentAt.getTime() >= REMINDER_INTERVAL_MS;

    if (!dueForReminder) {
      console.log(`   • Reminded recently — skipping.\n`);
      skippedRecentlyReminded++;
      continue;
    }

    const daysOffline = Math.max(1, Math.floor((now.getTime() - portfolio.wentOfflineAt.getTime()) / (24 * 60 * 60 * 1000)));

    try {
      await sendPortfolioOfflineReminderEmail({
        to: portfolio.creator.email,
        name: portfolio.creator.name,
        portfolioName: portfolio.companyName,
        daysOffline,
      });

      await db.portfolio.update({
        where: { id: portfolio.id },
        data: { lastPaymentReminderSentAt: now },
      });

      console.log(`   ✓ Reminder sent (${daysOffline} day${daysOffline === 1 ? "" : "s"} offline).\n`);
      sent++;
    } catch (err) {
      console.error(`   ✗ Failed to send reminder for portfolio ${portfolio.id}:`, err, "\n");
    }
  }

  console.log("──────────────────────────────");
  console.log(`Done. ${sent} reminder(s) sent, ${skippedRecentlyReminded} reminded recently, ${skippedNoOfflineTimestamp} missing a wentOfflineAt timestamp.`);
}

main()
  .catch((err) => {
    console.error("Portfolio payment reminder script failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());