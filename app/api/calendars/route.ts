import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";
import {
  CONTENT_WORKSPACE_PLANS,
  CONTENT_WORKSPACE_TRIAL_DAYS,
  getContentWorkspacePlanCode,
  type ContentWorkspaceBillingCycle,
  type ContentWorkspacePlan,
} from "@/lib/contentWorkspaceEntitlements";
import {
  canCreateContentWorkspace,
  type ContentWorkspaceAccount,
} from "@/lib/contentWorkspaceUsage";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateAccessCode(): string {
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

  let code = "";

  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function uniqueSlugFor(base: string): Promise<string> {
  let candidate = base || "calendar";
  let suffix = 2;

  while (
    await db.socialCalendar.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }

  return candidate;
}

function resolvePlanFromLegacyAccountType(
  accountType: unknown
): ContentWorkspacePlan | null {
  if (accountType === "INDIVIDUAL") return "CREATOR";
  if (accountType === "COMPANY") return "STUDIO";

  return null;
}

function resolveBillingCycle(
  value: unknown
): ContentWorkspaceBillingCycle {
  return value === "ANNUAL" ? "ANNUAL" : "MONTHLY";
}

// GET — every calendar this creator owns, most recent first.
export async function GET() {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const calendars = await db.socialCalendar.findMany({
    where: {
      managerId: creator.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return NextResponse.json({ calendars });
}

// POST — creates a new Content Workspace.
//
// Billing is account-level:
// - Creator: 1 active workspace
// - Studio: 10 active workspaces
//
// Every account gets one 3-day trial, ever.
// The trial is attached to the Content Workspace subscription,
// not to an individual calendar/workspace.
//
// `accountType` is accepted temporarily for backwards compatibility
// with the existing frontend:
// - INDIVIDUAL -> Creator
// - COMPANY -> Studio
//
// New frontend code should send `plan` instead.
export async function POST(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    clientName?: unknown;
    plan?: unknown;
    accountType?: unknown;
    billingCycle?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const clientName =
    typeof body.clientName === "string"
      ? body.clientName.trim()
      : "";

  if (!clientName) {
    return NextResponse.json(
      { error: "Client name is required" },
      { status: 400 }
    );
  }

  const creator = await db.creator.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,
      email: true,

      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspaceTrialUsedAt: true,
      contentWorkspaceTrialEndsAt: true,
      contentWorkspacePendingSubscriptionRef: true,

      isComped: true,

      // Kept temporarily because older accounts may still have this
      // value from the previous Calendar billing system.
      calendarAccountType: true,
    },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  /*
   * Determine the Content Workspace plan.
   *
   * Existing accounts that previously selected:
   *   INDIVIDUAL -> CREATOR
   *   COMPANY    -> STUDIO
   *
   * New accounts should provide `plan`.
   *
   * Once a Content Workspace plan exists on the account, it is used
   * as the source of truth.
   */
  let plan: ContentWorkspacePlan | null =
    creator.contentWorkspacePlan;

  if (!plan) {
    if (
      body.plan === "CREATOR" ||
      body.plan === "STUDIO"
    ) {
      plan = body.plan;
    } else {
      plan = resolvePlanFromLegacyAccountType(
        body.accountType
      );
    }

    if (!plan) {
      plan = resolvePlanFromLegacyAccountType(
        creator.calendarAccountType
      );
    }
  }

  if (!plan) {
    return NextResponse.json(
      {
        error:
          "Choose a Content Workspace plan first: Creator or Studio",
      },
      { status: 400 }
    );
  }

  /*
   * Build the account shape expected by the centralized
   * Content Workspace entitlement service.
   */
  const account: ContentWorkspaceAccount = {
  id: creator.id,
  contentWorkspacePlan: plan,
  contentWorkspaceBillingStatus: creator.contentWorkspaceBillingStatus,
  contentWorkspaceBillingCycle: creator.contentWorkspaceBillingCycle,
  contentWorkspaceTrialUsedAt: creator.contentWorkspaceTrialUsedAt,
  contentWorkspaceTrialEndsAt: creator.contentWorkspaceTrialEndsAt,
  isComped: creator.isComped,
};

  /*
   * IMPORTANT:
   * Check the workspace entitlement BEFORE creating the database row.
   *
   * This enforces:
   * Creator -> maximum 1 active workspace
   * Studio  -> maximum 10 active workspaces
   */
  const creationCheck = await canCreateContentWorkspace(account);

  if (!creationCheck.allowed) {
    return NextResponse.json(
      {
        error:
          creationCheck.reason ??
          "You cannot create another Content Workspace.",
        usage: creationCheck.usage,
      },
      { status: 403 }
    );
  }

  /*
   * Persist the selected Content Workspace plan if this is the
   * account's first Content Workspace setup.
   *
   * This does NOT touch the main Showwork subscription fields.
   */
  if (!creator.contentWorkspacePlan) {
    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePlan: plan,
      },
    });
  }

  /*
   * Generate the workspace credentials.
   */
  const slug = await uniqueSlugFor(slugify(clientName));
  const accessCode = generateAccessCode();
  const passwordHash = await hashPassword(accessCode);

  /*
   * Create the workspace.
   *
   * There are deliberately no billing fields on SocialCalendar.
   * Billing belongs to the creator's Content Workspace subscription.
   */
  const calendar = await db.socialCalendar.create({
    data: {
      slug,
      clientName,
      passwordHash,
      accessCode,
      managerId: creator.id,
    },
  });

  /*
   * FIRST-EVER CONTENT WORKSPACE:
   *
   * Start the 3-day free trial.
   *
   * No payment is requested.
   * No Paystack subscription is created.
   */
  if (!creator.contentWorkspaceTrialUsedAt) {
    const trialEndsAt = new Date();

    trialEndsAt.setDate(
      trialEndsAt.getDate() + CONTENT_WORKSPACE_TRIAL_DAYS
    );

    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePlan: plan,
        contentWorkspaceBillingStatus: "TRIAL",
        contentWorkspaceBillingCycle: null,
        contentWorkspaceTrialUsedAt: new Date(),
        contentWorkspaceTrialEndsAt: trialEndsAt,
        contentWorkspaceWentOfflineAt: null,
      },
    });

    return NextResponse.json({
      calendarId: calendar.id,
      trial: true,
      plan,
      trialEndsAt,
    });
  }

  /*
   * Existing active subscription:
   *
   * The new workspace is immediately covered by the same
   * Content Workspace subscription.
   */
  if (
    creator.contentWorkspaceBillingStatus === "ACTIVE"
  ) {
    return NextResponse.json({
      calendarId: calendar.id,
      alreadyActive: true,
      plan,
    });
  }

  /*
   * Existing trial is still active:
   *
   * The new workspace is covered by the current trial.
   */
  if (
    creator.contentWorkspaceBillingStatus === "TRIAL" &&
    creator.contentWorkspaceTrialEndsAt &&
    creator.contentWorkspaceTrialEndsAt.getTime() > Date.now()
  ) {
    return NextResponse.json({
      calendarId: calendar.id,
      trial: true,
      plan,
      trialEndsAt: creator.contentWorkspaceTrialEndsAt,
    });
  }

  /*
   * Trial has ended or the subscription is offline/pending.
   *
   * Start the Content Workspace subscription checkout.
   */
  const billingCycle = resolveBillingCycle(
    body.billingCycle ??
      creator.contentWorkspaceBillingCycle
  );

  const planConfig = CONTENT_WORKSPACE_PLANS[plan];

  let planCode: string;

  try {
    planCode = getContentWorkspacePlanCode(
      plan,
      billingCycle
    );
  } catch (error) {
    console.error(
      "Content Workspace Paystack plan configuration error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Billing isn't configured yet — contact support",
      },
      { status: 500 }
    );
  }

  const amountNgn =
    billingCycle === "ANNUAL"
      ? planConfig.priceNgnAnnual
      : planConfig.priceNgnMonthly;

  const reference =
    `showwork_content_workspace_sub_${creator.id}_${randomUUID()}`;

  try {
    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl:
        `${appUrl()}/dashboard/calendars` +
        `?subscriptionPayment=callback` +
        `&calendarId=${calendar.id}`,

      planCode,

      // Paystack expects kobo.
      amount: amountNgn * 100,

      metadata: {
        creatorId: creator.id,
        calendarId: calendar.id,
        contentWorkspacePlan: plan,
        billingCycle,
      },
    });

    await db.creator.update({
      where: {
        id: creator.id,
      },
      data: {
        contentWorkspacePlan: plan,
        contentWorkspaceBillingCycle: billingCycle,
        contentWorkspacePendingSubscriptionRef: reference,
      },
    });

    return NextResponse.json({
      authorizationUrl:
        result.data.authorization_url,
      calendarId: calendar.id,
      plan,
      billingCycle,
    });
  } catch (error) {
    console.error(
      "Content Workspace subscription initialize error:",
      error
    );

    /*
     * Leave the workspace row in place.
     *
     * It remains inaccessible until the account has an active
     * Content Workspace subscription or valid trial.
     */
    return NextResponse.json(
      {
        error:
          "Failed to start payment — try again",
      },
      { status: 500 }
    );
  }
}