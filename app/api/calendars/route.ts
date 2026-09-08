import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const CALENDAR_PLAN_CODE = process.env.PAYSTACK_CALENDAR_PLAN_CODE;
// Paystack requires a non-zero amount on the request even though the
// plan's own configured price (₦2,800/month) is what actually gets
// charged — same reasoning as the portfolio subscription checkout.
const CALENDAR_MONTHLY_NGN = 2800;
// A manager's very first calendar ever gets this many days of free,
// full access before payment is required — every calendar after
// that skips straight to PENDING_SETUP.
const TRIAL_DAYS = 3;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A random, easy-to-read access code — no character-composition rules
// needed since nobody types this in by hand, they just copy-paste it.
// Avoids visually ambiguous characters (0/O, 1/l/I) so it's also fine
// to read aloud or retype if the manager ever needs to.
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueSlugFor(base: string): Promise<string> {
  let candidate = base || "calendar";
  let suffix = 2;
  while (await db.socialCalendar.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

// GET — every calendar this creator owns, most recent first. Doesn't
// yet include ones they only collaborate on — that's added once
// collaborator invites exist.
export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const calendars = await db.socialCalendar.findMany({
    where: { managerId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({ calendars });
}

// POST — creates a new calendar for one client. A manager's first
// calendar ever gets a free 3-day trial with immediate access; every
// calendar after that starts a ₦2,800/month subscription checkout
// and stays in PENDING_SETUP — invisible to the client link,
// uneditable in any way that matters — until that first charge is
// actually confirmed, either by the webhook or the
// verify-subscription fallback (needed for local development, since
// webhooks can't reach localhost).
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientName } = await req.json();
  if (!clientName || !clientName.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const slug = await uniqueSlugFor(slugify(clientName.trim()));
  const accessCode = generateAccessCode();
  const passwordHash = await hashPassword(accessCode);

  // Counted before creating the new row — if this manager has never
  // created a calendar before, this one qualifies for the one-time
  // free trial. Every calendar after this first one always requires
  // payment up front, with no exceptions.
  const existingCalendarCount = await db.socialCalendar.count({ where: { managerId: creator.id } });
  const isFirstCalendarEver = existingCalendarCount === 0;

  if (isFirstCalendarEver) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const calendar = await db.socialCalendar.create({
      data: {
        slug,
        clientName: clientName.trim(),
        passwordHash,
        accessCode,
        managerId: creator.id,
        billingStatus: "TRIAL",
        trialEndsAt,
      },
    });

    // No Paystack step at all for a trial — the manager goes
    // straight into a fully usable calendar.
    return NextResponse.json({ calendarId: calendar.id, trial: true });
  }

  if (!CALENDAR_PLAN_CODE) {
    console.error("PAYSTACK_CALENDAR_PLAN_CODE is not set — cannot start calendar subscription checkout.");
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  const calendar = await db.socialCalendar.create({
    data: {
      slug,
      clientName: clientName.trim(),
      passwordHash,
      accessCode, // plain copy, same reasoning as Project.accessCode — lets the manager re-share it later
      managerId: creator.id,
      billingStatus: "PENDING_SETUP",
    },
  });

  const reference = `showwork_calendar_sub_${calendar.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback&calendarId=${calendar.id}`,
      planCode: CALENDAR_PLAN_CODE,
      amount: CALENDAR_MONTHLY_NGN * 100,
      metadata: { calendarId: calendar.id },
    });

    await db.socialCalendar.update({
      where: { id: calendar.id },
      data: { pendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, calendarId: calendar.id });
  } catch (err) {
    console.error("Calendar subscription initialize error:", err);
    // The calendar row is left in place, still PENDING_SETUP with no
    // reference attached — the manager can retry from the list.
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}