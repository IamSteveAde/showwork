import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";

const INDIVIDUAL_PLAN_CODE = process.env.PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE;
const COMPANY_PLAN_CODE = process.env.PAYSTACK_CALENDAR_COMPANY_PLAN_CODE;
// Paystack requires a non-zero amount on the request even though the
// plan's own configured price is what actually gets charged — same
// reasoning as the portfolio subscription checkout.
const INDIVIDUAL_MONTHLY_NGN = 2800;
const COMPANY_MONTHLY_NGN = 15000;
// One-time, ever, per account — not per calendar. Both account types
// get the same trial length.
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

// POST — creates a new calendar for one client. Billing itself is
// entirely account-level now, not per-calendar: one subscription (or
// one trial) covers every calendar this account owns.
//
// On an account's very first-ever calendar, `accountType` must be
// supplied ("INDIVIDUAL" or "COMPANY") — that choice is permanent for
// the account and made exactly once, right here. Every calendar after
// that ignores accountType entirely, since it's already set.
//
// The very first calendar this account EVER creates also starts a
// free 3-day trial, tracked by calendarTrialUsedAt — a permanent
// marker that's set once and never cleared, even if every calendar is
// later deleted, specifically so deleting and recreating a calendar
// can never be used to farm additional trials.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientName, accountType } = await req.json();
  if (!clientName || !clientName.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  // Re-fetched fresh rather than trusting whatever getCurrentCreator()
  // returned — these fields change over time and the session object
  // may not reflect the very latest billing state.
  const creator = await db.creator.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      calendarAccountType: true,
      calendarTrialUsedAt: true,
      calendarBillingStatus: true,
      calendarTrialEndsAt: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let resolvedAccountType = creator.calendarAccountType;

  // First calendar this account has ever created — the account-type
  // choice is made right here, once, and never revisited by this
  // route again.
  if (!resolvedAccountType) {
    if (accountType !== "INDIVIDUAL" && accountType !== "COMPANY") {
      return NextResponse.json({ error: "Choose Individual or Company first" }, { status: 400 });
    }
    resolvedAccountType = accountType;
    await db.creator.update({
      where: { id: creator.id },
      data: { calendarAccountType: resolvedAccountType },
    });
  }

  const slug = await uniqueSlugFor(slugify(clientName.trim()));
  const accessCode = generateAccessCode();
  const passwordHash = await hashPassword(accessCode);

  // Calendars themselves carry no billing fields anymore — creating
  // one is always allowed; whether it's actually USABLE afterward is
  // entirely down to canAccessCalendar() checking the account below.
  const calendar = await db.socialCalendar.create({
    data: {
      slug,
      clientName: clientName.trim(),
      passwordHash,
      accessCode, // plain copy, same reasoning as Project.accessCode — lets the manager re-share it later
      managerId: creator.id,
    },
  });

  // Never trialed before, on any account type — starts now, covers
  // every calendar on the account, and can never be granted again.
  if (!creator.calendarTrialUsedAt) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    await db.creator.update({
      where: { id: creator.id },
      data: {
        calendarBillingStatus: "TRIAL",
        calendarTrialEndsAt: trialEndsAt,
        calendarTrialUsedAt: new Date(),
      },
    });

    return NextResponse.json({ calendarId: calendar.id, trial: true });
  }

  // Already paying — this new calendar is covered by that same
  // subscription immediately, no checkout needed.
  if (creator.calendarBillingStatus === "ACTIVE") {
    return NextResponse.json({ calendarId: calendar.id, alreadyActive: true });
  }

  // Still inside a previously-started trial window — also just goes
  // straight in.
  if (
    creator.calendarBillingStatus === "TRIAL" &&
    creator.calendarTrialEndsAt &&
    creator.calendarTrialEndsAt.getTime() > Date.now()
  ) {
    return NextResponse.json({ calendarId: calendar.id, trial: true });
  }

  // Everything else (trial already used up and expired, or billing
  // OFFLINE/PENDING_SETUP with no active subscription) means this
  // account genuinely needs to pay before this — or any — calendar on
  // it is usable.
  const planCode = resolvedAccountType === "COMPANY" ? COMPANY_PLAN_CODE : INDIVIDUAL_PLAN_CODE;
  const amountNgn = resolvedAccountType === "COMPANY" ? COMPANY_MONTHLY_NGN : INDIVIDUAL_MONTHLY_NGN;

  if (!planCode) {
    console.error(`Paystack plan code for ${resolvedAccountType} calendars is not set — cannot start checkout.`);
    return NextResponse.json({ error: "Billing isn't configured yet — contact support" }, { status: 500 });
  }

  const reference = `showwork_calendar_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/calendars?subscriptionPayment=callback&calendarId=${calendar.id}`,
      planCode,
      amount: amountNgn * 100,
      metadata: { creatorId: creator.id, calendarId: calendar.id },
    });

    await db.creator.update({
      where: { id: creator.id },
      data: { calendarPendingSubscriptionRef: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, calendarId: calendar.id });
  } catch (err) {
    console.error("Calendar subscription initialize error:", err);
    // The calendar row is left in place, just locked behind billing
    // until the manager retries — same recovery path as before.
    return NextResponse.json({ error: "Failed to start payment — try again" }, { status: 500 });
  }
}