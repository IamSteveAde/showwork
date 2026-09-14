import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

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
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
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

function buildQuery(
  params: {
    q?: string;
    type?: string;
    status?: string;
    product?: string;
    page?: string;
  },
  overrides: Partial<{
    q: string;
    type: string;
    status: string;
    product: string;
    page: string;
  }> = {}
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

  const requestedPage = Number.parseInt(
    params.page ?? "1",
    10
  );

  const safeRequestedPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  /*
   * IMPORTANT
   *
   * Do NOT use Promise.all() here.
   *
   * The production database has a very small connection pool.
   * Keeping these operations sequential prevents the admin page
   * from opening multiple Prisma connections at the same time.
   */

  // ------------------------------------------------------------
  // BASIC PLATFORM COUNTS
  // ------------------------------------------------------------

  const totalCreators = await db.creator.count();

  const totalProjects = await db.project.count();

  const totalPortfolios = await db.portfolio.count();

  const totalWorkspaces = await db.socialCalendar.count();

  const totalMedia = await db.media.count();

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
  // CREATOR SEARCH
  // ------------------------------------------------------------

  const creatorConditions: Prisma.CreatorWhereInput[] = [];

  if (q) {
    creatorConditions.push({
      OR: [
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
      ],
    });
  }

  if (type === "CREATOR") {
    creatorConditions.push({
      accountType: "CREATOR",
    });
  }

  if (type === "AGENCY") {
    creatorConditions.push({
      accountType: "AGENCY",
    });
  }

  if (type === "SOCIAL_MEDIA_MANAGER") {
    creatorConditions.push({
      accountType: "SOCIAL_MEDIA_MANAGER",
    });
  }

  if (status === "ACTIVE") {
    creatorConditions.push({
      isDeactivated: false,
    });
  }

  if (status === "DEACTIVATED") {
    creatorConditions.push({
      isDeactivated: true,
    });
  }

  if (status === "COMPED") {
    creatorConditions.push({
      isComped: true,
    });
  }

  if (product === "DELIVERY") {
    creatorConditions.push({
      OR: [
        {
          subscriptionActive: true,
        },
        {
          isComped: true,
        },
      ],
    });
  }

  /*
   * Portfolio and Content Workspace filtering are intentionally
   * handled using lightweight relation existence checks.
   *
   * We do not load the relations here.
   */

  if (product === "PORTFOLIO") {
    creatorConditions.push({
      portfolios: {
        some: {},
      },
    });
  }

  if (product === "WORKSPACE") {
    creatorConditions.push({
      ownedCalendars: {
        some: {},
      },
    });
  }

  const creatorWhere: Prisma.CreatorWhereInput =
    creatorConditions.length > 0
      ? {
          AND: creatorConditions,
        }
      : {};

  // ------------------------------------------------------------
  // CREATOR COUNT
  // ------------------------------------------------------------

  const filteredCreatorCount =
    await db.creator.count({
      where: creatorWhere,
    });

  const totalCreatorPages = Math.max(
    1,
    Math.ceil(
      filteredCreatorCount / PAGE_SIZE
    )
  );

  const currentPage = Math.min(
    safeRequestedPage,
    totalCreatorPages
  );

  // ------------------------------------------------------------
  // CREATOR LIST
  // ------------------------------------------------------------

  /*
   * Deliberately keep this select small.
   *
   * We do not load portfolios, payments, workspace usage,
   * calendar billing fields, projects or other nested relations.
   *
   * This keeps the RSC payload and Prisma query substantially
   * smaller than the previous implementation.
   */

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
      subscriptionTier: true,
      subscriptionActive: true,
      subscriptionCycle: true,
      isComped: true,
      discountPercent: true,
      freeTierLimitOverride: true,

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
  // CURRENT PAGE REVENUE
  // ------------------------------------------------------------

  const creatorIds = creators.map(
    (creator) => creator.id
  );

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

  const paymentTotalByCreator =
    new Map<string, number>();

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

  const averageRevenuePerCreator =
    totalCreators > 0
      ? Math.round(
          allTimeRevenueValue / totalCreators
        )
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
                <p className="truncate text-sm font-bold tracking-[-0.02em]">
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

                <span className="sm:hidden">
                  Export
                </span>
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
                Monitor customers, subscriptions,
                workspaces, delivery activity,
                portfolios and revenue from one place.
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
            label="Content workspaces"
            value={totalWorkspaces.toLocaleString()}
            detail="Client workspaces"
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

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SmallMetric
            label="Portfolios"
            value={totalPortfolios}
          />

          <SmallMetric
            label="Delivery projects"
            value={totalProjects}
          />

          <SmallMetric
            label="Content workspaces"
            value={totalWorkspaces}
          />

          <SmallMetric
            label="Files"
            value={totalMedia}
          />

          <SmallMetric
            label="Comped accounts"
            value={compedAccounts}
          />
        </section>

        {/* =====================================================
            REVENUE
        ====================================================== */}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                Financial performance
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                Revenue performance
              </h2>
            </div>

            <p className="text-xs text-[#98A2B3]">
              Recorded payment transactions
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
              value={formatNgn(
                averageRevenuePerCreator
              )}
            />
          </div>
        </section>

        {/* =====================================================
            ADMIN TOOLS
        ====================================================== */}

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Administration
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              Admin tools
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#667085]">
              Manage creators and platform settings from one
              place.
            </p>
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-3">
            <AdminToolCard
              title="Add Creator"
              description="Create a creator account manually."
            >
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

                  [&_button]:max-w-full
                  [&_button]:rounded-xl
                "
              >
                <AddCreatorForm />
              </div>
            </AdminToolCard>

            <AdminToolCard
              title="Bulk Import"
              description="Add multiple creator accounts at once."
            >
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

                  [&_button]:max-w-full
                  [&_button]:rounded-xl
                "
              >
                <BulkCreatorImportForm />
              </div>
            </AdminToolCard>

            <AdminToolCard
              title="Global Discount"
              description="Set the default discount applied to new subscriptions."
            >
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

                  [&_button]:max-w-full
                  [&_button]:rounded-xl
                "
              >
                <GlobalDiscountForm
                  currentPercent={
                    globalDiscountPercent
                  }
                />
              </div>
            </AdminToolCard>
          </div>
        </section>

        {/* =====================================================
            ADMIN AREAS
        ====================================================== */}

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Operations
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
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
              description="Manage client workspaces and billing."
            />

            <AdminNavCard
              href="/admin/creativo"
              title="Creativo"
              description="Manage the creator community."
            />

            <AdminNavCard
              href="/admin/blog"
              title="Blog"
              description="Manage editorial content."
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

              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                Accounts
              </h2>

              <p className="mt-1 text-xs text-[#98A2B3]">
                {filteredCreatorCount.toLocaleString()}{" "}
                matching{" "}
                {filteredCreatorCount === 1
                  ? "account"
                  : "accounts"}
              </p>
            </div>
          </div>

          {/* SEARCH */}

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
                <option value="">
                  All account types
                </option>

                <option value="CREATOR">
                  Creator
                </option>

                <option value="AGENCY">
                  Agency
                </option>

                <option value="SOCIAL_MEDIA_MANAGER">
                  Social Media Manager
                </option>
              </select>

              <select
                name="status"
                defaultValue={status}
                className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              >
                <option value="">
                  All statuses
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="DEACTIVATED">
                  Deactivated
                </option>

                <option value="COMPED">
                  Comped
                </option>
              </select>

              <select
                name="product"
                defaultValue={product}
                className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              >
                <option value="">
                  All products
                </option>

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

            {(q ||
              type ||
              status ||
              product) && (
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

          {/* RESULTS */}

          <div className="mt-4">
            {creators.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#D0D5DD] bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#667085]">
                  <SearchIcon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-semibold">
                  No accounts found
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#667085]">
                  Try a different name, email, company,
                  phone number or filter.
                </p>

                {(q ||
                  type ||
                  status ||
                  product) && (
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
                    deliveryStatusLabel(
                      creator
                    );

                  const revenue =
                    paymentTotalByCreator.get(
                      creator.id
                    ) ?? 0;

                  return (
                    <article
                      key={creator.id}
                      className="overflow-hidden rounded-[24px] border border-[#E4E7EC] bg-white shadow-[0_5px_24px_rgba(16,24,40,0.035)]"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          {/* IDENTITY */}

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

                          {/* PRODUCTS */}

                          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[470px]">
                            <ProductStatus
                              label="Project Delivery"
                              value={deliveryPlanLabel(
                                creator
                              )}
                              detail={
                                creator.subscriptionCycle ??
                                deliveryStatus
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
                              value={
                                creator._count
                                  .ownedCalendars > 0
                                  ? "Active workspace"
                                  : "No workspace"
                              }
                              detail={`${creator._count.ownedCalendars.toLocaleString()} workspace${creator._count.ownedCalendars === 1 ? "" : "s"}`}
                              tone={
                                creator._count
                                  .ownedCalendars > 0
                                  ? "green"
                                  : "neutral"
                              }
                            />
                          </div>
                        </div>

                        {/* ACCOUNT DATA */}

                        <div className="mt-5 grid gap-2 border-t border-[#F0F2F5] pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                          <DataPoint
                            label="Projects"
                            value={
                              creator._count.projects
                            }
                          />

                          <DataPoint
                            label="Managed"
                            value={
                              creator._count
                                .managedProjects
                            }
                          />

                          <DataPoint
                            label="Portfolios"
                            value={
                              creator._count.portfolios
                            }
                          />

                          <DataPoint
                            label="Workspaces"
                            value={
                              creator._count
                                .ownedCalendars
                            }
                          />

                          <DataPoint
                            label="Payments"
                            value={
                              creator._count
                                .paymentRecords
                            }
                          />

                          <DataPoint
                            label="Revenue"
                            value={formatNgn(
                              revenue
                            )}
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

                        {/* ACTIONS */}

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
                              isComped={
                                creator.isComped
                              }
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

          {/* PAGINATION */}

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
                    page: String(
                      currentPage - 1
                    ),
                  })}
                  aria-disabled={
                    currentPage <= 1
                  }
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold ${
                    currentPage <= 1
                      ? "pointer-events-none border-[#EAECF0] bg-[#F9FAFB] text-[#D0D5DD]"
                      : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Previous
                </Link>

                <span className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#101828] px-4 text-xs font-semibold text-white">
                  {currentPage} /{" "}
                  {totalCreatorPages}
                </span>

                <Link
                  href={buildQuery(params, {
                    page: String(
                      currentPage + 1
                    ),
                  })}
                  aria-disabled={
                    currentPage >=
                    totalCreatorPages
                  }
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold ${
                    currentPage >=
                    totalCreatorPages
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
    <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.035)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.03em] text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function AdminToolCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.035)] sm:p-6">
      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#101828]">
        {title}
      </h3>

      <p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#667085]">
        {description}
      </p>

      <div className="mt-5 min-w-0">
        {children}
      </div>
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
      background: COLOR.blueSoft,
      border: "#D9E6FF",
      dot: COLOR.blue,
    },
    green: {
      background: COLOR.greenSoft,
      border: "#D1FADF",
      dot: COLOR.green,
    },
    red: {
      background: COLOR.redSoft,
      border: "#FECDCA",
      dot: COLOR.red,
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
}: {
  label: string;
  value: string | number;
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