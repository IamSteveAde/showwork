import { db } from "@/lib/db";
import {
  sendCalendarTrial2DaysLeftEmail,
  sendCalendarTrialFollowUpEmail,
  sendCalendarTrialEndsTodayEmail,
  sendCalendarTrialEndedEmail,
} from "@/lib/resend";

// Runs once a day (see app/api/cron/calendar-trial-emails and the
// matching Netlify scheduled function). Each of the four stages is
// tracked by its own "sent at" timestamp on Creator, so running this
// more than once in a day — or on a day where a stage was already
// sent — never results in a duplicate email.
//
// calendarBillingStatus stays "TRIAL" even after the trial's actual
// end date has passed — nothing flips it automatically, since
// canAccessCalendar() computes expiry live from calendarTrialEndsAt
// rather than a stored status change. That's exactly what lets one
// query here catch every stage, including the final "trial has
// ended" email, without a separate query for expired accounts.
export async function runCalendarTrialEmailCheck() {
  const trialing = await db.creator.findMany({
    where: { calendarBillingStatus: "TRIAL", calendarTrialEndsAt: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      calendarAccountType: true,
      calendarTrialEndsAt: true,
      calendarTrial2DaysLeftEmailSentAt: true,
      calendarTrialFollowUpEmailSentAt: true,
      calendarTrialEndsTodayEmailSentAt: true,
      calendarTrialEndedEmailSentAt: true,
    },
  });

  let twoDaysLeftSent = 0;
  let followUpSent = 0;
  let endsTodaySent = 0;
  let endedSent = 0;
  let errors = 0;

  for (const creator of trialing) {
    if (!creator.calendarTrialEndsAt || !creator.calendarAccountType) continue;

    // Same calculation the dashboard banner itself uses, so the
    // email stages line up with whatever day-count a manager is
    // actually seeing on screen.
    const msLeft = creator.calendarTrialEndsAt.getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    try {
      if (daysLeft === 2 && !creator.calendarTrial2DaysLeftEmailSentAt) {
        await sendCalendarTrial2DaysLeftEmail({ to: creator.email, name: creator.name, accountType: creator.calendarAccountType });
        await db.creator.update({ where: { id: creator.id }, data: { calendarTrial2DaysLeftEmailSentAt: new Date() } });
        twoDaysLeftSent++;
      } else if (daysLeft === 1 && !creator.calendarTrialFollowUpEmailSentAt) {
        await sendCalendarTrialFollowUpEmail({ to: creator.email, name: creator.name, accountType: creator.calendarAccountType });
        await db.creator.update({ where: { id: creator.id }, data: { calendarTrialFollowUpEmailSentAt: new Date() } });
        followUpSent++;
      } else if (daysLeft === 0 && !creator.calendarTrialEndsTodayEmailSentAt) {
        await sendCalendarTrialEndsTodayEmail({ to: creator.email, name: creator.name, accountType: creator.calendarAccountType });
        await db.creator.update({ where: { id: creator.id }, data: { calendarTrialEndsTodayEmailSentAt: new Date() } });
        endsTodaySent++;
      } else if (daysLeft < 0 && !creator.calendarTrialEndedEmailSentAt) {
        await sendCalendarTrialEndedEmail({ to: creator.email, name: creator.name, accountType: creator.calendarAccountType });
        await db.creator.update({ where: { id: creator.id }, data: { calendarTrialEndedEmailSentAt: new Date() } });
        endedSent++;
      }
    } catch (err) {
      console.error(`Calendar trial email check failed for creator ${creator.id}:`, err);
      errors++;
    }
  }

  return {
    checked: trialing.length,
    twoDaysLeftSent,
    followUpSent,
    endsTodaySent,
    endedSent,
    errors,
  };
}