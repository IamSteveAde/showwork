import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Set this once you've verified a sending domain in Resend's dashboard —
// e.g. "Showwork <no-reply@spotliteafrica.com>". Until a domain is
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