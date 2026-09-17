"use client";

import Link from "next/link";
import { useState } from "react";

import SubscribeButton from "@/components/SubscribeButton";
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton";
import CalendarBillingSettings from "@/components/calendars/CalendarBillingSettings";

import {
  CONTENT_WORKSPACE_PLANS,
  type ContentWorkspacePlan,
} from "@/lib/contentWorkspaceEntitlements";

type Product = "delivery" | "content-workspace";

type BillingCycle = "MONTHLY" | "ANNUAL";

type WorkspaceBillingStatus =
  | "PENDING_SETUP"
  | "TRIAL"
  | "ACTIVE"
  | "OFFLINE";

type BillingSubscriptionsProps = {
  creator: {
    name: string | null;
    email: string;
  };

usage: {
  tier: "FREE" | "STARTER" | "GROWTH" | "UNLIMITED";
  used: number;
  limit: number;
  remaining: number;
  atCap: boolean;
  nextTier?: {
    name: string;
    limit: number | null;
    priceNgnMonthly: number;
  } | null;
};

  workspaceBilling: {
  contentWorkspacePlan: ContentWorkspacePlan | null;
  contentWorkspaceBillingStatus: WorkspaceBillingStatus;
  contentWorkspaceBillingCycle: BillingCycle | null;
  contentWorkspaceTrialUsedAt: Date | null;
  contentWorkspaceTrialEndsAt: Date | null;
  contentWorkspaceSubscriptionRenewsAt: Date | null;
  isComped: boolean;
  compedUntil: Date | null;
} | null;

  portfolioCount: number;

  selectedProduct: Product;
  selectedTier: string | null;
  selectedCycle: BillingCycle;
};

/* ============================================================
   ICONS
============================================================ */

function ArrowRightIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 17 17 7M8 7h9v9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeliveryIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="m15 16 2.5-2.5L20 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M3 9.5h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M7 13h3M14 13h3M7 16.5h3M14 16.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PortfolioIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle
        cx="8.5"
        cy="9"
        r="1.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="m3 16 5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function getComplimentaryPeriod(
  compedUntil: Date | null
): {
  label: string;
  detail: string;
} {
  if (!compedUntil) {
    return {
      label: "Complimentary access",
      detail: "No expiration date",
    };
  }

  const end = new Date(compedUntil);
  const now = new Date();

  if (end.getTime() <= now.getTime()) {
    return {
      label: "Complimentary access ended",
      detail: `Access ended ${formatDate(end)}`,
    };
  }

  let months =
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth() - now.getMonth());

  const monthAnchor = new Date(now);
  monthAnchor.setMonth(monthAnchor.getMonth() + months);

  if (monthAnchor.getTime() > end.getTime()) {
    months -= 1;
  }

  if (months >= 1) {
    return {
      label: `${months} month${months === 1 ? "" : "s"} remaining`,
      detail: `Complimentary access ends ${formatDate(end)}`,
    };
  }

  const days = Math.max(
    0,
    Math.ceil(
      (end.getTime() - now.getTime()) /
        86400000
    )
  );

  return {
    label: `${days} day${days === 1 ? "" : "s"} remaining`,
    detail: `Complimentary access ends ${formatDate(end)}`,
  };
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDeliveryPlanName(
  tier: "FREE" | "STARTER" | "GROWTH" | "UNLIMITED"
) {
  const names = {
    FREE: "Free",
    STARTER: "Starter",
    GROWTH: "Growth",
    UNLIMITED: "Unlimited",
  } as const;

  return names[tier];
}

function getDeliveryStatus(
  tier: string
) {
  if (tier === "FREE") {
    return {
      label: "Free plan",
      dot: "#98A2B3",
      text: "#475467",
      bg: "#F2F4F7",
      border: "#EAECF0",
    };
  }

  return {
    label: "Active",
    dot: "#22C55E",
    text: "#067647",
    bg: "#ECFDF3",
    border: "#D1FADF",
  };
}

function getWorkspaceStatus(
  status: WorkspaceBillingStatus
) {
  if (status === "ACTIVE") {
    return {
      label: "Active",
      dot: "#22C55E",
      text: "#067647",
      bg: "#ECFDF3",
      border: "#D1FADF",
    };
  }

  if (status === "TRIAL") {
    return {
      label: "Free trial",
      dot: "#2478FF",
      text: "#175CD3",
      bg: "#EFF8FF",
      border: "#D1E9FF",
    };
  }

  if (status === "OFFLINE") {
    return {
      label: "Offline",
      dot: "#F04438",
      text: "#B42318",
      bg: "#FEF3F2",
      border: "#FECDCA",
    };
  }

  return {
    label: "Setup required",
    dot: "#F79009",
    text: "#B54708",
    bg: "#FFFAEB",
    border: "#FEDF89",
  };
}

/* ============================================================
   PRODUCT TAB
============================================================ */

function ProductTab({
  active,
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`group relative flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-4 py-4 text-left transition-all duration-300 sm:px-5 ${
        active
          ? "bg-[#101828] text-white shadow-[0_12px_30px_rgba(16,24,40,0.16)]"
          : "text-[#667085] hover:bg-white hover:text-[#101828]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-white/10 text-[#78AEFF]"
            : "bg-[#F2F4F7] text-[#667085] group-hover:bg-[#EEF4FF] group-hover:text-[#2478FF]"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span
          className={`flex items-center gap-2 text-[12px] font-semibold ${
            active ? "text-white" : "text-[#344054]"
          }`}
        >
          {title}

          {badge && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${
                active
                  ? "bg-[#2478FF] text-white"
                  : "bg-[#EEF4FF] text-[#2478FF]"
              }`}
            >
              {badge}
            </span>
          )}
        </span>

        <span
          className={`mt-0.5 block truncate text-[10px] ${
            active ? "text-white/45" : "text-[#98A2B3]"
          }`}
        >
          {description}
        </span>
      </span>

      {active && (
        <span className="ml-auto hidden h-2 w-2 shrink-0 rounded-full bg-[#78AEFF] shadow-[0_0_14px_rgba(120,174,255,0.7)] sm:block" />
      )}
    </button>
  );
}

/* ============================================================
   DELIVERY
============================================================ */

function DeliverySubscription({
  usage,
  selectedTier,
  selectedCycle,
}: {
  usage: BillingSubscriptionsProps["usage"];
  selectedTier: string | null;
  selectedCycle: BillingCycle;
}) {
  const status = getDeliveryStatus(usage.tier);
  const planName = getDeliveryPlanName(usage.tier);

  const tiers = [
    {
      key: "FREE" as const,
      name: "Free",
      priceMonthly: 0,
      priceAnnual: 0,
      description:
        "A simple place to start delivering creative work.",
      features: [
        "1 project per month",
        "Password-protected delivery",
        "Custom presentation",
        "Client feedback",
        "Project analytics",
      ],
    },
    {
      key: "STARTER" as const,
      name: "Starter",
      priceMonthly: 5900,
      priceAnnual: 67260,
      description:
        "For creators taking on clients consistently.",
      features: [
        "Up to 5 projects per month",
        "Password-protected delivery",
        "Client feedback",
        "Individual + ZIP downloads",
        "Dashboard analytics",
      ],
    },
    {
      key: "GROWTH" as const,
      name: "Growth",
      priceMonthly: 10500,
      priceAnnual: 119700,
      description:
        "For studios and creators delivering every week.",
      features: [
        "Up to 20 projects per month",
        "Client feedback",
        "Individual + ZIP downloads",
        "Dashboard analytics",
        "Priority support",
      ],
    },
    {
      key: "UNLIMITED" as const,
      name: "Unlimited",
      priceMonthly: 15000,
      priceAnnual: 171000,
      description:
        "For teams who no longer want to count projects.",
      features: [
        "Unlimited projects",
        "Full delivery experience",
        "Client feedback",
        "Individual + ZIP downloads",
        "Highest priority support",
      ],
    },
  ];

  return (
    <section
      id="project-delivery-subscription"
      className="space-y-6"
    >
      {/* Current subscription */}
      <div className="relative overflow-hidden rounded-[28px] border border-[#E7E9EE] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.065)]">
        <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full bg-[#2478FF]/[0.07] blur-[70px]" />

        <div className="relative border-b border-[#EAECF0] px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#344054]">
                <DeliveryIcon className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#98A2B3]">
                    Project Delivery
                  </p>

                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold"
                    style={{
                      color: status.text,
                      background: status.bg,
                      borderColor: status.border,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: status.dot,
                      }}
                    />

                    {status.label}
                  </span>
                </div>

                <h2 className="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[#101828]">
                  {planName}
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-[#667085]">
                  Your client delivery subscription.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] px-4 py-3 sm:min-w-[150px]">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                Usage
              </p>

              <p className="mt-1 text-lg font-semibold tracking-tight text-[#101828]">
                {usage.used}
                <span className="text-sm font-normal text-[#98A2B3]">
                  {usage.limit === Infinity
                    ? " projects"
                    : ` / ${usage.limit}`}
                </span>
              </p>

              <p className="mt-0.5 text-[10px] text-[#98A2B3]">
                This billing period
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[#EAECF0] sm:grid-cols-3">
          <div className="bg-white p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
              Plan
            </p>

            <p className="mt-2 text-sm font-semibold text-[#101828]">
              {planName}
            </p>

            <p className="mt-1 text-xs text-[#667085]">
              {usage.tier === "FREE"
                ? "No recurring charge"
                : selectedCycle === "ANNUAL"
                  ? "Annual billing"
                  : "Monthly billing"}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
              Projects
            </p>

            <p className="mt-2 text-sm font-semibold text-[#101828]">
              {usage.limit === Infinity
                ? "Unlimited"
                : `${usage.limit} / month`}
            </p>

            <p className="mt-1 text-xs text-[#667085]">
              {usage.remaining} remaining
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
              Status
            </p>

            <p className="mt-2 text-sm font-semibold text-[#101828]">
              {usage.atCap
                ? "Limit reached"
                : "Available"}
            </p>

            <p className="mt-1 text-xs text-[#667085]">
              {usage.atCap
                ? "Choose a higher plan to continue."
                : "Your delivery workspace is ready."}
            </p>
          </div>
        </div>
      </div>

      {/* Billing cycle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
            Billing cycle
          </p>

          <p className="mt-1 text-sm text-[#667085]">
            Choose how often you want to be billed.
          </p>
        </div>

        <div className="inline-flex w-fit rounded-full border border-[#E1E4E9] bg-[#F7F8FA] p-1">
          <Link
            href={`/dashboard/billing?product=delivery&cycle=MONTHLY${
              selectedTier
                ? `&tier=${selectedTier}`
                : ""
            }`}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
              selectedCycle === "MONTHLY"
                ? "bg-white text-[#101828] shadow-sm"
                : "text-[#98A2B3] hover:text-[#344054]"
            }`}
          >
            Monthly
          </Link>

          <Link
            href={`/dashboard/billing?product=delivery&cycle=ANNUAL${
              selectedTier
                ? `&tier=${selectedTier}`
                : ""
            }`}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold transition ${
              selectedCycle === "ANNUAL"
                ? "bg-[#101828] text-white shadow-sm"
                : "text-[#98A2B3] hover:text-[#344054]"
            }`}
          >
            Annual

            <span
              className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                selectedCycle === "ANNUAL"
                  ? "bg-white/10 text-[#78AEFF]"
                  : "bg-[#EEF4FF] text-[#2478FF]"
              }`}
            >
              SAVE 5%
            </span>
          </Link>
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
            Project Delivery plans
          </p>

          <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#101828]">
            Choose the way you deliver.
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {tiers.map((plan) => {
            const isCurrent =
              usage.tier === plan.key;

            const isSelected =
              selectedTier === plan.key &&
              !isCurrent;

            const price =
              selectedCycle === "ANNUAL"
                ? plan.priceAnnual
                : plan.priceMonthly;

            return (
              <div
                key={plan.key}
                className={`relative overflow-hidden rounded-[24px] border bg-white p-5 transition-all duration-300 sm:p-6 ${
                  isCurrent
                    ? "border-[#2478FF] shadow-[0_12px_40px_rgba(36,120,255,0.10)]"
                    : isSelected
                      ? "border-[#2478FF] shadow-[0_12px_40px_rgba(36,120,255,0.10)]"
                      : "border-[#E7E9EE] hover:-translate-y-0.5 hover:border-[#D0D5DD] hover:shadow-[0_14px_40px_rgba(16,24,40,0.06)]"
                }`}
              >
                {isCurrent && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#2478FF]">
                    Current
                  </div>
                )}

                {isSelected && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#101828] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white">
                    Selected
                  </div>
                )}

                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                  {plan.name}
                </p>

                <div className="mt-3 flex items-end gap-1">
                  <span className="text-[30px] font-semibold tracking-[-0.04em] text-[#101828]">
                    {price === 0
                      ? "₦0"
                      : formatNaira(price)}
                  </span>

                  {price > 0 && (
                    <span className="mb-1 text-xs text-[#98A2B3]">
                      {selectedCycle === "ANNUAL"
                        ? "/year"
                        : "/month"}
                    </span>
                  )}
                </div>

                {selectedCycle === "ANNUAL" &&
                  price > 0 && (
                    <p className="mt-1 text-[10px] font-medium text-[#2478FF]">
                      Equivalent to{" "}
                      {formatNaira(
                        Math.round(
                          price / 12
                        )
                      )}
                      /month
                    </p>
                  )}

                <p className="mt-4 min-h-[42px] text-xs leading-5 text-[#667085]">
                  {plan.description}
                </p>

                <div className="mt-5 space-y-2.5 border-t border-[#EAECF0] pt-5">
                  {plan.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-[11px] text-[#475467]"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ECFDF3] text-[#12B76A]">
                          <CheckIcon className="h-2.5 w-2.5" />
                        </span>

                        {feature}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-[#067647]">
                        You are currently on this plan.
                      </div>

                      {usage.tier !== "FREE" && (
                        <CancelSubscriptionButton />
                      )}
                    </div>
                  ) : plan.key === "FREE" ? (
                    <div className="text-[11px] font-medium text-[#98A2B3]">
                      Included with Showwork
                    </div>
                  ) : (
                    <SubscribeButton
                      tier={plan.key}
                      cycle={selectedCycle}
                      label={
                        usage.tier === "FREE"
                          ? `Choose ${plan.name}`
                          : `Switch to ${plan.name}`
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why Delivery */}
      <div className="rounded-[24px] border border-[#E7E9EE] bg-[#F9FAFB] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2478FF] shadow-sm ring-1 ring-[#EAECF0]">
            <DeliveryIcon className="h-[18px] w-[18px]" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#101828]">
              Project Delivery is for finished work.
            </p>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#667085]">
              Use it to present projects beautifully,
              share files securely, collect feedback and
              move client work from delivery to approval.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CONTENT WORKSPACE
============================================================ */

function ContentWorkspaceSubscription({
  workspaceBilling,
  selectedCycle,
}: {
  workspaceBilling:
    BillingSubscriptionsProps["workspaceBilling"];

  selectedCycle: BillingCycle;
}) {
  const plan =
    workspaceBilling?.contentWorkspacePlan;

  const billingStatus =
    workspaceBilling?.contentWorkspaceBillingStatus ??
    "PENDING_SETUP";

  const billingCycle =
    workspaceBilling?.contentWorkspaceBillingCycle ??
    selectedCycle;

  const status = workspaceBilling?.isComped
  ? {
      label: "Complimentary access",
      dot: "#2478FF",
      text: "#175CD3",
      bg: "#EFF8FF",
      border: "#D1E9FF",
    }
  : getWorkspaceStatus(billingStatus);

  const complimentaryPeriod =
  workspaceBilling?.isComped
    ? getComplimentaryPeriod(
        workspaceBilling.compedUntil
      )
    : null;

  /*
   * If the account has not created a Content Workspace
   * yet, send the user to the actual workspace entry point.
   *
   * We deliberately do not invent another subscription
   * endpoint here.
   */
  if (!plan) {
    return (
      <section
        id="content-workspace-subscription"
        className="space-y-6"
      >
        <div className="relative overflow-hidden rounded-[30px] border border-[#DCE7FF] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.065)]">
          <div className="absolute right-[-80px] top-[-100px] h-72 w-72 rounded-full bg-[#2478FF]/[0.08] blur-[80px]" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2478FF]">
                    <WorkspaceIcon className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                      Content Workspace
                    </p>

                    <p className="mt-0.5 text-xs text-[#667085]">
                      Plan · create · collaborate · approve
                    </p>
                  </div>
                </div>

                <h2 className="mt-6 text-[30px] font-semibold tracking-[-0.04em] text-[#101828] sm:text-[36px]">
                  Your clients deserve a
                  workspace, not another
                  folder.
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">
                  Build an ongoing space where you
                  and your clients can plan content,
                  upload assets, collaborate, review,
                  approve and publish.
                </p>

                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                  {[
                    "3-day free trial",
                    "No payment to start",
                    "AI Studio included",
                    "Client collaboration",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-[11px] font-medium text-[#475467]"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ECFDF3] text-[#12B76A]">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>

                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full shrink-0 rounded-[24px] border border-[#E1E4E9] bg-[#F9FAFB] p-5 lg:max-w-[310px]">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Start your workspace
                </p>

                <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#101828]">
                  Choose your plan
                </p>

                <p className="mt-1 text-xs leading-5 text-[#667085]">
                  You can start with a 3-day free trial.
                  No payment is required to begin.
                </p>

                <Link
                  href="/dashboard/calendars"
                  className="group mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(36,120,255,0.20)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8]"
                >
                  Start Content Workspace
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <WorkspacePlanComparison
          selectedCycle={selectedCycle}
          currentPlan={null}
        />
      </section>
    );
  }

  const planDetails =
    CONTENT_WORKSPACE_PLANS[plan];

  return (
    <section
      id="content-workspace-subscription"
      className="space-y-6"
    >
      {/* Existing subscription */}
      <div className="relative overflow-hidden rounded-[30px] border border-[#E7E9EE] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.065)]">
        <div className="relative overflow-hidden bg-[#0B0D12] px-6 py-7 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute right-[-50px] top-[-90px] h-64 w-64 rounded-full bg-[#2478FF]/20 blur-[75px]" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2478FF]/10 text-[#78AEFF] ring-1 ring-[#2478FF]/20">
                <WorkspaceIcon className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78AEFF]">
                    Content Workspace
                  </p>

                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      color: status.text,
                      background: "rgba(255,255,255,0.05)",
                      borderColor:
                        "rgba(255,255,255,0.10)",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: status.dot,
                      }}
                    />

                    {status.label}
                  </span>
                </div>

                <h2 className="mt-3 text-[27px] font-semibold tracking-[-0.035em] text-white">
                  {planDetails.name}
                </h2>

                <p className="mt-1.5 max-w-lg text-sm leading-6 text-white/45">
                  Your ongoing client workspace
                  subscription.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 sm:min-w-[160px]">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">
                Billing
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {billingCycle === "ANNUAL"
                  ? formatNaira(
                      planDetails.priceNgnAnnual
                    )
                  : formatNaira(
                      planDetails.priceNgnMonthly
                    )}
              </p>

              <p className="mt-0.5 text-[10px] text-white/30">
                {billingCycle === "ANNUAL"
                  ? "per year"
                  : "per month"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[#EAECF0] sm:grid-cols-4">
          <WorkspaceMetric
            label="Workspaces"
            value={String(
              planDetails.activeWorkspaces
            )}
            detail="Active client spaces"
          />

          <WorkspaceMetric
            label="Collaborators"
            value={String(
              planDetails.collaborators
            )}
            detail="Team members"
          />

          <WorkspaceMetric
            label="Storage"
            value={
              planDetails.storageBytes >=
              50_000_000_000
                ? "50 GB"
                : "5 GB"
            }
            detail="Included storage"
          />

          <WorkspaceMetric
            label="AI Studio"
            value={String(
              planDetails.aiGenerations
            )}
            detail="Generations / month"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#EAECF0] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
  {workspaceBilling?.isComped && complimentaryPeriod ? (
    <>
      <p className="text-xs font-semibold text-[#175CD3]">
        {complimentaryPeriod.label}
      </p>

      <p className="mt-1 text-[11px] text-[#667085]">
        {complimentaryPeriod.detail}
      </p>
    </>
  ) : billingStatus === "TRIAL" &&
    workspaceBilling?.contentWorkspaceTrialEndsAt ? (
    <>
      <p className="text-xs font-semibold text-[#175CD3]">
        Your free trial is active
      </p>

      <p className="mt-1 text-[11px] text-[#667085]">
        Trial ends{" "}
        {formatDate(
          workspaceBilling.contentWorkspaceTrialEndsAt
        )}
      </p>
    </>
  ) : billingStatus === "ACTIVE" &&
    workspaceBilling?.contentWorkspaceSubscriptionRenewsAt ? (
    <>
      <p className="text-xs font-semibold text-[#101828]">
        Next renewal
      </p>

      <p className="mt-1 text-[11px] text-[#667085]">
        {formatDate(
          workspaceBilling.contentWorkspaceSubscriptionRenewsAt
        )}
        {" · "}
        {billingCycle === "ANNUAL"
          ? "Annual"
          : "Monthly"}
      </p>
    </>
  ) : (
    <>
      <p className="text-xs font-semibold text-[#101828]">
        Workspace billing
      </p>

      <p className="mt-1 text-[11px] text-[#667085]">
        Manage your plan and access.
      </p>
    </>
  )}
</div>

          <Link
            href="/dashboard/calendars"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#344054] shadow-sm transition hover:bg-[#F9FAFB]"
          >
            Open Content Workspace
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Existing billing settings */}
      <div>
        <CalendarBillingSettings
          plan={plan}
          billingStatus={billingStatus}
          billingCycle={billingCycle}
          subscriptionRenewsAt={
            workspaceBilling?.contentWorkspaceSubscriptionRenewsAt
              ? workspaceBilling.contentWorkspaceSubscriptionRenewsAt.toISOString()
              : null
          }
          trialEndsAt={
            workspaceBilling?.contentWorkspaceTrialEndsAt
              ? workspaceBilling.contentWorkspaceTrialEndsAt.toISOString()
              : null
          }
        />
      </div>

      <WorkspacePlanComparison
        selectedCycle={selectedCycle}
        currentPlan={plan}
      />
    </section>
  );
}

/* ============================================================
   WORKSPACE METRIC
============================================================ */

function WorkspaceMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white p-5">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold tracking-tight text-[#101828]">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-[#98A2B3]">
        {detail}
      </p>
    </div>
  );
}

/* ============================================================
   WORKSPACE PLAN COMPARISON
============================================================ */

function WorkspacePlanComparison({
  selectedCycle,
  currentPlan,
}: {
  selectedCycle: BillingCycle;
  currentPlan: ContentWorkspacePlan | null;
}) {
  const plans: ContentWorkspacePlan[] = [
    "CREATOR",
    "STUDIO",
  ];

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
          Content Workspace plans
        </p>

        <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#101828]">
          Pick the workspace that fits your operation.
        </h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((planKey) => {
          const plan =
            CONTENT_WORKSPACE_PLANS[planKey];

          const isCurrent =
            currentPlan === planKey;

          const price =
            selectedCycle === "ANNUAL"
              ? plan.priceNgnAnnual
              : plan.priceNgnMonthly;

          return (
            <div
              key={planKey}
              className={`relative overflow-hidden rounded-[26px] border bg-white p-6 transition-all duration-300 ${
                isCurrent
                  ? "border-[#2478FF] shadow-[0_12px_40px_rgba(36,120,255,0.10)]"
                  : "border-[#E7E9EE] hover:-translate-y-0.5 hover:border-[#D0D5DD] hover:shadow-[0_14px_40px_rgba(16,24,40,0.06)]"
              }`}
            >
              {planKey === "STUDIO" && (
                <div className="absolute right-5 top-5 rounded-full bg-[#101828] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white">
                  For teams
                </div>
              )}

              {isCurrent && (
                <div className="absolute right-5 top-5 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#2478FF]">
                  Current plan
                </div>
              )}

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
                {plan.name}
              </p>

              <div className="mt-3 flex items-end gap-1">
                <span className="text-[31px] font-semibold tracking-[-0.045em] text-[#101828]">
                  {formatNaira(price)}
                </span>

                <span className="mb-1 text-xs text-[#98A2B3]">
                  {selectedCycle === "ANNUAL"
                    ? "/year"
                    : "/month"}
                </span>
              </div>

              {selectedCycle === "ANNUAL" && (
                <p className="mt-1 text-[10px] font-medium text-[#2478FF]">
                  5% annual savings
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <WorkspaceMiniStat
                  label="Workspaces"
                  value={String(
                    plan.activeWorkspaces
                  )}
                />

                <WorkspaceMiniStat
                  label="Collaborators"
                  value={String(
                    plan.collaborators
                  )}
                />

                <WorkspaceMiniStat
                  label="Storage"
                  value={
                    planKey === "STUDIO"
                      ? "50 GB"
                      : "5 GB"
                  }
                />

                <WorkspaceMiniStat
                  label="AI / month"
                  value={String(
                    plan.aiGenerations
                  )}
                />
              </div>

              <div className="mt-6 border-t border-[#EAECF0] pt-5">
                <p className="text-[11px] font-semibold text-[#344054]">
                  Included
                </p>

                <div className="mt-3 space-y-2">
                  {[
                    "Client collaboration",
                    "Content planning",
                    "Asset uploads",
                    "Client approvals",
                    "AI Studio",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-[11px] text-[#667085]"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ECFDF3] text-[#12B76A]">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>

                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <span className="text-[11px] font-semibold text-[#067647]">
                    Current plan
                  </span>
                ) : (
                  <Link
                    href="/dashboard/calendars"
                    className="group inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#344054] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#F9FAFB]"
                  >
                    {currentPlan
                      ? `Switch to ${plan.name}`
                      : `Start with ${plan.name}`}

                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceMiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-3">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#101828]">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function BillingSubscriptions({
  creator,
  usage,
  workspaceBilling,
  portfolioCount,
  selectedProduct,
  selectedTier,
  selectedCycle,
}: BillingSubscriptionsProps) {
  const [activeProduct, setActiveProduct] =
    useState<Product>(selectedProduct);

  const workspaceStatus =
    workspaceBilling?.contentWorkspaceBillingStatus ??
    "PENDING_SETUP";

  const workspacePlan =
    workspaceBilling?.contentWorkspacePlan;

  const deliveryStatus = getDeliveryStatus(
  usage.tier
);

const planName = getDeliveryPlanName(usage.tier);

const workspaceStatusMeta =
  getWorkspaceStatus(workspaceStatus);
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#101828]">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <header className="border-b border-[#E7E9EE] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-7 sm:px-7 sm:py-9 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#98A2B3] transition hover:text-[#101828]"
          >
            <span aria-hidden>←</span>
            Dashboard
          </Link>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                Account billing
              </p>

              <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[#101828] sm:text-[42px]">
                Subscriptions
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
                Everything you pay for on Showwork,
                organized in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E9EE] bg-[#F9FAFB] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                Account
              </p>

              <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-[#344054]">
                {creator.name || creator.email}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-7 sm:px-7 sm:py-9 lg:px-8">
        {/* ==================================================
            PRODUCT SWITCHER
        =================================================== */}

        <section>
          <div
            role="tablist"
            aria-label="Showwork subscriptions"
            className="flex flex-col gap-2 rounded-[24px] border border-[#E7E9EE] bg-[#EEF0F4] p-2 sm:flex-row"
          >
            <ProductTab
              active={
                activeProduct === "delivery"
              }
              icon={<DeliveryIcon />}
              title="Project Delivery"
              description="Client projects, files & approvals"
              badge={
                usage.tier === "FREE"
                  ? "Free"
                  : undefined
              }
              onClick={() =>
                setActiveProduct("delivery")
              }
            />

            <ProductTab
              active={
                activeProduct ===
                "content-workspace"
              }
              icon={<WorkspaceIcon />}
              title="Content Workspace"
              description="Plan, collaborate & publish"
              badge={
                workspacePlan
                  ? undefined
                  : "3-day trial"
              }
              onClick={() =>
                setActiveProduct(
                  "content-workspace"
                )
              }
            />
          </div>
        </section>

        {/* ==================================================
            ACTIVE PRODUCT SUMMARY
        =================================================== */}

        <section className="mt-7">
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#E7E9EE] bg-white p-5 shadow-[0_8px_30px_rgba(16,24,40,0.035)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  activeProduct === "delivery"
                    ? "bg-[#F2F4F7] text-[#344054]"
                    : "bg-[#EEF4FF] text-[#2478FF]"
                }`}
              >
                {activeProduct ===
                "delivery" ? (
                  <DeliveryIcon className="h-[18px] w-[18px]" />
                ) : (
                  <WorkspaceIcon className="h-[18px] w-[18px]" />
                )}
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Managing
                </p>

                <p className="mt-0.5 text-sm font-semibold text-[#101828]">
                  {activeProduct ===
                  "delivery"
                    ? "Project Delivery"
                    : "Content Workspace"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold"
                style={{
                  color:
                    activeProduct ===
                    "delivery"
                      ? deliveryStatus.text
                      : workspaceStatusMeta.text,
                  background:
                    activeProduct ===
                    "delivery"
                      ? deliveryStatus.bg
                      : workspaceStatusMeta.bg,
                  borderColor:
                    activeProduct ===
                    "delivery"
                      ? deliveryStatus.border
                      : workspaceStatusMeta.border,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      activeProduct ===
                      "delivery"
                        ? deliveryStatus.dot
                        : workspaceStatusMeta.dot,
                  }}
                />

                {activeProduct ===
                "delivery"
                  ? deliveryStatus.label
                  : workspaceStatusMeta.label}
              </span>

              <span className="text-[10px] text-[#98A2B3]">
                {activeProduct ===
                "delivery"
                  ? planName
                  : workspacePlan
                    ? workspacePlan ===
                      "STUDIO"
                      ? "Studio"
                      : "Creator"
                    : "Not started"}
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================
            ACTIVE SUBSCRIPTION CONTENT
        =================================================== */}

        <div className="mt-8">
          {activeProduct === "delivery" ? (
            <DeliverySubscription
              usage={usage}
              selectedTier={selectedTier}
              selectedCycle={selectedCycle}
            />
          ) : (
            <ContentWorkspaceSubscription
              workspaceBilling={
                workspaceBilling
              }
              selectedCycle={
                selectedCycle
              }
            />
          )}
        </div>

        {/* ==================================================
            PORTFOLIO
        =================================================== */}

        <section className="mt-12">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Included product
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#101828]">
              Portfolio
            </h2>
          </div>

          <div className="flex flex-col gap-5 rounded-[24px] border border-[#E7E9EE] bg-white p-5 shadow-[0_8px_30px_rgba(16,24,40,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#344054]">
                <PortfolioIcon className="h-[18px] w-[18px]" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#101828]">
                    Your Portfolio
                  </h3>

                  <span className="rounded-full border border-[#D1FADF] bg-[#ECFDF3] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#067647]">
                    Included
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-[#667085]">
                  {portfolioCount > 0
                    ? `${portfolioCount} portfolio${
                        portfolioCount === 1
                          ? ""
                          : "s"
                      } on your account.`
                    : "Your portfolio is included with Showwork."}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/portfolio"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#344054] shadow-sm transition hover:bg-[#F9FAFB]"
            >
              Manage portfolio
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ==================================================
            BILLING PRINCIPLES
        =================================================== */}

        <section className="mt-12 border-t border-[#E1E4E9] pt-8">
          <div className="grid gap-4 md:grid-cols-3">
            <BillingPrinciple
              number="01"
              title="One subscription per product"
              body="Project Delivery and Content Workspace are separate products, so you can subscribe to exactly what you need."
            />

            <BillingPrinciple
              number="02"
              title="No surprise AI bill"
              body="AI Studio is included inside Content Workspace. There is no separate AI subscription."
            />

            <BillingPrinciple
              number="03"
              title="Change when you need"
              body="Your plans and billing cycles can be managed from this Billing center without hunting through the dashboard."
            />
          </div>
        </section>

        <div className="mt-10 pb-8 text-center">
          <p className="text-[10px] text-[#98A2B3]">
            Showwork billing · Secure payments powered by Paystack
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   BILLING PRINCIPLE
============================================================ */

function BillingPrinciple({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E7E9EE] bg-white p-5">
      <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-[#2478FF]">
        {number}
      </span>

      <h3 className="mt-3 text-sm font-semibold tracking-[-0.01em] text-[#101828]">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[#667085]">
        {body}
      </p>
    </div>
  );
}