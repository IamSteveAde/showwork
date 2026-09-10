import { db } from "@/lib/db";
import { runWeeklyBusinessResearch } from "@/lib/openai";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Runs daily (see the matching cron route and Netlify scheduled
 * function) but only actually researches a calendar once its last
 * research is at least a week old — the daily check itself is cheap
 * and just a database query; the real cadence is enforced by
 * aiLastResearchedAt, not by how often this job happens to run. This
 * is more robust against a missed or delayed run than relying on a
 * strict weekly cron schedule would be.
 *
 * Only ever runs for calendars that already have a business summary
 * (i.e. at least one document has been uploaded) — researching a
 * business the AI has zero context on yet would just waste an API
 * call on something generic and not genuinely useful.
 */
export async function runScheduledAiBusinessResearch() {
  const cutoff = new Date(Date.now() - ONE_WEEK_MS);

  const dueCalendars = await db.socialCalendar.findMany({
    where: {
      aiBusinessSummary: { not: null },
      OR: [{ aiLastResearchedAt: null }, { aiLastResearchedAt: { lt: cutoff } }],
      manager: {
        OR: [
          { aiAssistantBillingStatus: "ACTIVE" },
          { aiAssistantBillingStatus: "TRIAL", aiAssistantTrialEndsAt: { gt: new Date() } },
        ],
      },
    },
    select: { id: true, clientName: true, aiBusinessSummary: true },
  });

  let researched = 0;
  let failed = 0;

  for (const calendar of dueCalendars) {
    try {
      const updatedSummary = await runWeeklyBusinessResearch({
        existingSummary: calendar.aiBusinessSummary,
        clientName: calendar.clientName,
      });

      await db.socialCalendar.update({
        where: { id: calendar.id },
        data: {
          aiBusinessSummary: updatedSummary,
          aiBusinessSummaryUpdatedAt: new Date(),
          aiLastResearchedAt: new Date(),
        },
      });
      researched++;
    } catch (err) {
      console.error(`Weekly AI research failed for calendar ${calendar.id}:`, err);
      failed++;
    }
  }

  return { checked: dueCalendars.length, researched, failed };
}