/**
 * One-off backfill — sets lifecycleSequenceStartedAt to "now" for
 * every existing creator who doesn't already have it set (i.e.
 * everyone who signed up before this lifecycle email system existed).
 *
 * This is what makes existing accounts start receiving the full
 * welcome → day 1 → day 2 sequence going forward, rather than every
 * step firing at once (which is what would happen if this were left
 * null and the check fell back to their real, possibly months-old,
 * signup date).
 *
 * Safe to run more than once — only touches creators where this
 * field is still null, so it's a no-op on a second run.
 *
 * Run with:
 *   npx tsx scripts/backfill-lifecycle-sequence.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const result = await db.creator.updateMany({
    where: { lifecycleSequenceStartedAt: null },
    data: { lifecycleSequenceStartedAt: new Date() },
  });

  console.log(`Backfilled ${result.count} creator(s) — their lifecycle email sequence starts from today.`);
  console.log("The next scheduled run (or a manual trigger of /api/cron/lifecycle-emails) will send their welcome email immediately, then the rest of the sequence over the following days.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());