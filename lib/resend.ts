import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Set this once you've verified a sending domain in Resend's dashboard —
// e.g. "Showwork <no-reply@useshowwork.com>". Until a domain is
// verified, check Resend's dashboard for what sender address is
// currently allowed for testing.
const FROM = process.env.RESEND_FROM_EMAIL ?? "Showwork <onboarding@resend.dev>";

export async function sendOtpEmail(to: string, code: string, name?: string | null) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${code} is your Showwork verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Showwork by Spotlite Africa
        </p>
        <p style="font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Enter this code to verify your email and finish creating your account:
        </p>
        <p style="font-size: 36px; font-weight: 700; letter-spacing: 0.1em; color: #F5C842; margin: 24px 0;">
          ${code}
        </p>
        <p style="font-size: 13px; color: #888786; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}

/** Generates a random 6-digit numeric code, e.g. "042817". */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sent to the creator whenever a client approves or requests revision
 * on a file. Includes the note when it's a revision request.
 */
export async function sendReviewNotificationEmail({
  to,
  creatorName,
  clientName,
  fileLabel,
  status,
  note,
  dashboardUrl,
}: {
  to: string;
  creatorName?: string | null;
  clientName: string;
  fileLabel: string;
  status: "APPROVED" | "NEEDS_REVISION";
  note?: string | null;
  dashboardUrl: string;
}) {
  const greeting = creatorName ? `Hi ${creatorName.split(" ")[0]},` : "Hi,";
  const isApproved = status === "APPROVED";

  await resend.emails.send({
    from: FROM,
    to,
    subject: isApproved
      ? `${clientName} approved a file`
      : `${clientName} requested a revision`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Showwork by Spotlite Africa
        </p>
        <p style="font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientName} just
          <strong style="color: ${isApproved ? "#22C55E" : "#F97316"};">
            ${isApproved ? "approved" : "requested a revision on"}
          </strong>
          a file in your project:
        </p>
        <p style="font-size: 14px; color: #F8F7F4; background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 8px; margin: 16px 0;">
          ${fileLabel}
        </p>
        ${
          !isApproved && note
            ? `<p style="font-size: 14px; line-height: 1.6; color: #F8F7F4; background: rgba(249,115,22,0.1); border-left: 3px solid #F97316; padding: 12px 16px; margin: 16px 0;">
                "${note}"
               </p>`
            : ""
        }
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: #F5C842; color: #0A0A0B; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
          View project
        </a>
      </div>
    `,
  });
}

/**
 * Sent to the project owner (and the file's uploader, if different)
 * whenever a client leaves a new timestamped comment on a video —
 * separate from sendReviewNotificationEmail, since a comment isn't a
 * verdict and there can be any number of them on one file.
 */
export async function sendVideoCommentNotificationEmail({
  to,
  creatorName,
  clientName,
  fileLabel,
  note,
  videoTimestampSeconds,
  dashboardUrl,
}: {
  to: string;
  creatorName?: string | null;
  clientName: string;
  fileLabel: string;
  note: string;
  videoTimestampSeconds: number;
  dashboardUrl: string;
}) {
  const greeting = creatorName ? `Hi ${creatorName.split(" ")[0]},` : "Hi,";
  const total = Math.max(0, Math.round(videoTimestampSeconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const formattedTimestamp = `${m}:${String(s).padStart(2, "0")}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${clientName} left a comment on ${fileLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Showwork by Spotlite Africa
        </p>
        <p style="font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientName} left a comment at
          <strong style="color: #2478FF;">${formattedTimestamp}</strong>
          in a video in your project:
        </p>
        <p style="font-size: 14px; color: #F8F7F4; background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 8px; margin: 16px 0;">
          ${fileLabel}
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #F8F7F4; background: rgba(36,120,255,0.1); border-left: 3px solid #2478FF; padding: 12px 16px; margin: 16px 0;">
          "${note}"
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: #F5C842; color: #0A0A0B; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
          View project
        </a>
      </div>
    `,
  });
}

/**
 * Sent to the client (viewer) once the creator uploads a corrected
 * version of something they flagged, so they know to come look again.
 */
export async function sendRevisionReadyEmail({
  to,
  clientName,
  publicUrl,
}: {
  to: string;
  clientName: string;
  publicUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `An update is ready on ${clientName}'s delivery`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Showwork by Spotlite Africa
        </p>
        <p style="font-size: 15px; line-height: 1.6;">
          The file you flagged for revision has been updated. Take another look:
        </p>
        <a href="${publicUrl}" style="display: inline-block; margin-top: 16px; background: #F5C842; color: #0A0A0B; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
          Review the update
        </a>
      </div>
    `,
  });
}

/**
 * Sent when someone requests a password reset. The link contains the
 * plain token — the only place it ever exists outside the moment of
 * generation; the database only ever stores its hash.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string, name?: string | null) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Showwork password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Showwork by Spotlite Africa
        </p>
        <p style="font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Someone requested a password reset for your account. If this was you, click below to set a new password:
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 20px 0; background: #F5C842; color: #0A0A0B; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Reset password
        </a>
        <p style="font-size: 13px; color: #888786; line-height: 1.6;">
          This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
  });
}

// ─────────────────────────────────────────────
// COLLABORATION NOTIFICATIONS — invites, task assignment, review
// decisions. All six share one visual template (emailShell below):
// your actual hero image up top, the Showwork wordmark, and a real
// gradient button — built once so changing the look later means
// editing one function, not six emails that quietly drift apart.
// Uses FROM (the same verified sender as every email above) rather
// than a separate hardcoded address.
// ─────────────────────────────────────────────

const HERO_IMAGE_URL = `${process.env.NEXT_PUBLIC_APP_URL}/images/hero1.png`;
const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

function emailShell({
  eyebrow,
  headline,
  body,
  ctaLabel,
  ctaUrl,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!--
  These two meta tags tell email clients not to apply their own
  automatic dark-mode color inversion on top of this email's own
  colors — some clients (Zoho among them) otherwise flip an already-
  dark design and can leave white text sitting on a white background
  it never should've touched. Without these, the same inline color
  styles below can render correctly in one client and unreadably in
  another.
-->
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Showwork</title>
</head>
<body style="margin:0; padding:0; background:#0A0A0A;" bgcolor="#0A0A0A">
    <div style="background:#0A0A0A; padding:48px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;" bgcolor="#0A0A0A">
      <div style="max-width:480px; margin:0 auto;">
        <p style="margin:0 0 24px; font-size:18px; font-weight:700; color:#ffffff !important; text-align:center;">
          Show<span style="color:#2478FF !important;">work</span>
        </p>

        <div style="background:#141414; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.06);" bgcolor="#141414">
          <img
            src="${HERO_IMAGE_URL}"
            alt=""
            width="480"
            style="width:100%; max-width:480px; height:180px; object-fit:cover; display:block; background:#1a1a1a;"
          />
          <div style="padding:32px 28px 36px;">
            <p style="margin:0 0 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#2478FF !important;">
              ${eyebrow}
            </p>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.35; font-weight:700; color:#ffffff !important;">
              ${headline}
            </h1>
            <p style="margin:0 0 30px; font-size:14px; line-height:1.65; color:#B8B8B8 !important;">
              ${body}
            </p>
            <a
              href="${ctaUrl}"
              style="display:inline-block; padding:14px 32px; background:linear-gradient(135deg,#2478FF 0%,#0052FF 100%); background-color:#2478FF; color:#ffffff !important; text-decoration:none; border-radius:10px; font-weight:600; font-size:14px;"
            >
              ${ctaLabel}
            </a>

            <!-- Join Creativo — present on every email in this system,
                 not just this one, since it's built into the shared
                 shell rather than added per-email. Secondary/quieter
                 styling on purpose: the main CTA above stays the
                 primary action, this is a standing invitation, not a
                 competing ask. -->
            <div style="margin-top:20px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 12px; font-size:13px; color:#B8B8B8 !important;">
                Not figuring this out alone helps — Creativo is a free community for creators.
              </p>
              <a
                href="${COMMUNITY_URL}"
                style="display:inline-block; padding:10px 20px; background:transparent; color:#ffffff !important; text-decoration:none; border-radius:8px; border:1px solid rgba(255,255,255,0.2); font-weight:600; font-size:13px;"
              >
                Join Creativo
              </a>
            </div>
          </div>
        </div>

        <p style="margin:28px 0 0; text-align:center; font-size:11px; color:#666666 !important;">
          Sent by Showwork &middot; useshowwork.com
        </p>
      </div>
    </div>
</body>
</html>
  `;
}

// ── Delivery-project collaboration invite ──
export async function sendProjectInviteEmail({
  to,
  inviterName,
  projectName,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  projectName: string;
  acceptUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${inviterName} invited you to collaborate on "${projectName}"`,
    html: emailShell({
      eyebrow: "You're invited",
      headline: `${inviterName} wants you on "${projectName}"`,
      body: `You've been invited to collaborate on this project on Showwork — upload your own work, and get credit for it directly. This invite expires in 7 days.`,
      ctaLabel: "View invite",
      ctaUrl: acceptUrl,
    }),
  });
}

// ── Managed-project collaborator added ──
export async function sendCollaboratorAddedEmail({
  to,
  addedByName,
  projectName,
  projectUrl,
}: {
  to: string;
  addedByName: string;
  projectName: string;
  projectUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${addedByName} added you to "${projectName}"`,
    html: emailShell({
      eyebrow: "You're on the team",
      headline: `${addedByName} added you to "${projectName}"`,
      body: `You're now a collaborator on this project — take a look at what's assigned to you and get started whenever you're ready.`,
      ctaLabel: "View project",
      ctaUrl: projectUrl,
    }),
  });
}

// ── Task assigned ──
export async function sendTaskAssignedEmail({
  to,
  assignedByName,
  taskTitle,
  projectName,
  projectUrl,
}: {
  to: string;
  assignedByName: string;
  taskTitle: string;
  projectName: string;
  projectUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New task on "${projectName}": ${taskTitle}`,
    html: emailShell({
      eyebrow: "New task",
      headline: taskTitle,
      body: `${assignedByName} assigned you this task on "${projectName}". Head over whenever you're ready to get started.`,
      ctaLabel: "View task",
      ctaUrl: projectUrl,
    }),
  });
}

// ── The owner requested changes on an uploaded file ──
export async function sendTaskNeedsChangesEmail({
  to,
  reviewerName,
  taskTitle,
  projectName,
  note,
  projectUrl,
}: {
  to: string;
  reviewerName: string;
  taskTitle: string;
  projectName: string;
  note: string | null;
  projectUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Changes requested on "${taskTitle}"`,
    html: emailShell({
      eyebrow: "Needs a revision",
      headline: `"${taskTitle}" needs a small fix`,
      body: note
        ? `${reviewerName} left a note on "${projectName}": "${note}"`
        : `${reviewerName} requested changes to your upload on "${projectName}". Take a look whenever you get a chance.`,
      ctaLabel: "View task",
      ctaUrl: projectUrl,
    }),
  });
}

// ── The owner approved an uploaded file ──
export async function sendTaskApprovedEmail({
  to,
  reviewerName,
  taskTitle,
  projectName,
  projectUrl,
}: {
  to: string;
  reviewerName: string;
  taskTitle: string;
  projectName: string;
  projectUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `"${taskTitle}" was approved`,
    html: emailShell({
      eyebrow: "Approved",
      headline: `Your work on "${taskTitle}" was approved`,
      body: `${reviewerName} approved what you uploaded on "${projectName}" — nice work.`,
      ctaLabel: "View project",
      ctaUrl: projectUrl,
    }),
  });
}

// ── A collaborator uploaded something — the owner needs to review it ──
export async function sendNewUploadReadyForReviewEmail({
  to,
  uploaderName,
  taskTitle,
  projectName,
  projectUrl,
}: {
  to: string;
  uploaderName: string;
  taskTitle: string;
  projectName: string;
  projectUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${uploaderName} uploaded work on "${projectName}"`,
    html: emailShell({
      eyebrow: "Ready for your review",
      headline: `${uploaderName} finished "${taskTitle}"`,
      body: `A new file is ready for your review on "${projectName}" — take a look and approve it, or send back a note if it needs anything.`,
      ctaLabel: "Review now",
      ctaUrl: projectUrl,
    }),
  });
}

// ─────────────────────────────────────────────
// LIFECYCLE SEQUENCE — the automatic emails every creator moves
// through after signup: welcome immediately, a portfolio nudge on
// day 1, then on day 2 both a project-management introduction and a
// Creativo invite, followed by a "deliver a project" reminder that
// then repeats every week from then on, forever. Driven by
// lib/lifecycleEmails.ts, which decides *when* each of these fires —
// these five functions are just the content.
// ─────────────────────────────────────────────

// ── Sent immediately at signup ──
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Showwork",
    html: emailShell({
      eyebrow: "Welcome",
      headline: firstName ? `Good to have you, ${firstName}.` : "Good to have you here.",
      body: `Showwork is how your work gets delivered like the premium brand it already is — no more WeTransfer links, no more scattered folders. Your dashboard is ready whenever you are.`,
      ctaLabel: "Go to your dashboard",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });
}

// ── Day 1 — invite to build a free portfolio ──
export async function sendPortfolioInviteEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your portfolio is free — and takes minutes",
    html: emailShell({
      eyebrow: "Free, always on",
      headline: firstName ? `${firstName}, your portfolio is ready to build.` : "Your portfolio is ready to build.",
      body: `A real portfolio — not a scattered Instagram feed — is often the first thing a serious client checks. Yours is free on every plan, always on, and takes minutes to set up.`,
      ctaLabel: "Create your portfolio",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/portfolio`,
    }),
  });
}

// ── Day 2 — introduce project management ──
export async function sendProjectManagementIntroEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Plan the work, not just the delivery",
    html: emailShell({
      eyebrow: "Also on Showwork",
      headline: firstName ? `${firstName}, there's more than delivery.` : "There's more than delivery.",
      body: `Before a single file gets delivered, you can plan it properly — a real brief, tasks assigned to your team, and a review step before anything reaches a client. Your client even gets a live progress view while the work is happening.`,
      ctaLabel: "Start a managed project",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/start`,
    }),
  });
}

// ── Day 2, and every week after — invite to join Creativo ──
export async function sendCreativoPromoEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: "You don't have to figure this out alone",
    html: emailShell({
      eyebrow: "Introducing Creativo",
      headline: firstName ? `${firstName}, meet Creativo.` : "Meet Creativo.",
      body: `A free community for creators — not just Showwork users. Pricing, positioning, landing better clients, and the parts of this job nobody else teaches you, worked out alongside people actually doing it.`,
      ctaLabel: "Join Creativo, it's free",
      ctaUrl: COMMUNITY_URL,
    }),
  });
}

// ── Day 2, then weekly forever — reminder to deliver a project ──
export async function sendDeliverReminderEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Ready to send your next delivery?",
    html: emailShell({
      eyebrow: "Whenever you're ready",
      headline: firstName ? `${firstName}, got a delivery to send?` : "Got a delivery to send?",
      body: `A branded, password-protected link says premium before you have to argue for it — and makes the number you're charging feel obvious. Takes minutes to set up your next one.`,
      ctaLabel: "Deliver a project",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/start`,
    }),
  });
}

// ── Managed-project invite for someone with no Showwork account yet ──
export async function sendManagedProjectInviteEmail({
  to,
  inviterName,
  projectName,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  projectName: string;
  acceptUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${inviterName} invited you to work on "${projectName}"`,
    html: emailShell({
      eyebrow: "You're invited",
      headline: `${inviterName} wants you on "${projectName}"`,
      body: `You've been invited to collaborate on this project on Showwork. If you don't have an account yet, you'll get one in a couple of clicks — this invite expires in 7 days.`,
      ctaLabel: "View invite",
      ctaUrl: acceptUrl,
    }),
  });
}

// ─────────────────────────────────────────────
// CREATIVO WEBINAR HOST APPLICATION — sent to the Showwork team
// (hello@useshowwork.com), never to the applicant. Matches the same
// dark/gold visual language as every other email in this file rather
// than inventing a new style for one form.
// ─────────────────────────────────────────────
export async function sendWebinarHostApplicationEmail({
  name,
  email,
  category,
  proposedTopic,
  whyThem,
}: {
  name: string;
  email: string;
  category: string;
  proposedTopic: string;
  whyThem: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: "hello@useshowwork.com",
    replyTo: email,
    subject: `Creativo webinar host application — ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F8F7F4;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #F5C842; margin-bottom: 24px;">
          Creativo — Webinar Host Application
        </p>
        <table style="width: 100%; font-size: 14px; line-height: 1.7; border-collapse: collapse;">
          <tr><td style="color: #888786; padding: 6px 0; vertical-align: top; width: 140px;">Name</td><td style="padding: 6px 0;">${name}</td></tr>
          <tr><td style="color: #888786; padding: 6px 0; vertical-align: top;">Email</td><td style="padding: 6px 0;">${email}</td></tr>
          <tr><td style="color: #888786; padding: 6px 0; vertical-align: top;">Category</td><td style="padding: 6px 0;">${category}</td></tr>
          <tr><td style="color: #888786; padding: 6px 0; vertical-align: top;">Proposed topic</td><td style="padding: 6px 0;">${proposedTopic}</td></tr>
          <tr><td style="color: #888786; padding: 6px 0; vertical-align: top;">Why them</td><td style="padding: 6px 0;">${whyThem}</td></tr>
        </table>
        <p style="font-size: 12px; color: #888786; margin-top: 24px;">Reply directly to this email to respond to the applicant.</p>
      </div>
    `,
  });
}