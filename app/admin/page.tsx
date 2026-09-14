import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { whatsappLinkFor } from "@/lib/phone";

import AddCreatorForm from "@/components/admin/AddCreatorForm";
import BulkCreatorImportForm from "@/components/admin/BulkCreatorImportForm";
import GlobalDiscountForm from "@/components/admin/GlobalDiscountForm";
import CreatorRowActions from "@/components/admin/CreatorRowActions";

const PAGE_SIZE = 20;

const COLOR = {
  blue: "#2478FF",
  blueSoft: "#EEF4FF",
  ink: "#101828",
  muted: "#667085",
  line: "#E4E7EC",
  background: "#F7F8FA",
  white: "#FFFFFF",
  green: "#12B76A",
  greenSoft: "#ECFDF3",
  orange: "#F79009",
  orangeSoft: "#FFFAEB",
  red: "#F04438",
  redSoft: "#FEF3F2",
  purple: "#7F56D9",
  purpleSoft: "#F9F5FF",
};

function formatNgn(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Never";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "Never";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string | null, email: string) {
  const value = name?.trim() || email;

  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function accountTypeLabel(value: string) {
  const normalized = value.replace(/_/g, " ").toLowerCase();

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deliveryPlanLabel(creator: {
  isComped: boolean;
  subscriptionActive: boolean;
  subscriptionTier: string;
  freeTierLimitOverride: number | null;
}) {
  if (creator.isComped) {
    return "Unlimited · Comped";
  }

  if (creator.subscriptionActive) {
    return creator.subscriptionTier;
  }

  if (creator.freeTierLimitOverride !== null) {
    return `Free · ${creator.freeTierLimitOverride}/mo`;
  }

  return "Free";
}

function deliveryStatusLabel(creator: {
  isComped: boolean;
  subscriptionActive: boolean;
}) {
  if (creator.isComped) return "Comped";
  if (creator.subscriptionActive) return "Active";
  return "Free";
}

function workspaceStatusLabel(
  status: string,
  plan: string | null,
  trialEndsAt: Date | null
) {
  if (status === "ACTIVE") {
    return plan ? `${plan} · Active` : "Active";
  }

  if (status === "TRIAL") {
    if (trialEndsAt) {
      return `${plan ?? "Trial"} · Trial`;
    }

    return "Trial";
  }

  if (status === "OFFLINE") {
    return "Offline";
  }

  return "Not subscribed";
}

function statusBadgeStyle(status: string) {
  if (status === "ACTIVE") {
    return {
      background: COLOR.greenSoft,
      color: "#067647",
      border: "#ABEFC6",
    };
  }

  if (status === "TRIAL") {
    return {
      background: COLOR.blueSoft,
      color: "#175CD3",
      border: "#B2DDFF",
    };
  }

  if (status === "OFFLINE") {
    return {
      background: COLOR.redSoft,
      color: "#B42318",
      border: "#FECDCA",
    };
  }

  return {
    background: "#F2F4F7",
    color: "#667085",
    border: "#D0D5DD",
  };
}

function buildQuery(
  params: {
    q?: string;
    type?: string;
    status?: string;
    product?: string;
    page?: string;
  },
  overrides: Partial<typeof params> = {}
) {
  const merged = {
    ...params,
    ...overrides,
  };

  const search = new URLSearchParams();

  if (merged.q) search.set("q", merged.q);
  if (merged.type) search.set("type", merged.type);
  if (merged.status) search.set("status", merged.status);
  if (merged.product) search.set("product", merged.product);
  if (merged.page) search.set("page", merged.page);

  const query = search.toString();

  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    product?: string;
    page?: string;
  }>;
}) {
  const currentCreator = await getCurrentCreator();

  if (!currentCreator) {
    redirect("/login");
  }

  if (!isAdminEmail(currentCreator.email)) {
    notFound();
  }

  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const type = params.type?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const product = params.product?.trim() ?? "";

  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const safeRequestedPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  /*
   * IMPORTANT:
   *
   * The production database currently has a Prisma connection limit of 1.
   * Therefore this page intentionally does NOT use Promise.all() for
   * independent Prisma calls.
   *
   * Every database operation completes before the next one begins.
   */

  // ------------------------------------------------------------
  // PLATFORM COUNTS
  // ------------------------------------------------------------

  const totalCreators = await db.creator.count();

  const totalProjects = await db.project.count();

  const totalManagedProjects = await db.managedProject.count();

  const totalPortfolios = await db.portfolio.count();

  const totalCalendars = await db.socialCalendar.count();

  const totalMedia = await db.media.count();

  const totalViewerEmails = await db.viewerEmail.count();

  const activeDeliveryAccounts = await db.creator.count({
    where: {
      OR: [
        {
          subscriptionActive: true,
        },
        {
          isComped: true,
        },
      ],
    },
  });

  const activeWorkspaceAccounts = await db.creator.count({
    where: {
      contentWorkspaceBillingStatus: "ACTIVE",
      contentWorkspacePlan: {
        not: null,
      },
    },
  });

  const trialWorkspaceAccounts = await db.creator.count({
    where: {
      contentWorkspaceBillingStatus: "TRIAL",
      contentWorkspacePlan: {
        not: null,
      },
    },
  });

  const offlineWorkspaceAccounts = await db.creator.count({
    where: {
      contentWorkspaceBillingStatus: "OFFLINE",
    },
  });

  const deactivatedAccounts = await db.creator.count({
    where: {
      isDeactivated: true,
    },
  });

  const compedAccounts = await db.creator.count({
    where: {
      isComped: true,
    },
  });

  // ------------------------------------------------------------
  // REVENUE
  // ------------------------------------------------------------

  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const startOfYear = new Date(
    now.getFullYear(),
    0,
    1
  );

  const allTimeRevenue = await db.paymentRecord.aggregate({
    _sum: {
      amountNgn: true,
    },
  });

  const monthRevenue = await db.paymentRecord.aggregate({
    _sum: {
      amountNgn: true,
    },
    where: {
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  const yearRevenue = await db.paymentRecord.aggregate({
    _sum: {
      amountNgn: true,
    },
    where: {
      createdAt: {
        gte: startOfYear,
      },
    },
  });

  // ------------------------------------------------------------
  // LAST 12 MONTHS REVENUE
  // ------------------------------------------------------------

  const twelveMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1
  );

  const recentPayments = await db.paymentRecord.findMany({
    where: {
      createdAt: {
        gte: twelveMonthsAgo,
      },
    },
    select: {
      amountNgn: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const monthlyBreakdown: {
    label: string;
    shortLabel: string;
    total: number;
  }[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const total = recentPayments
      .filter(
        (payment) =>
          payment.createdAt.getFullYear() ===
            monthDate.getFullYear() &&
          payment.createdAt.getMonth() ===
            monthDate.getMonth()
      )
      .reduce(
        (sum, payment) => sum + payment.amountNgn,
        0
      );

    monthlyBreakdown.push({
      label: monthDate.toLocaleDateString("en-NG", {
        month: "long",
        year: "numeric",
      }),
      shortLabel: monthDate.toLocaleDateString("en-NG", {
        month: "short",
      }),
      total,
    });
  }

  const maxMonthlyRevenue = Math.max(
    1,
    ...monthlyBreakdown.map((item) => item.total)
  );

  // ------------------------------------------------------------
  // CREATOR FILTERS
  // ------------------------------------------------------------

  const creatorWhere: Record<string, unknown> = {};

  if (q) {
    creatorWhere.OR = [
      {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        companyName: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: q,
          mode: "insensitive",
        },
      },
    ];
  }

  if (type) {
    creatorWhere.accountType = type;
  }

  if (status === "ACTIVE") {
    creatorWhere.isDeactivated = false;
  }

  if (status === "DEACTIVATED") {
    creatorWhere.isDeactivated = true;
  }

  if (status === "COMPEd") {
    creatorWhere.isComped = true;
  }

  if (product === "DELIVERY") {
    creatorWhere.OR = [
      {
        subscriptionActive: true,
      },
      {
        isComped: true,
      },
    ];
  }

  if (product === "WORKSPACE") {
    creatorWhere.contentWorkspacePlan = {
      not: null,
    };
  }

  if (product === "PORTFOLIO") {
    creatorWhere.portfolios = {
      some: {},
    };
  }

  // ------------------------------------------------------------
  // FILTERED CREATOR COUNT
  // ------------------------------------------------------------

  const filteredCreatorCount = await db.creator.count({
    where: creatorWhere,
  });

  const totalCreatorPages = Math.max(
    1,
    Math.ceil(filteredCreatorCount / PAGE_SIZE)
  );

  const currentPage = Math.min(
    safeRequestedPage,
    totalCreatorPages
  );

  // ------------------------------------------------------------
  // CREATOR LIST
  // ------------------------------------------------------------

  const creators = await db.creator.findMany({
    where: creatorWhere,
    orderBy: {
      createdAt: "desc",
    },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      email: true,
      name: true,
      accountType: true,
      phone: true,
      companyName: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerified: true,
      isDeactivated: true,
      notifyOnView: true,

      subscriptionTier: true,
      subscriptionActive: true,
      subscriptionCycle: true,
      subscriptionRenewsAt: true,

      isComped: true,
      discountPercent: true,
      freeTierLimitOverride: true,

      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspaceTrialUsedAt: true,
      contentWorkspaceTrialEndsAt: true,
      contentWorkspaceSubscriptionRenewsAt: true,

      portfolios: {
        select: {
          id: true,
          billingStatus: true,
        },
      },

      contentWorkspaceUsage: {
        select: {
          storageBytes: true,
          storageReservedBytes: true,
          aiGenerationsUsed: true,
          aiRegenerationsUsed: true,
        },
      },

      _count: {
        select: {
          projects: true,
          managedProjects: true,
          portfolios: true,
          ownedCalendars: true,
          paymentRecords: true,
        },
      },
    },
  });

  // ------------------------------------------------------------
  // CURRENT PAGE PAYMENT TOTALS
  // ------------------------------------------------------------

  const creatorIds = creators.map((creator) => creator.id);

  const creatorPaymentTotals =
    creatorIds.length > 0
      ? await db.paymentRecord.groupBy({
          by: ["creatorId"],
          where: {
            creatorId: {
              in: creatorIds,
            },
          },
          _sum: {
            amountNgn: true,
          },
        })
      : [];

  const paymentTotalByCreator = new Map<string, number>();

  for (const payment of creatorPaymentTotals) {
    paymentTotalByCreator.set(
      payment.creatorId,
      payment._sum.amountNgn ?? 0
    );
  }

  // ------------------------------------------------------------
  // PLATFORM SETTINGS
  // ------------------------------------------------------------

  const platformSettings =
    await db.platformSettings.findUnique({
      where: {
        id: "singleton",
      },
    });
    const globalDiscountPercent =
  platformSettings?.globalDiscountPercent ?? 0;

  // ------------------------------------------------------------
  // DERIVED VALUES
  // ------------------------------------------------------------

  const allTimeRevenueValue =
    allTimeRevenue._sum.amountNgn ?? 0;

  const monthRevenueValue =
    monthRevenue._sum.amountNgn ?? 0;

  const yearRevenueValue =
    yearRevenue._sum.amountNgn ?? 0;

  const payingOrComped =
    activeDeliveryAccounts + activeWorkspaceAccounts;

  const averageRevenuePerCreator =
    totalCreators > 0
      ? Math.round(allTimeRevenueValue / totalCreators)
      : 0;

  const firstVisibleResult =
    filteredCreatorCount === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const lastVisibleResult = Math.min(
    currentPage * PAGE_SIZE,
    filteredCreatorCount
  );

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#101828]">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#E4E7EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101828] text-sm font-black text-white">
                S
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-[-0.02em] text-[#101828]">
                  Showwork
                </p>

                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
                  Admin command center
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden min-h-10 items-center rounded-xl border border-[#D0D5DD] bg-white px-4 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB] sm:inline-flex"
              >
                Dashboard
              </Link>

              <a
                href="/api/admin/creators/export"
                className="inline-flex min-h-10 items-center rounded-xl bg-[#101828] px-4 text-xs font-semibold text-white transition hover:bg-[#1D2939]"
              >
                <span className="hidden sm:inline">
                  Export CSV
                </span>

                <span className="sm:hidden">Export</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        {/* =====================================================
            INTRO
        ====================================================== */}

        <section>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9E6FF] bg-[#EEF4FF] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />

                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#175CD3]">
                  Live platform
                </span>
              </div>

              <h1 className="text-[32px] font-semibold tracking-[-0.045em] text-[#101828] sm:text-[42px]">
                Platform overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Monitor customers, subscriptions, workspaces,
                delivery activity, portfolios and revenue from
                one place.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(16,24,40,0.03)]">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3]">
                Today
              </p>

              <p className="mt-1 text-sm font-semibold text-[#344054]">
                {formatDateTime(now)}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            TOP METRICS
        ====================================================== */}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total accounts"
            value={totalCreators.toLocaleString()}
            detail={`${deactivatedAccounts.toLocaleString()} deactivated`}
            icon={<UsersIcon />}
          />

          <MetricCard
            label="Active delivery"
            value={activeDeliveryAccounts.toLocaleString()}
            detail={`${compedAccounts.toLocaleString()} comped`}
            icon={<BriefcaseIcon />}
          />

          <MetricCard
            label="Workspace accounts"
            value={activeWorkspaceAccounts.toLocaleString()}
            detail={`${trialWorkspaceAccounts.toLocaleString()} on trial`}
            icon={<WorkspaceIcon />}
          />

          <MetricCard
            label="All-time revenue"
            value={formatNgn(allTimeRevenueValue)}
            detail={`${formatNgn(monthRevenueValue)} this month`}
            icon={<RevenueIcon />}
          />
        </section>

        {/* =====================================================
            PRODUCT FOOTPRINT
        ====================================================== */}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SmallMetric
            label="Portfolios"
            value={totalPortfolios}
          />

          <SmallMetric
            label="Delivery projects"
            value={totalProjects}
          />

          <SmallMetric
            label="Managed projects"
            value={totalManagedProjects}
          />

          <SmallMetric
            label="Content workspaces"
            value={totalCalendars}
          />

          <SmallMetric
            label="Files"
            value={totalMedia}
          />

          <SmallMetric
            label="Viewer emails"
            value={totalViewerEmails}
          />
        </section>

        {/* =====================================================
            REVENUE SECTION
        ====================================================== */}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                Financial performance
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
                Revenue performance
              </h2>
            </div>

            <p className="text-xs text-[#98A2B3]">
              Recorded payment transactions
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="min-w-0 rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-[0_8px_30px_rgba(16,24,40,0.035)] sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <RevenueStat
                  label="This month"
                  value={formatNgn(monthRevenueValue)}
                />

                <RevenueStat
                  label="This year"
                  value={formatNgn(yearRevenueValue)}
                />

                <RevenueStat
                  label="Average / account"
                  value={formatNgn(averageRevenuePerCreator)}
                />
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#344054]">
                      Last 12 months
                    </p>

                    <p className="mt-0.5 text-xs text-[#98A2B3]">
                      Monthly payment volume
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-[#667085]">
                    {formatNgn(allTimeRevenueValue)} total
                  </p>
                </div>

                <div className="flex h-[190px] items-end gap-2 sm:gap-3">
                  {monthlyBreakdown.map((month) => {
                    const height =
                      month.total === 0
                        ? 5
                        : Math.max(
                            8,
                            (month.total / maxMonthlyRevenue) *
                              150
                          );

                    return (
                      <div
                        key={month.label}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div className="flex h-[155px] w-full items-end">
                          <div
                            className="group relative w-full rounded-t-lg bg-[#2478FF] transition-opacity hover:opacity-80"
                            style={{
                              height: `${height}px`,
                            }}
                            title={`${month.label}: ${formatNgn(
                              month.total
                            )}`}
                          >
                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#101828] px-2.5 py-1.5 text-[10px] font-semibold text-white group-hover:block">
                              {formatNgn(month.total)}
                            </div>
                          </div>
                        </div>

                        <span className="text-[9px] font-medium text-[#98A2B3]">
                          {month.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E4E7EC] bg-[#101828] p-5 text-white shadow-[0_8px_30px_rgba(16,24,40,0.08)] sm:p-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
                Platform health
              </p>

              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                Account health
              </h3>

              <div className="mt-6 space-y-4">
                <HealthRow
                  label="Active delivery"
                  value={activeDeliveryAccounts}
                  total={totalCreators}
                />

                <HealthRow
                  label="Active workspace"
                  value={activeWorkspaceAccounts}
                  total={totalCreators}
                />

                <HealthRow
                  label="Workspace trials"
                  value={trialWorkspaceAccounts}
                  total={totalCreators}
                />

                <HealthRow
                  label="Comped accounts"
                  value={compedAccounts}
                  total={totalCreators}
                />

                <HealthRow
                  label="Deactivated"
                  value={deactivatedAccounts}
                  total={totalCreators}
                />
              </div>

              {offlineWorkspaceAccounts > 0 && (
                <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3">
                  <p className="text-xs font-semibold text-red-300">
                    {offlineWorkspaceAccounts} workspace{" "}
                    {offlineWorkspaceAccounts === 1
                      ? "account needs"
                      : "accounts need"}{" "}
                    attention.
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-white/40">
                    These accounts currently have an offline
                    Content Workspace billing state.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            ADMIN TOOLS
        ====================================================== */}

        {/* Admin Tools */}
<section className="mt-8 min-w-0">
  <div className="mb-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
      Administration
    </p>
    <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
      Admin Tools
    </h2>
    <p className="mt-1 text-sm leading-6 text-slate-600">
      Manage creators, platform discounts, and account access from one place.
    </p>
  </div>

  <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
    {/* Add Creator */}
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19a4 4 0 0 0-8 0M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 8v6M16 11h6"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            Add Creator
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Create a creator account manually.
          </p>
        </div>
      </div>

      <div
        className="
          min-w-0
          [&_label]:mb-1.5
          [&_label]:block
          [&_label]:text-xs
          [&_label]:font-medium
          [&_label]:text-slate-700

          [&_input]:w-full
          [&_input]:min-w-0
          [&_input]:rounded-xl
          [&_input]:border
          [&_input]:border-slate-300
          [&_input]:bg-white
          [&_input]:px-3
          [&_input]:py-2.5
          [&_input]:text-sm
          [&_input]:text-slate-950
          [&_input]:outline-none
          [&_input]:placeholder:text-slate-400
          [&_input]:focus:border-slate-500
          [&_input]:focus:ring-2
          [&_input]:focus:ring-slate-200

          [&_select]:w-full
          [&_select]:min-w-0
          [&_select]:rounded-xl
          [&_select]:border
          [&_select]:border-slate-300
          [&_select]:bg-white
          [&_select]:px-3
          [&_select]:py-2.5
          [&_select]:text-sm
          [&_select]:text-slate-950
          [&_select]:outline-none
          [&_select]:focus:border-slate-500
          [&_select]:focus:ring-2
          [&_select]:focus:ring-slate-200

          [&_textarea]:w-full
          [&_textarea]:min-w-0
          [&_textarea]:rounded-xl
          [&_textarea]:border
          [&_textarea]:border-slate-300
          [&_textarea]:bg-white
          [&_textarea]:px-3
          [&_textarea]:py-2.5
          [&_textarea]:text-sm
          [&_textarea]:text-slate-950
          [&_textarea]:outline-none
          [&_textarea]:placeholder:text-slate-400
          [&_textarea]:focus:border-slate-500
          [&_textarea]:focus:ring-2
          [&_textarea]:focus:ring-slate-200

          [&_button]:max-w-full
          [&_button]:rounded-xl
        "
      >
        <AddCreatorForm />
      </div>
    </div>

    {/* Bulk Import */}
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14a2 2 0 0 0 2-2v-2M3 17v2a2 2 0 0 0 2 2"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            Bulk Import
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add multiple creator accounts at once.
          </p>
        </div>
      </div>

      <div
        className="
          min-w-0
          [&_label]:mb-1.5
          [&_label]:block
          [&_label]:text-xs
          [&_label]:font-medium
          [&_label]:text-slate-700

          [&_input]:w-full
          [&_input]:min-w-0
          [&_input]:rounded-xl
          [&_input]:border
          [&_input]:border-slate-300
          [&_input]:bg-white
          [&_input]:px-3
          [&_input]:py-2.5
          [&_input]:text-sm
          [&_input]:text-slate-950
          [&_input]:outline-none
          [&_input]:placeholder:text-slate-400
          [&_input]:focus:border-slate-500
          [&_input]:focus:ring-2
          [&_input]:focus:ring-slate-200

          [&_textarea]:w-full
          [&_textarea]:min-w-0
          [&_textarea]:rounded-xl
          [&_textarea]:border
          [&_textarea]:border-slate-300
          [&_textarea]:bg-white
          [&_textarea]:px-3
          [&_textarea]:py-2.5
          [&_textarea]:text-sm
          [&_textarea]:text-slate-950
          [&_textarea]:outline-none
          [&_textarea]:placeholder:text-slate-400
          [&_textarea]:focus:border-slate-500
          [&_textarea]:focus:ring-2
          [&_textarea]:focus:ring-slate-200

          [&_select]:w-full
          [&_select]:min-w-0
          [&_select]:rounded-xl
          [&_select]:border
          [&_select]:border-slate-300
          [&_select]:bg-white
          [&_select]:px-3
          [&_select]:py-2.5
          [&_select]:text-sm
          [&_select]:text-slate-950
          [&_select]:outline-none

          [&_button]:max-w-full
          [&_button]:rounded-xl
        "
      >
        <BulkCreatorImportForm />
      </div>
    </div>

    {/* Global Discount */}
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 6 6 18"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            Global Discount
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Set the default discount applied to new subscriptions.
          </p>
        </div>
      </div>

      <div
        className="
          min-w-0
          [&_label]:mb-1.5
          [&_label]:block
          [&_label]:text-xs
          [&_label]:font-medium
          [&_label]:text-slate-700

          [&_input]:w-full
          [&_input]:min-w-0
          [&_input]:rounded-xl
          [&_input]:border
          [&_input]:border-slate-300
          [&_input]:bg-white
          [&_input]:px-3
          [&_input]:py-2.5
          [&_input]:text-sm
          [&_input]:text-slate-950
          [&_input]:outline-none
          [&_input]:placeholder:text-slate-400
          [&_input]:focus:border-slate-500
          [&_input]:focus:ring-2
          [&_input]:focus:ring-slate-200

          [&_select]:w-full
          [&_select]:min-w-0
          [&_select]:rounded-xl
          [&_select]:border
          [&_select]:border-slate-300
          [&_select]:bg-white
          [&_select]:px-3
          [&_select]:py-2.5
          [&_select]:text-sm
          [&_select]:text-slate-950
          [&_select]:outline-none

          [&_button]:max-w-full
          [&_button]:rounded-xl
        "
      >
        <GlobalDiscountForm currentPercent={globalDiscountPercent} />
      </div>
    </div>
  </div>
</section>

        {/* =====================================================
            QUICK NAVIGATION
        ====================================================== */}

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Operations
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
              Admin areas
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminNavCard
              href="/admin/activity"
              title="Activity"
              description="Review platform activity and account events."
            />

            <AdminNavCard
              href="/admin/social-calendars"
              title="Content Workspaces"
              description="Manage client workspaces, billing and activity."
            />

            <AdminNavCard
              href="/admin/creativo"
              title="Creativo"
              description="Manage the creator community experience."
            />

            <AdminNavCard
              href="/admin/blog"
              title="Blog"
              description="Manage editorial and content publishing."
            />
          </div>
        </section>

        {/* =====================================================
            CUSTOMER DIRECTORY
        ====================================================== */}

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                Customer directory
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
                Accounts
              </h2>

              <p className="mt-1 text-xs text-[#98A2B3]">
                {filteredCreatorCount.toLocaleString()} matching{" "}
                {filteredCreatorCount === 1
                  ? "account"
                  : "accounts"}
              </p>
            </div>
          </div>

          {/* Search + filters */}

          <form
            method="GET"
            action="/admin"
            className="rounded-[24px] border border-[#E4E7EC] bg-white p-4 shadow-[0_8px_30px_rgba(16,24,40,0.035)] sm:p-5"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
              <div className="relative min-w-0">
                <label
                  htmlFor="admin-search"
                  className="sr-only"
                >
                  Search users
                </label>

                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />

                <input
                  id="admin-search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search name, email, company or phone..."
                  className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white pl-10 pr-3 text-sm text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                />
              </div>

              <select
                name="type"
                defaultValue={type}
                className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              >
                <option value="">All account types</option>
                <option value="CREATOR">Creator</option>
                <option value="AGENCY">Agency</option>
              </select>

              <select
                name="status"
                defaultValue={status}
                className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">
                  Deactivated
                </option>
                <option value="COMPEd">Comped</option>
              </select>

              <select
                name="product"
                defaultValue={product}
                className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              >
                <option value="">All products</option>
                <option value="DELIVERY">
                  Project Delivery
                </option>
                <option value="WORKSPACE">
                  Content Workspace
                </option>
                <option value="PORTFOLIO">
                  Portfolio
                </option>
              </select>

              <button
                type="submit"
                className="h-11 rounded-xl bg-[#2478FF] px-5 text-sm font-semibold text-white transition hover:bg-[#1768E8]"
              >
                Search
              </button>
            </div>

            {(q || type || status || product) && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F0F2F5] pt-3">
                <p className="text-xs text-[#667085]">
                  Filters are active.
                </p>

                <Link
                  href="/admin"
                  className="text-xs font-semibold text-[#2478FF] hover:underline"
                >
                  Clear filters
                </Link>
              </div>
            )}
          </form>

          {/* Results */}

          <div className="mt-4">
            {creators.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#D0D5DD] bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#667085]">
                  <SearchIcon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[#101828]">
                  No accounts found
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#667085]">
                  Try a different name, email, company, phone
                  number or filter.
                </p>

                {(q || type || status || product) && (
                  <Link
                    href="/admin"
                    className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[#101828] px-4 text-xs font-semibold text-white"
                  >
                    Clear search
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {creators.map((creator) => {
                  const deliveryStatus =
                    deliveryStatusLabel(creator);

                  const workspaceStatus =
                    workspaceStatusLabel(
                      creator.contentWorkspaceBillingStatus,
                      creator.contentWorkspacePlan,
                      creator.contentWorkspaceTrialEndsAt
                    );

                  const workspaceBadge =
                    statusBadgeStyle(
                      creator.contentWorkspaceBillingStatus
                    );

                  const portfolioActiveCount =
                    creator.portfolios.filter(
                      (portfolio) =>
                        portfolio.billingStatus === "ACTIVE"
                    ).length;

                  const revenue =
                    paymentTotalByCreator.get(creator.id) ?? 0;

                  return (
                    <article
                      key={creator.id}
                      className="overflow-hidden rounded-[24px] border border-[#E4E7EC] bg-white shadow-[0_5px_24px_rgba(16,24,40,0.035)]"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          {/* Identity */}

                          <div className="flex min-w-0 items-start gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF4FF] text-sm font-bold text-[#2478FF]">
                              {creator.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={creator.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials(
                                  creator.name,
                                  creator.email
                                )
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <Link
                                  href={`/admin/creators/${creator.id}`}
                                  className="max-w-full truncate text-sm font-semibold text-[#101828] hover:text-[#2478FF]"
                                >
                                  {creator.name ||
                                    creator.email}
                                </Link>

                                <span className="rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-0.5 text-[9px] font-semibold text-[#667085]">
                                  {accountTypeLabel(
                                    creator.accountType
                                  )}
                                </span>

                                {creator.isDeactivated && (
                                  <span className="rounded-full border border-[#FECDCA] bg-[#FEF3F2] px-2 py-0.5 text-[9px] font-semibold text-[#B42318]">
                                    Deactivated
                                  </span>
                                )}

                                {creator.isComped && (
                                  <span className="rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 py-0.5 text-[9px] font-semibold text-[#067647]">
                                    Comped
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 max-w-full truncate text-xs text-[#667085]">
                                {creator.email}
                              </p>

                              {creator.companyName && (
                                <p className="mt-0.5 max-w-full truncate text-[11px] text-[#98A2B3]">
                                  {creator.companyName}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#98A2B3]">
                                <span>
                                  Joined{" "}
                                  {formatDate(
                                    creator.createdAt
                                  )}
                                </span>

                                <span className="hidden text-[#D0D5DD] sm:inline">
                                  •
                                </span>

                                <span>
                                  Last login{" "}
                                  {formatDate(
                                    creator.lastLoginAt
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Product statuses */}

                          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[470px]">
                            <ProductStatus
                              label="Project Delivery"
                              value={deliveryPlanLabel(
                                creator
                              )}
                              detail={
                                creator.subscriptionCycle
                                  ? creator.subscriptionCycle
                                  : deliveryStatus
                              }
                              tone={
                                creator.subscriptionActive ||
                                creator.isComped
                                  ? "blue"
                                  : "neutral"
                              }
                            />

                            <ProductStatus
                              label="Content Workspace"
                              value={workspaceStatus}
                              detail={
                                creator.contentWorkspaceBillingCycle ??
                                "No subscription"
                              }
                              tone={
                                creator.contentWorkspaceBillingStatus ===
                                "ACTIVE"
                                  ? "green"
                                  : creator.contentWorkspaceBillingStatus ===
                                    "TRIAL"
                                  ? "blue"
                                  : creator.contentWorkspaceBillingStatus ===
                                    "OFFLINE"
                                  ? "red"
                                  : "neutral"
                              }
                            />
                          </div>
                        </div>

                        {/* Account data */}

                        <div className="mt-5 grid gap-2 border-t border-[#F0F2F5] pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                          <DataPoint
                            label="Delivery projects"
                            value={creator._count.projects}
                          />

                          <DataPoint
                            label="Managed projects"
                            value={
                              creator._count.managedProjects
                            }
                          />

                          <DataPoint
                            label="Portfolios"
                            value={
                              creator._count.portfolios
                            }
                            detail={
                              portfolioActiveCount > 0
                                ? `${portfolioActiveCount} live`
                                : undefined
                            }
                          />

                          <DataPoint
                            label="Workspaces"
                            value={
                              creator._count.ownedCalendars
                            }
                          />

                          <DataPoint
                            label="Payments"
                            value={
                              creator._count.paymentRecords
                            }
                          />

                          <DataPoint
                            label="Revenue"
                            value={formatNgn(revenue)}
                          />

                          <DataPoint
                            label="Discount"
                            value={
                              creator.discountPercent > 0
                                ? `${creator.discountPercent}%`
                                : "None"
                            }
                          />

                          <DataPoint
                            label="Email"
                            value={
                              creator.emailVerified
                                ? "Verified"
                                : "Unverified"
                            }
                          />
                        </div>

                        {/* Workspace usage */}

                        {creator.contentWorkspacePlan && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <UsagePill
                              label="Storage"
                              value={
                                creator.contentWorkspaceUsage
                                  ? `${(
                                      Number(
                                        creator
                                          .contentWorkspaceUsage
                                          .storageBytes
                                      ) /
                                      1_000_000_000
                                    ).toFixed(2)} GB used`
                                  : "No usage"
                              }
                            />

                            <UsagePill
                              label="AI generations"
                              value={
                                creator.contentWorkspaceUsage
                                  ? `${creator.contentWorkspaceUsage.aiGenerationsUsed} used`
                                  : "0 used"
                              }
                            />

                            <UsagePill
                              label="AI regenerations"
                              value={
                                creator.contentWorkspaceUsage
                                  ? `${creator.contentWorkspaceUsage.aiRegenerationsUsed} used`
                                  : "0 used"
                              }
                            />
                          </div>
                        )}

                        {/* Actions */}

                        <div className="mt-4 flex flex-col gap-2 border-t border-[#F0F2F5] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                          <Link
                            href={`/admin/creators/${creator.id}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#101828] px-4 text-xs font-semibold text-white transition hover:bg-[#1D2939]"
                          >
                            Open account
                          </Link>

                          {creator.phone && (
                            <a
                              href={whatsappLinkFor(
                                creator.phone
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 text-xs font-semibold text-[#067647] transition hover:bg-[#D1FADF]"
                            >
                              <WhatsAppIcon />
                              WhatsApp
                            </a>
                          )}

                          <div className="sm:ml-auto">
                            <CreatorRowActions
                              creatorId={creator.id}
                              isComped={creator.isComped}
                              discountPercent={
                                creator.discountPercent
                              }
                              freeTierLimitOverride={
                                creator.freeTierLimitOverride
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}

          {totalCreatorPages > 1 && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E4E7EC] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#667085]">
                Showing{" "}
                <span className="font-semibold text-[#344054]">
                  {firstVisibleResult}
                </span>{" "}
               –{" "}
                <span className="font-semibold text-[#344054]">
                  {lastVisibleResult}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[#344054]">
                  {filteredCreatorCount}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={buildQuery(params, {
                    page: String(currentPage - 1),
                  })}
                  aria-disabled={currentPage <= 1}
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold ${
                    currentPage <= 1
                      ? "pointer-events-none border-[#EAECF0] bg-[#F9FAFB] text-[#D0D5DD]"
                      : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Previous
                </Link>

                <span className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#101828] px-4 text-xs font-semibold text-white">
                  {currentPage} / {totalCreatorPages}
                </span>

                <Link
                  href={buildQuery(params, {
                    page: String(currentPage + 1),
                  })}
                  aria-disabled={
                    currentPage >= totalCreatorPages
                  }
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold ${
                    currentPage >= totalCreatorPages
                      ? "pointer-events-none border-[#EAECF0] bg-[#F9FAFB] text-[#D0D5DD]"
                      : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3]">
            {label}
          </p>

          <p className="mt-2 truncate text-[25px] font-semibold tracking-[-0.035em] text-[#101828]">
            {value}
          </p>

          <p className="mt-1 truncate text-[10px] text-[#98A2B3]">
            {detail}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2478FF]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-1.5 text-lg font-semibold tracking-[-0.025em] text-[#344054]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function RevenueStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-1.5 truncate text-lg font-semibold tracking-[-0.025em] text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.min(100, Math.round((value / total) * 100))
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-white/55">
          {label}
        </span>

        <span className="text-xs font-semibold text-white">
          {value.toLocaleString()}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-[#2478FF]"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function AdminToolCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.035)] sm:p-6">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
        {eyebrow}
      </p>

      <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-[#101828]">
        {title}
      </h3>

      <p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#667085]">
        {description}
      </p>

      <div className="mt-5 min-w-0">{children}</div>
    </div>
  );
}

function AdminNavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-semibold text-[#101828]">
          {title}
        </h3>

        <span className="text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#2478FF]">
          ↗
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </Link>
  );
}

function ProductStatus({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "red" | "neutral";
}) {
  const styles = {
    blue: {
      background: "#EEF4FF",
      border: "#D9E6FF",
      dot: "#2478FF",
    },
    green: {
      background: "#ECFDF3",
      border: "#D1FADF",
      dot: "#12B76A",
    },
    red: {
      background: "#FEF3F2",
      border: "#FECDCA",
      dot: "#F04438",
    },
    neutral: {
      background: "#F9FAFB",
      border: "#EAECF0",
      dot: "#98A2B3",
    },
  }[tone];

  return (
    <div
      className="min-w-0 rounded-2xl border px-3.5 py-3"
      style={{
        background: styles.background,
        borderColor: styles.border,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: styles.dot,
          }}
        />

        <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#667085]">
          {label}
        </p>
      </div>

      <p className="mt-1 truncate text-xs font-semibold text-[#344054]">
        {value}
      </p>

      <p className="mt-0.5 truncate text-[10px] text-[#98A2B3]">
        {detail}
      </p>
    </div>
  );
}

function DataPoint({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[#F9FAFB] px-3 py-2.5">
      <p className="truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-[#344054]">
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </p>

      {detail && (
        <p className="mt-0.5 truncate text-[9px] text-[#98A2B3]">
          {detail}
        </p>
      )}
    </div>
  );
}

function UsagePill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5">
      <span className="truncate text-[10px] font-medium text-[#667085]">
        {label}
      </span>

      <span className="truncate text-[10px] font-semibold text-[#344054]">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   ICONS
============================================================ */

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="9" cy="7" r="4" />

      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
      />

      <path
        d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        strokeLinecap="round"
      />

      <path
        d="M3 12h18"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path
        d="M3 9h18M8 4v5M16 4v5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M3 20V10M9 20V4M15 20v-7M21 20V7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />

      <path
        d="m20 20-4-4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17 3.03 14.53 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.25 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}