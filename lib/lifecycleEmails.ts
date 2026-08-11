import { db } from "@/lib/db";
import {
  sendWelcomeEmail,
  sendPortfolioInviteEmail,
  sendProjectManagementIntroEmail,
  sendCreativoPromoEmail,
  sendDeliverReminderEmail,
} from "@/lib/resend";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / DAY_MS;
}

interface RunSummary {
  processed: number;
  welcomeSent: number;
  portfolioInviteSent: number;
  projectManagementSent: number;
  creativoPromoSent: number;
  deliverReminderSent: number;
  errors: { creatorId: string; step: string; message: string }[];
}

/**
 * The actual decision logic for the lifecycle email sequence — called
 * by the protected API route (for manual testing) and the Netlify
 * Scheduled Function (for the real daily run). Deliberately kept
 * separate from both of those so it's testable on its own and not
 * tied to any particular trigger mechanism.
 *
 * Runs once per creator per invocation — intended to be called daily.
 * Every step checks its own "already sent" timestamp before sending,
 * so calling this more than once on the same day is safe and won't
 * double-send anything.
 */
export async function runLifecycleEmailCheck(): Promise<RunSummary> {
  const summary: RunSummary = {
    processed: 0,
    welcomeSent: 0,
    portfolioInviteSent: 0,
    projectManagementSent: 0,
    creativoPromoSent: 0,
    deliverReminderSent: 0,
    errors: [],
  };

  // isDeactivated creators are skipped entirely — no point emailing
  // an account that can't even log in right now.
  const creators = await db.creator.findMany({
    where: { isDeactivated: false },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lifecycleSequenceStartedAt: true,
      welcomeEmailSentAt: true,
      portfolioInviteEmailSentAt: true,
      projectManagementEmailSentAt: true,
      creativoPromoEmailSentAt: true,
      lastDeliveryReminderSentAt: true,
      // Used only to decide whether to skip this round's delivery
      // reminder — no point nagging someone who delivered something
      // in the last week already.
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  for (const creator of creators) {
    summary.processed++;
    try {
      // Anchor point for every "day N" step. Should already be set
      // for everyone (via signup for new accounts, or the one-time
      // backfill script for accounts that existed before this system
      // did) — this is just a safety net for the rare case it isn't,
      // so a creator never gets permanently stuck with nothing firing.
      let sequenceStart = creator.lifecycleSequenceStartedAt;
      if (!sequenceStart) {
        sequenceStart = new Date();
        await db.creator.update({
          where: { id: creator.id },
          data: { lifecycleSequenceStartedAt: sequenceStart },
        });
      }
      const elapsedDays = daysSince(sequenceStart);

      // ── Welcome — immediate ──
      // Normally already sent directly at signup (see verify-otp),
      // this is the catch-up path for the one-time backfill on
      // existing accounts, or if the direct send ever failed.
      if (!creator.welcomeEmailSentAt) {
        await sendWelcomeEmail({ to: creator.email, name: creator.name });
        await db.creator.update({ where: { id: creator.id }, data: { welcomeEmailSentAt: new Date() } });
        summary.welcomeSent++;
      }

      // ── Day 1 — portfolio invite ──
      if (elapsedDays >= 1 && !creator.portfolioInviteEmailSentAt) {
        await sendPortfolioInviteEmail({ to: creator.email, name: creator.name });
        await db.creator.update({ where: { id: creator.id }, data: { portfolioInviteEmailSentAt: new Date() } });
        summary.portfolioInviteSent++;
      }

      // ── Day 2 — project management introduction ──
      if (elapsedDays >= 2 && !creator.projectManagementEmailSentAt) {
        await sendProjectManagementIntroEmail({ to: creator.email, name: creator.name });
        await db.creator.update({ where: { id: creator.id }, data: { projectManagementEmailSentAt: new Date() } });
        summary.projectManagementSent++;
      }

      // ── Day 2 — Creativo promotion (one-time, not the weekly repeat) ──
      if (elapsedDays >= 2 && !creator.creativoPromoEmailSentAt) {
        await sendCreativoPromoEmail({ to: creator.email, name: creator.name });
        await db.creator.update({ where: { id: creator.id }, data: { creativoPromoEmailSentAt: new Date() } });
        summary.creativoPromoSent++;
      }

      // ── Day 2, then every week forever — deliver-a-project reminder ──
      if (elapsedDays >= 2) {
        const neverSent = !creator.lastDeliveryReminderSentAt;
        const dueAgain = creator.lastDeliveryReminderSentAt
          ? Date.now() - creator.lastDeliveryReminderSentAt.getTime() >= WEEK_MS
          : false;

        if (neverSent || dueAgain) {
          // Skip this round if they've delivered something in the
          // last 7 days — a real, live project already covers the
          // point of the nudge, and re-sending it anyway would just
          // read as not paying attention.
          const mostRecentProject = creator.projects[0];
          const deliveredRecently = mostRecentProject && daysSince(mostRecentProject.createdAt) < 7;

          if (!deliveredRecently) {
            await sendDeliverReminderEmail({ to: creator.email, name: creator.name });
            await db.creator.update({ where: { id: creator.id }, data: { lastDeliveryReminderSentAt: new Date() } });
            summary.deliverReminderSent++;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Lifecycle email error for creator ${creator.id}:`, err);
      summary.errors.push({ creatorId: creator.id, step: "unknown", message });
    }
  }

  return summary;
}