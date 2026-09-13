import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CONTENT_WORKSPACE_PLANS,
  STORAGE_GB,
} from "@/lib/contentWorkspaceEntitlements";

import ProfileEditor from "./ProfileEditor";

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
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({
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
      <path
        d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BriefcaseIcon({
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
        y="7"
        width="18"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon({
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
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CalendarIcon({
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
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparklesIcon({
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
      <path
        d="m12 3 1.35 4.65L18 9l-4.65 1.35L12 15l-1.35-4.65L6 9l4.65-1.35L12 3ZM19 14l.65 2.35L22 17l-2.35.65L19 20l-.65-2.35L16 17l2.35-.65L19 14ZM5 15l.55 1.95L7.5 17.5l-1.95.55L5 20l-.55-1.95-1.95-.55 1.95-.55L5 15Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreditCardIcon({
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
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3 9h18M7 15h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitials(
  name: string | null,
  email: string
) {
  const value = name?.trim();

  if (value) {
    const parts = value
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${
        parts[parts.length - 1][0]
      }`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

function formatDate(
  date: Date | null | undefined
) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function billingLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "TRIAL":
      return "Trial";
    case "OFFLINE":
      return "Offline";
    case "PENDING_SETUP":
      return "Not subscribed";
    case "PENDING":
      return "Pending";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/^\w/, (char) =>
          char.toUpperCase()
        );
  }
}

function StatusPill({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const positive =
    status === "ACTIVE" ||
    status === "TRIAL";

  const negative =
    status === "OFFLINE" ||
    status === "CANCELLED";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        positive
          ? "bg-emerald-50 text-emerald-700"
          : negative
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          positive
            ? "bg-emerald-500"
            : negative
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />

      {label}
    </span>
  );
}

export default async function ProfilePage() {
  const session = await getCurrentCreator();

  if (!session) {
    redirect("/login");
  }

  const creator = await db.creator.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      accountType: true,
      phone: true,
      companyName: true,
      createdAt: true,
      avatarUrl: true,
      emailVerified: true,
      notifyOnView: true,

      subscriptionTier: true,
      subscriptionActive: true,
      subscriptionCycle: true,
      subscriptionRenewsAt: true,

      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspaceTrialEndsAt: true,
      contentWorkspaceSubscriptionRenewsAt: true,
    },
  });

  if (!creator) {
    redirect("/login");
  }

  const [
    portfolios,
    projectCount,
    managedProjectCount,
    workspaceCount,
    workspaceUsage,
  ] = await Promise.all([
    db.portfolio.findMany({
      where: {
        creatorId: creator.id,
      },
      select: {
        id: true,
        slug: true,
        companyName: true,
        logoUrl: true,
        heroBannerDesktopUrl: true,
        billingStatus: true,
        subscriptionRenewsAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    db.project.count({
      where: {
        creatorId: creator.id,
      },
    }),

    db.managedProject.count({
      where: {
        creatorId: creator.id,
      },
    }),

    db.socialCalendar.count({
      where: {
        managerId: creator.id,
      },
    }),

    db.contentWorkspaceUsage.findUnique({
      where: {
        creatorId: creator.id,
      },
      select: {
        storageBytes: true,
        storageReservedBytes: true,
        aiGenerationsUsed: true,
        aiRegenerationsUsed: true,
      },
    }),
  ]);

  const workspacePlan = creator.contentWorkspacePlan
    ? CONTENT_WORKSPACE_PLANS[
        creator.contentWorkspacePlan
      ]
    : null;

  const storageUsedBytes = workspaceUsage
    ? Number(workspaceUsage.storageBytes) +
      Number(workspaceUsage.storageReservedBytes)
    : 0;

  const storageLimitBytes =
    workspacePlan?.storageBytes ?? 0;

  const storagePercent =
    storageLimitBytes > 0
      ? Math.min(
          100,
          Math.round(
            (storageUsedBytes /
              storageLimitBytes) *
              100
          )
        )
      : 0;

  const portfolio = portfolios[0] ?? null;

  const accountTypeLabel =
    creator.accountType === "AGENCY"
      ? "Agency"
      : "Creator";

  const mainPlanLabel =
    creator.subscriptionActive
      ? creator.subscriptionTier
          .charAt(0)
          .toUpperCase() +
        creator.subscriptionTier
          .slice(1)
          .toLowerCase()
      : "Free";

  const initials = getInitials(
    creator.name,
    creator.email
  );

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#111318]">
      {/* HEADER */}
      <header className="border-b border-black/[0.07] bg-white">
        <div className="mx-auto max-w-[1380px] px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-5">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-[12px] font-medium text-[#667085] transition hover:text-[#101828]"
              >
                ←
                <span>Dashboard</span>
              </Link>

              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
                  Account
                </p>

                <h1 className="mt-1 text-[29px] font-semibold tracking-[-0.04em] text-[#101828] sm:text-[34px]">
                  Account settings
                </h1>

                <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#667085]">
                  Manage your personal information,
                  preferences and Showwork workspace
                  subscriptions.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-[#344054]">
                  {creator.name ||
                    "Showwork creator"}
                </p>

                <p className="mt-0.5 text-[10px] text-[#98A2B3]">
                  {accountTypeLabel} account
                </p>
              </div>

              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2478FF] text-[11px] font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* MAIN */}
          <div className="min-w-0">
            <ProfileEditor
  creator={{
    name: creator.name,
    email: creator.email,
    phone: creator.phone,
    companyName: creator.companyName,
    avatarUrl: creator.avatarUrl,
    notifyOnView: creator.notifyOnView,
    accountType: creator.accountType,
  }}
/>

            {/* PRODUCTS */}
            <section className="mt-8">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">
                  Showwork products
                </p>

                <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.025em] text-[#101828]">
                  Your creative stack
                </h2>
              </div>

              <div className="space-y-4">
                {/* PORTFOLIO */}
                <section className="overflow-hidden rounded-[24px] border border-black/[0.07] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
                  <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
                    <div className="relative min-h-[190px] overflow-hidden bg-[#111318]">
                      {portfolio?.heroBannerDesktopUrl ? (
                        <img
                          src={
                            portfolio.heroBannerDesktopUrl
                          }
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white">
                            <BriefcaseIcon className="h-5 w-5" />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                          Public portfolio
                        </p>

                        <p className="mt-1 text-[16px] font-semibold text-white">
                          {portfolio?.companyName ??
                            "Your portfolio"}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#344054]">
                            <BriefcaseIcon className="h-[18px] w-[18px]" />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[16px] font-semibold text-[#101828]">
                                Portfolio
                              </h3>

                              <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[9px] font-semibold text-[#667085]">
                                Included
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] leading-5 text-[#667085]">
                              Your public home for your
                              creative work and professional
                              identity.
                            </p>
                          </div>
                        </div>

                        <StatusPill
                          status={
                            portfolio?.billingStatus ??
                            "PENDING"
                          }
                          label={
                            portfolio
                              ? billingLabel(
                                  portfolio.billingStatus
                                )
                              : "Not created"
                          }
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#F8FAFC] p-3">
                          <p className="text-[9px] text-[#98A2B3]">
                            Portfolios
                          </p>

                          <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                            {portfolios.length}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#F8FAFC] p-3">
                          <p className="text-[9px] text-[#98A2B3]">
                            Live
                          </p>

                          <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                            {
                              portfolios.filter(
                                (item) =>
                                  item.billingStatus ===
                                  "ACTIVE"
                              ).length
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#F8FAFC] p-3">
                          <p className="text-[9px] text-[#98A2B3]">
                            URL
                          </p>

                          <p className="mt-1 truncate text-[11px] font-semibold text-[#344054]">
                            {portfolio
                              ? `/p/${portfolio.slug}`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/dashboard/portfolio"
                        className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#111318] px-3.5 text-[11px] font-semibold text-white transition hover:bg-black"
                      >
                        Manage portfolio
                        <ArrowUpRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </section>

                {/* CONTENT WORKSPACE */}
                <section className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.025)] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2478FF]">
                        <CalendarIcon className="h-[18px] w-[18px]" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[16px] font-semibold text-[#101828]">
                            Content Workspace
                          </h3>

                          {workspacePlan && (
                            <span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[9px] font-bold text-[#2478FF]">
                              {workspacePlan.name}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-[#667085]">
                          Plan, create, collaborate, approve
                          and publish client content.
                        </p>
                      </div>
                    </div>

                    <StatusPill
                      status={
                        creator.contentWorkspaceBillingStatus
                      }
                      label={billingLabel(
                        creator.contentWorkspaceBillingStatus
                      )}
                    />
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Workspaces
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {workspaceCount}
                      </p>

                      <p className="mt-1 text-[9px] text-[#98A2B3]">
                        /{" "}
                        {workspacePlan?.activeWorkspaces ??
                          "—"}{" "}
                        allowed
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Storage
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {workspacePlan
                          ? `${STORAGE_GB[creator.contentWorkspacePlan!]} GB`
                          : "—"}
                      </p>

                      {workspacePlan && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAECF0]">
                          <div
                            className="h-full rounded-full bg-[#2478FF]"
                            style={{
                              width: `${storagePercent}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        AI generations
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {workspaceUsage
                          ?.aiGenerationsUsed ?? 0}
                        <span className="ml-1 text-[9px] font-normal text-[#98A2B3]">
                          /{" "}
                          {workspacePlan?.aiGenerations ??
                            "—"}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Billing
                      </p>

                      <p className="mt-1 text-[12px] font-semibold text-[#101828]">
                        {creator.contentWorkspaceBillingCycle ===
                        "ANNUAL"
                          ? "Annual"
                          : "Monthly"}
                      </p>
                    </div>
                  </div>

                  {creator.contentWorkspaceSubscriptionRenewsAt && (
                    <div className="mt-4 flex items-center justify-between border-t border-[#EAECF0] pt-4">
                      <span className="text-[10px] text-[#98A2B3]">
                        Renews{" "}
                        {formatDate(
                          creator.contentWorkspaceSubscriptionRenewsAt
                        )}
                      </span>

                      <Link
                        href="/dashboard/calendars"
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#2478FF]"
                      >
                        Manage billing
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}

                  <Link
                    href="/dashboard/calendars"
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#2478FF] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#1769E8]"
                  >
                    Open Content Workspace
                    <ArrowUpRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </section>

                {/* PROJECT DELIVERY */}
                <section className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.025)] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#344054]">
                        <GridIcon className="h-[18px] w-[18px]" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[16px] font-semibold text-[#101828]">
                            Project Delivery
                          </h3>

                          <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[9px] font-semibold text-[#667085]">
                            Showwork
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-[#667085]">
                          Manage projects, files, reviews and
                          client delivery.
                        </p>
                      </div>
                    </div>

                    <StatusPill
                      status={
                        creator.subscriptionActive
                          ? "ACTIVE"
                          : "FREE"
                      }
                      label={
                        creator.subscriptionActive
                          ? "Active"
                          : "Free"
                      }
                    />
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Current plan
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {mainPlanLabel}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Projects
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {projectCount}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Managed projects
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-[#101828]">
                        {managedProjectCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/projects"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3.5 text-[11px] font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                    >
                      Open Project Delivery
                      <ArrowUpRightIcon className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      href="/dashboard/billing"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3.5 text-[11px] font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                    >
                      <CreditCardIcon className="h-3.5 w-3.5" />
                      Manage billing
                    </Link>
                  </div>
                </section>
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-5">
            {/* ACCOUNT SUMMARY */}
            <section className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-[#667085]" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Account
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[9px] text-[#98A2B3]">
                    Account type
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-[#344054]">
                    {accountTypeLabel}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-[#98A2B3]">
                    Email
                  </p>

                  <p className="mt-1 break-all text-[12px] font-semibold text-[#344054]">
                    {creator.email}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-[#98A2B3]">
                    Member since
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-[#344054]">
                    {formatDate(creator.createdAt)}
                  </p>
                </div>
              </div>
            </section>

            {/* BILLING */}
            <section className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4 text-[#667085]" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Billing
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <Link
                  href="/dashboard/billing"
                  className="group flex items-center justify-between rounded-xl border border-[#EAECF0] p-3.5 transition hover:border-[#D0D5DD] hover:bg-[#FCFCFD]"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[#344054]">
                      Project Delivery
                    </p>

                    <p className="mt-1 text-[10px] text-[#98A2B3]">
                      {mainPlanLabel}
                    </p>
                  </div>

                  <ArrowRightIcon className="h-3.5 w-3.5 text-[#98A2B3] transition group-hover:text-[#2478FF]" />
                </Link>

                <Link
                  href="/dashboard/calendars"
                  className="group flex items-center justify-between rounded-xl border border-[#EAECF0] p-3.5 transition hover:border-[#D0D5DD] hover:bg-[#FCFCFD]"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[#344054]">
                      Content Workspace
                    </p>

                    <p className="mt-1 text-[10px] text-[#98A2B3]">
                      {workspacePlan?.name ??
                        "Not subscribed"}
                    </p>
                  </div>

                  <ArrowRightIcon className="h-3.5 w-3.5 text-[#98A2B3] transition group-hover:text-[#2478FF]" />
                </Link>
              </div>
            </section>

            {/* USAGE */}
            <section className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-[#2478FF]" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Workspace usage
                </p>
              </div>

              {workspacePlan ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-[#667085]">
                      Storage
                    </p>

                    <p className="text-[10px] font-semibold text-[#344054]">
                      {storagePercent}%
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full rounded-full bg-[#2478FF]"
                      style={{
                        width: `${storagePercent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[9px] text-[#98A2B3]">
                    <span>
                      {(
                        storageUsedBytes /
                        1_000_000_000
                      ).toFixed(2)}{" "}
                      GB used
                    </span>

                    <span>
                      {(
                        storageLimitBytes /
                        1_000_000_000
                      ).toFixed(0)}{" "}
                      GB
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        AI generations
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#101828]">
                        {workspaceUsage
                          ?.aiGenerationsUsed ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[9px] text-[#98A2B3]">
                        Regenerations
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#101828]">
                        {workspaceUsage
                          ?.aiRegenerationsUsed ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4">
                  <p className="text-[11px] font-semibold text-[#344054]">
                    No active Content Workspace.
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#98A2B3]">
                    Start a workspace to begin planning
                    and collaborating with clients.
                  </p>
                </div>
              )}
            </section>

            {/* QUICK LINKS */}
            <section className="rounded-[22px] bg-[#101318] p-5 text-white">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Quick access
              </p>

              <div className="mt-3 space-y-1">
                <Link
                  href="/dashboard/portfolio"
                  className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-white/[0.06]"
                >
                  <span className="text-[11px] font-medium text-white/75">
                    Portfolio
                  </span>

                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-white/30" />
                </Link>

                <Link
                  href="/dashboard/calendars"
                  className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-white/[0.06]"
                >
                  <span className="text-[11px] font-medium text-white/75">
                    Content Workspace
                  </span>

                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-white/30" />
                </Link>

                <Link
                  href="/dashboard/projects"
                  className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-white/[0.06]"
                >
                  <span className="text-[11px] font-medium text-white/75">
                    Project Delivery
                  </span>

                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-white/30" />
                </Link>

                <Link
                  href="/dashboard/billing"
                  className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-white/[0.06]"
                >
                  <span className="text-[11px] font-medium text-white/75">
                    Billing
                  </span>

                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-white/30" />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-10 border-t border-black/[0.07] pt-6">
          <div className="flex flex-col gap-2 text-[10px] text-[#98A2B3] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showwork account · {creator.email}
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="hover:text-[#344054]"
              >
                Dashboard
              </Link>

              <Link
                href="/dashboard/billing"
                className="hover:text-[#344054]"
              >
                Billing
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

