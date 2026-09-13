/**
 * Content Workspace subscription entitlements.
 *
 * IMPORTANT:
 * - This is ONLY for the Content Workspace / Calendar product.
 * - Portfolio billing uses lib/subscriptionTiers.ts and is completely separate.
 * - AI is included in these plans; there is no separate AI subscription.
 *
 * Keep all Content Workspace limits here so plan changes can be made
 * without rewriting billing or feature-enforcement logic.
 */

export type ContentWorkspacePlan = "CREATOR" | "STUDIO";

export type ContentWorkspaceBillingCycle = "MONTHLY" | "ANNUAL";

export interface ContentWorkspaceEntitlements {
  /**
   * Maximum number of active client workspaces the account can have.
   */
  activeWorkspaces: number;

  /**
   * Maximum number of collaborators across the account.
   *
   * The workspace owner/manager is not counted as a collaborator.
   */
  collaborators: number;

  /**
   * Total storage allowance in bytes.
   */
  storageBytes: number;

  /**
   * Maximum AI content generations during one billing cycle.
   */
  aiGenerations: number;

  /**
   * Maximum AI regenerations during one billing cycle.
   */
  aiRegenerations: number;
}

export interface ContentWorkspacePlanConfig
  extends ContentWorkspaceEntitlements {
  name: string;
  priceNgnMonthly: number;
  priceNgnAnnual: number;
  planCodeEnv: {
    MONTHLY: string;
    ANNUAL: string;
  };
}

/**
 * Storage is expressed in decimal GB for customer-facing plan
 * allowances:
 *
 * 5 GB  = 5,000,000,000 bytes
 * 50 GB = 50,000,000,000 bytes
 *
 * Using bytes internally gives us accurate enforcement against
 * actual uploaded media rather than relying on rounded GB values.
 */
export const STORAGE_GB = {
  CREATOR: 5,
  STUDIO: 50,
} as const;

const GB = 1_000_000_000;

export const CONTENT_WORKSPACE_PLANS: Record<
  ContentWorkspacePlan,
  ContentWorkspacePlanConfig
> = {
  CREATOR: {
    name: "Creator",

    priceNgnMonthly: 2_800,
    priceNgnAnnual: 31_920,

    activeWorkspaces: 1,
    collaborators: 3,
    storageBytes: STORAGE_GB.CREATOR * GB,
    aiGenerations: 100,
    aiRegenerations: 30,

    planCodeEnv: {
      MONTHLY: "PAYSTACK_CONTENT_WORKSPACE_CREATOR_MONTHLY_PLAN_CODE",
      ANNUAL: "PAYSTACK_CONTENT_WORKSPACE_CREATOR_ANNUAL_PLAN_CODE",
    },
  },

  STUDIO: {
    name: "Studio",

    priceNgnMonthly: 15_000,
    priceNgnAnnual: 171_000,

    activeWorkspaces: 10,
    collaborators: 15,
    storageBytes: STORAGE_GB.STUDIO * GB,
    aiGenerations: 500,
    aiRegenerations: 150,

    planCodeEnv: {
      MONTHLY: "PAYSTACK_CONTENT_WORKSPACE_STUDIO_MONTHLY_PLAN_CODE",
      ANNUAL: "PAYSTACK_CONTENT_WORKSPACE_STUDIO_ANNUAL_PLAN_CODE",
    },
  },
};

export const CONTENT_WORKSPACE_PLAN_ORDER: ContentWorkspacePlan[] = [
  "CREATOR",
  "STUDIO",
];

export const CONTENT_WORKSPACE_PLAN_DISPLAY_NAME: Record<
  ContentWorkspacePlan,
  string
> = {
  CREATOR: "Creator",
  STUDIO: "Studio",
};

/**
 * The Content Workspace trial is intentionally short.
 *
 * No payment method is required to start the trial.
 */
export const CONTENT_WORKSPACE_TRIAL_DAYS = 3;

/**
 * Returns the configured entitlements for a plan.
 */
export function getContentWorkspaceEntitlements(
  plan: ContentWorkspacePlan
): ContentWorkspaceEntitlements {
  const config = CONTENT_WORKSPACE_PLANS[plan];

  return {
    activeWorkspaces: config.activeWorkspaces,
    collaborators: config.collaborators,
    storageBytes: config.storageBytes,
    aiGenerations: config.aiGenerations,
    aiRegenerations: config.aiRegenerations,
  };
}

/**
 * Returns the monthly price for a plan.
 */
export function getContentWorkspaceMonthlyPrice(
  plan: ContentWorkspacePlan
): number {
  return CONTENT_WORKSPACE_PLANS[plan].priceNgnMonthly;
}

/**
 * Returns the annual price for a plan.
 */
export function getContentWorkspaceAnnualPrice(
  plan: ContentWorkspacePlan
): number {
  return CONTENT_WORKSPACE_PLANS[plan].priceNgnAnnual;
}

/**
 * Returns the Paystack plan-code environment variable name.
 *
 * The actual environment variable is intentionally resolved only when
 * checkout is started, so missing billing configuration cannot break
 * unrelated application code.
 */
export function getContentWorkspacePlanCodeEnv(
  plan: ContentWorkspacePlan,
  cycle: ContentWorkspaceBillingCycle
): string {
  return CONTENT_WORKSPACE_PLANS[plan].planCodeEnv[cycle];
}

/**
 * Returns the Paystack plan code configured for a plan/cycle.
 */
export function getContentWorkspacePlanCode(
  plan: ContentWorkspacePlan,
  cycle: ContentWorkspaceBillingCycle
): string {
  const envVar = getContentWorkspacePlanCodeEnv(plan, cycle);
  const planCode = process.env[envVar];

  if (!planCode) {
    throw new Error(`Missing environment variable ${envVar}`);
  }

  return planCode;
}

/**
 * Converts a Paystack plan code back into the Content Workspace plan
 * and billing cycle.
 *
 * Useful for webhook processing.
 */
export function contentWorkspacePlanFromPaystackPlanCode(
  planCode: string
): {
  plan: ContentWorkspacePlan;
  cycle: ContentWorkspaceBillingCycle;
} | null {
  for (const plan of CONTENT_WORKSPACE_PLAN_ORDER) {
    const config = CONTENT_WORKSPACE_PLANS[plan];

    if (process.env[config.planCodeEnv.MONTHLY] === planCode) {
      return {
        plan,
        cycle: "MONTHLY",
      };
    }

    if (process.env[config.planCodeEnv.ANNUAL] === planCode) {
      return {
        plan,
        cycle: "ANNUAL",
      };
    }
  }

  return null;
}

/**
 * Returns the next available paid plan.
 *
 * Creator → Studio
 * Studio → null
 */
export function getNextContentWorkspacePlan(
  plan: ContentWorkspacePlan
): ContentWorkspacePlan | null {
  const index = CONTENT_WORKSPACE_PLAN_ORDER.indexOf(plan);

  if (index === -1 || index === CONTENT_WORKSPACE_PLAN_ORDER.length - 1) {
    return null;
  }

  return CONTENT_WORKSPACE_PLAN_ORDER[index + 1];
}

/**
 * Returns whether a plan is higher than another plan.
 */
export function isHigherContentWorkspacePlan(
  candidate: ContentWorkspacePlan,
  current: ContentWorkspacePlan
): boolean {
  return (
    CONTENT_WORKSPACE_PLAN_ORDER.indexOf(candidate) >
    CONTENT_WORKSPACE_PLAN_ORDER.indexOf(current)
  );
}