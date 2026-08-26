import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSpotlightSubmissionEmail } from "@/lib/resend";

const VALID_CATEGORIES = ["Video/Motion", "Graphics Design", "Photography", "Branding/Illustration"];
const MAX_DESCRIPTION_LENGTH = 150;

// --- Meta Conversions API helpers -----------------------------------------
// Env vars needed:
//   META_PIXEL_ID=1047882427696794
//   META_CAPI_ACCESS_TOKEN=<generated in Events Manager > Settings > Conversions API>

function hash(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendSpotlightLeadEvent({
  eventId,
  email,
  phone,
  clientIp,
  userAgent,
  category,
}: {
  eventId?: string;
  email: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  category: string;
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.error("Meta CAPI not configured — missing env vars");
    return;
  }

  const userData: Record<string, unknown> = {
    em: [hash(email)],
    client_ip_address: clientIp,
    client_user_agent: userAgent,
  };

  if (phone) {
    userData.ph = [hash(phone.replace(/[^\d]/g, ""))];
  }

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId, // must match the eventID used in the client-side fbq() call
        action_source: "website",
        user_data: userData,
        custom_data: {
          content_name: "Spotlight Submission",
          content_category: category,
        },
      },
    ],
  };

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Meta CAPI error:", errBody);
  }
}
// ---------------------------------------------------------------------------

// POST — anyone can submit, no account required. The deadline check
// here is the real enforcement — happens server-side against the
// database's own stored deadline, not trusted from anything the
// client sends, so a submission can never sneak through past the
// deadline via a direct API call even if the public page's own UI
// correctly disables the button.
export async function POST(req: NextRequest) {
  const activeCycle = await db.spotlightCycle.findFirst({ where: { isActive: true } });

  if (!activeCycle) {
    return NextResponse.json(
      { error: "There's no active Spotlight cycle right now. Check back soon!" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (now < activeCycle.submissionOpensAt || now > activeCycle.submissionDeadline) {
    return NextResponse.json(
      { error: "Submissions for this month's Spotlight are closed. Check back next month to apply!" },
      { status: 400 }
    );
  }

  const { name, email, phone, category, projectLink, description, note, eventId } = await req.json();

  if (!name?.trim() || !email?.trim() || !projectLink?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Name, email, project link, and description are all required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 });
  }

  // Optional — only set if the submitter happened to be logged in.
  // Never required, matching that anyone can submit without an
  // account at all.
  const loggedInCreator = await getCurrentCreator();

  const submission = await db.spotlightSubmission.create({
    data: {
      cycleId: activeCycle.id,
      creatorId: loggedInCreator?.id ?? null,
      name: name.trim(),
      email: email.trim(),
      category,
      projectLink: projectLink.trim(),
      description: description.trim(),
      note: note?.trim() || null,
    },
  });

  // Best-effort — a failed notification email should never mean the
  // submission itself gets rejected; the record is already safely
  // saved by this point regardless.
  try {
    await sendSpotlightSubmissionEmail({
      name: submission.name,
      email: submission.email,
      category: submission.category,
      projectLink: submission.projectLink,
      description: submission.description,
      note: submission.note,
    });
  } catch (err) {
    console.error("Failed to send Spotlight submission notification email:", err);
  }

  // Best-effort — same principle as the email above. Ad tracking
  // failing should never block or roll back a successful submission.
  try {
    await sendSpotlightLeadEvent({
      eventId,
      email: submission.email,
      phone,
      category: submission.category,
      clientIp: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
  } catch (err) {
    console.error("Failed to send Meta Conversions API event:", err);
  }

  return NextResponse.json({ ok: true });
}