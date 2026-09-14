import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import CalendarRowActions from "@/components/admin/social-calendars/CalendarRowActions";
import type { PaymentType } from "@prisma/client";

const PAGE_SIZE = 18;

const COLOR = {
  black: "#0A0A0A",
  charcoal: "#141414",
  charcoal2: "#1A1A1A",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.48)",
  faint: "rgba(255,255,255,0.28)",
  line: "rgba(255,255,255,0.08)",
  gold: "#F5C842",
  orange: "#E8881A",
  green: "#4ADE80",
  blue: "#60A5FA",
  red: "#F87171",
};

type SearchParams = {
  page?: string;
  q?: string;
  billing?: string;
  plan?: string;
  status?: string;
  account?: string;
  connection?: string;
};

function formatNgn(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(date: Date | null | undefined) {
  if (!date) return "Never";

  const diff = Date.now() - date.getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

function initials(name: string | null, email: string) {
  const value = name?.trim() || email;

  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function labelize(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusMeta(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        color: COLOR.green,
        bg: "rgba(74,222,128,0.12)",
      };

    case "TRIAL":
      return {
        label: "Trial",
        color: COLOR.blue,
        bg: "rgba(96,165,250,0.12)",
      };

    case "OFFLINE":
      return {
        label: "Offline",
        color: COLOR.red,
        bg: "rgba(248,113,113,0.12)",
      };

    case "PENDING_SETUP":
      return {
        label: "Not subscribed",
        color: COLOR.faint,
        bg: "rgba(255,255,255,0.06)",
      };

    default:
      return {
        label: labelize(status),
        color: COLOR.muted,
        bg: "rgba(255,255,255,0.06)",
      };
  }
}

function planMeta(plan: string | null | undefined) {
  switch (plan) {
    case "CREATOR":
      return {
        label: "Creator",
        color: COLOR.blue,
        bg: "rgba(96,165,250,0.12)",
      };

    case "STUDIO":
      return {
        label: "Studio",
        color: COLOR.gold,
        bg: "rgba(245,200,66,0.12)",
      };

    default:
      return {
        label: "Not selected",
        color: COLOR.faint,
        bg: "rgba(255,255,255,0.06)",
      };
  }
}

function workspacePlanStatusMeta(status: string) {
  switch (status) {
    case "PLAN_APPROVED":
      return {
        label: "Plan approved",
        color: COLOR.green,
        bg: "rgba(74,222,128,0.12)",
      };

    case "AWAITING_APPROVAL":
      return {
        label: "Awaiting approval",
        color: COLOR.gold,
        bg: "rgba(245,200,66,0.12)",
      };

    case "PLAN_NEEDS_CHANGES":
      return {
        label: "Needs changes",
        color: COLOR.orange,
        bg: "rgba(232,136,26,0.12)",
      };

    default:
      return {
        label: "Building",
        color: COLOR.faint,
        bg: "rgba(255,255,255,0.06)",
      };
  }
}

function connectionState(
  instagramAccountId: string | null,
  tikTokOpenId: string | null
) {
  if (instagramAccountId && tikTokOpenId) {
    return {
      label: "2 connected",
      color: COLOR.green,
      bg: "rgba(74,222,128,0.12)",
    };
  }

  if (instagramAccountId || tikTokOpenId) {
    return {
      label: "1 connected",
      color: COLOR.blue,
      bg: "rgba(96,165,250,0.12)",
    };
  }

  return {
    label: "Not connected",
    color: COLOR.faint,
    bg: "rgba(255,255,255,0.06)",
  };
}

function isTrialExpired(
  status: string,
  trialEndsAt: Date | null | undefined
) {
  return (
    status === "TRIAL" &&
    !!trialEndsAt &&
    trialEndsAt.getTime() <= Date.now()
  );
}

export default async function AdminSocialCalendarsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  if (!isAdminEmail(creator.email)) {
    notFound();
  }

  const params = await searchParams;

  const query = params.q?.trim() || "";
  const billingFilter = params.billing || "ALL";
  const planFilter = params.plan || "ALL";
  const statusFilter = params.status || "ALL";
  const accountFilter = params.account || "ALL";
  const connectionFilter = params.connection || "ALL";

  const requestedPage = Number.parseInt(params.page || "1", 10);
  const safeRequestedPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  /*
   * ------------------------------------------------------------
   * DATE WINDOWS
   * ------------------------------------------------------------
   */

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

  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  );

  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  );

  /*
   * ------------------------------------------------------------
   * ACCOUNT / WORKSPACE COUNTS
   *
   * Sequential intentionally.
   * Database connection_limit = 1.
   * ------------------------------------------------------------
   */

  const totalManagers = await db.creator.count({
    where: {
      accountType: "SOCIAL_MEDIA_MANAGER",
    },
  });

  const totalWorkspaces = await db.socialCalendar.count();

  const activeCalendarBillingAccounts =
    await db.creator.count({
      where: {
        calendarBillingStatus: "ACTIVE",
      },
    });

  const activeWorkspaceBillingAccounts =
    await db.creator.count({
      where: {
        contentWorkspaceBillingStatus: "ACTIVE",
      },
    });

  const trialAccounts = await db.creator.count({
    where: {
      OR: [
        {
          calendarBillingStatus: "TRIAL",
        },
        {
          contentWorkspaceBillingStatus: "TRIAL",
        },
      ],
    },
  });

  const offlineAccounts = await db.creator.count({
    where: {
      OR: [
        {
          calendarBillingStatus: "OFFLINE",
        },
        {
          contentWorkspaceBillingStatus: "OFFLINE",
        },
      ],
    },
  });

  const totalPosts = await db.calendarPost.count();

  const totalCollaborators =
    await db.calendarCollaborator.count();

  const totalInvites = await db.calendarInvite.count();

  const totalClientViews =
    await db.calendarViewerEmail.count();

  const totalBusinessDocuments =
    await db.calendarBusinessDocument.count();

  /*
   * ------------------------------------------------------------
   * RECENT ACTIVITY COUNTS
   * ------------------------------------------------------------
   */

  const workspacesCreatedLast7Days =
    await db.socialCalendar.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

  const postsCreatedLast7Days =
    await db.calendarPost.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

  const clientViewsLast7Days =
    await db.calendarViewerEmail.count({
      where: {
        viewedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

  const documentsLast30Days =
    await db.calendarBusinessDocument.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

  /*
   * ------------------------------------------------------------
   * REVENUE
   *
   * Both names are retained because the schema contains historical
   * CALENDAR_* records as well as CONTENT_WORKSPACE_* records.
   * ------------------------------------------------------------
   */

  const workspaceRevenueTypes: PaymentType[] = [
    "CALENDAR_SUBSCRIPTION_INITIAL",
    "CALENDAR_SUBSCRIPTION_RENEWAL",
    "CONTENT_WORKSPACE_SUBSCRIPTION_INITIAL",
    "CONTENT_WORKSPACE_SUBSCRIPTION_RENEWAL",
  ];

  const workspaceRevenueFilter = {
    type: {
      in: workspaceRevenueTypes,
    },
  };

  const allTimeRevenue =
    await db.paymentRecord.aggregate({
      _sum: {
        amountNgn: true,
      },
      where: workspaceRevenueFilter,
    });

  const monthRevenue =
    await db.paymentRecord.aggregate({
      _sum: {
        amountNgn: true,
      },
      where: {
        ...workspaceRevenueFilter,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

  const yearRevenue =
    await db.paymentRecord.aggregate({
      _sum: {
        amountNgn: true,
      },
      where: {
        ...workspaceRevenueFilter,
        createdAt: {
          gte: startOfYear,
        },
      },
    });

  /*
   * ------------------------------------------------------------
   * MANAGERS
   * ------------------------------------------------------------
   */

  const managers = await db.creator.findMany({
    where: {
      accountType: "SOCIAL_MEDIA_MANAGER",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,

      calendarAccountType: true,
      calendarBillingStatus: true,
     
      calendarTrialEndsAt: true,
      calendarSubscriptionRenewsAt: true,

      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      
      contentWorkspaceTrialEndsAt: true,
      contentWorkspaceSubscriptionRenewsAt: true,

      aiAssistantBillingStatus: true,
      aiAssistantTrialEndsAt: true,
      aiAssistantSubscriptionRenewsAt: true,

      _count: {
        select: {
          ownedCalendars: true,
          calendarCollaborations: true,
          calendarInvitesSent: true,
        },
      },
    },
  });

  /*
   * ------------------------------------------------------------
   * FILTERABLE WORKSPACE WHERE
   * ------------------------------------------------------------
   */

  const workspaceAndFilters: Array<Record<string, unknown>> = [];

  if (query) {
    workspaceAndFilters.push({
      OR: [
        {
          clientName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          manager: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          manager: {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          manager: {
            companyName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (planFilter !== "ALL") {
    workspaceAndFilters.push({
      manager: {
        contentWorkspacePlan: planFilter,
      },
    });
  }

  if (accountFilter !== "ALL") {
    workspaceAndFilters.push({
      manager: {
        calendarAccountType: accountFilter,
      },
    });
  }

  if (statusFilter !== "ALL") {
    if (statusFilter === "ACTIVE") {
      workspaceAndFilters.push({
        manager: {
          OR: [
            {
              contentWorkspaceBillingStatus: "ACTIVE",
            },
            {
              calendarBillingStatus: "ACTIVE",
            },
          ],
        },
      });
    } else if (statusFilter === "TRIAL") {
      workspaceAndFilters.push({
        manager: {
          OR: [
            {
              contentWorkspaceBillingStatus: "TRIAL",
            },
            {
              calendarBillingStatus: "TRIAL",
            },
          ],
        },
      });
    } else if (statusFilter === "OFFLINE") {
      workspaceAndFilters.push({
        manager: {
          OR: [
            {
              contentWorkspaceBillingStatus: "OFFLINE",
            },
            {
              calendarBillingStatus: "OFFLINE",
            },
          ],
        },
      });
    } else if (statusFilter === "PENDING_SETUP") {
      workspaceAndFilters.push({
        manager: {
          OR: [
            {
              contentWorkspaceBillingStatus:
                "PENDING_SETUP",
            },
            {
              calendarBillingStatus: "PENDING_SETUP",
            },
          ],
        },
      });
    }
  }

  if (billingFilter === "PAID") {
    workspaceAndFilters.push({
      manager: {
        OR: [
          {
            contentWorkspaceBillingStatus: "ACTIVE",
          },
          {
            calendarBillingStatus: "ACTIVE",
          },
        ],
      },
    });
  }

  if (billingFilter === "TRIAL") {
    workspaceAndFilters.push({
      manager: {
        OR: [
          {
            contentWorkspaceBillingStatus: "TRIAL",
          },
          {
            calendarBillingStatus: "TRIAL",
          },
        ],
      },
    });
  }

  if (billingFilter === "OFFLINE") {
    workspaceAndFilters.push({
      manager: {
        OR: [
          {
            contentWorkspaceBillingStatus: "OFFLINE",
          },
          {
            calendarBillingStatus: "OFFLINE",
          },
        ],
      },
    });
  }

  if (connectionFilter === "INSTAGRAM") {
    workspaceAndFilters.push({
      instagramAccountId: {
        not: null,
      },
    });
  }

  if (connectionFilter === "TIKTOK") {
    workspaceAndFilters.push({
      tikTokOpenId: {
        not: null,
      },
    });
  }

  if (connectionFilter === "CONNECTED") {
    workspaceAndFilters.push({
      OR: [
        {
          instagramAccountId: {
            not: null,
          },
        },
        {
          tikTokOpenId: {
            not: null,
          },
        },
      ],
    });
  }

  if (connectionFilter === "NONE") {
    workspaceAndFilters.push({
      AND: [
        {
          instagramAccountId: null,
        },
        {
          tikTokOpenId: null,
        },
      ],
    });
  }

  const workspaceWhere =
    workspaceAndFilters.length > 0
      ? {
          AND: workspaceAndFilters,
        }
      : {};

  /*
   * ------------------------------------------------------------
   * WORKSPACE TOTAL FOR PAGINATION
   * ------------------------------------------------------------
   */

  const filteredWorkspaceCount =
    await db.socialCalendar.count({
      where: workspaceWhere,
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredWorkspaceCount / PAGE_SIZE)
  );

  const currentPage = Math.min(
    safeRequestedPage,
    totalPages
  );

  /*
   * ------------------------------------------------------------
   * WORKSPACES
   * ------------------------------------------------------------
   */

  const calendars = await db.socialCalendar.findMany({
    where: workspaceWhere,
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      clientName: true,
      logoUrl: true,

      planStatus: true,
      planSubmittedAt: true,
      planApprovedAt: true,
      planApprovalNote: true,

      headerTitle: true,

      aiBusinessSummaryUpdatedAt: true,
      aiLastResearchedAt: true,

      createdAt: true,
      updatedAt: true,

      instagramAccountId: true,
      instagramUsername: true,
      instagramConnectedAt: true,
      instagramTokenExpiresAt: true,

      tikTokOpenId: true,
      tikTokUsername: true,
      tikTokConnectedAt: true,
      tikTokAccessTokenExpiresAt: true,

      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          avatarUrl: true,

          calendarAccountType: true,
          calendarBillingStatus: true,
          
          calendarTrialEndsAt: true,
          calendarSubscriptionRenewsAt: true,

          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          
          contentWorkspaceTrialEndsAt: true,
          contentWorkspaceSubscriptionRenewsAt: true,

          aiAssistantBillingStatus: true,
          aiAssistantTrialEndsAt: true,
          aiAssistantSubscriptionRenewsAt: true,
        },
      },

      _count: {
        select: {
          posts: true,
          collaborators: true,
          invites: true,
          viewerEmails: true,
          businessDocuments: true,
        },
      },
    },
  });

  /*
   * ------------------------------------------------------------
   * MANAGER ROLLUPS
   * ------------------------------------------------------------
   */

  const managerIds = managers.map((manager) => manager.id);

  const managerPaymentRows =
    managerIds.length > 0
      ? await db.paymentRecord.findMany({
          where: {
            creatorId: {
              in: managerIds,
            },
            type: {
              in: workspaceRevenueTypes,
            },
          },
          select: {
            creatorId: true,
            amountNgn: true,
            createdAt: true,
          },
        })
      : [];

  const managerRevenue = new Map<
    string,
    {
      total: number;
      month: number;
    }
  >();

  for (const payment of managerPaymentRows) {
    const existing = managerRevenue.get(
      payment.creatorId
    ) ?? {
      total: 0,
      month: 0,
    };

    existing.total += payment.amountNgn;

    if (payment.createdAt >= startOfMonth) {
      existing.month += payment.amountNgn;
    }

    managerRevenue.set(payment.creatorId, existing);
  }

  /*
   * ------------------------------------------------------------
   * MANAGER TABLE SEARCH
   * ------------------------------------------------------------
   */

  const managerSearch = query.toLowerCase();

  const visibleManagers = managers.filter((manager) => {
    if (!managerSearch) return true;

    return [
      manager.name,
      manager.email,
      manager.companyName,
      manager.calendarAccountType,
      manager.contentWorkspacePlan,
      manager.calendarBillingStatus,
      manager.contentWorkspaceBillingStatus,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value)
          .toLowerCase()
          .includes(managerSearch)
      );
  });

  /*
   * ------------------------------------------------------------
   * PAGE URL HELPER
   * ------------------------------------------------------------
   */

  function pageHref(nextPage: number) {
    const search = new URLSearchParams();

    if (query) search.set("q", query);
    if (billingFilter !== "ALL") {
      search.set("billing", billingFilter);
    }
    if (planFilter !== "ALL") {
      search.set("plan", planFilter);
    }
    if (statusFilter !== "ALL") {
      search.set("status", statusFilter);
    }
    if (accountFilter !== "ALL") {
      search.set("account", accountFilter);
    }
    if (connectionFilter !== "ALL") {
      search.set("connection", connectionFilter);
    }

    search.set("page", String(nextPage));

    return `/admin/social-calendars?${search.toString()}`;
  }

  const activeFilterCount = [
    billingFilter !== "ALL",
    planFilter !== "ALL",
    statusFilter !== "ALL",
    accountFilter !== "ALL",
    connectionFilter !== "ALL",
  ].filter(Boolean).length;

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: COLOR.black,
        color: COLOR.white,
      }}
    >
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* -------------------------------------------------- */}
        {/* HEADER */}
        {/* -------------------------------------------------- */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: COLOR.gold,
                  }}
                />

                <p
                  className="text-[11px] font-bold uppercase"
                  style={{
                    color: COLOR.gold,
                    letterSpacing: "0.16em",
                  }}
                >
                  Admin / Content Workspace
                </p>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Calendar operations
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{
                  color: COLOR.muted,
                }}
              >
                Manage social media managers, client workspaces,
                subscriptions, publishing connections, content,
                collaboration and client activity from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5"
                style={{
                  borderColor: COLOR.line,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                ← Platform overview
              </Link>

              <Link
                href="/dashboard/calendars"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  background: COLOR.gold,
                  color: COLOR.black,
                }}
              >
                Open workspace manager
              </Link>
            </div>
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* TOP METRICS */}
        {/* -------------------------------------------------- */}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Managers",
              value: totalManagers,
              detail: `${workspacesCreatedLast7Days} workspaces this week`,
            },
            {
              label: "Client workspaces",
              value: totalWorkspaces,
              detail: `${postsCreatedLast7Days} posts created this week`,
            },
            {
              label: "Active billing",
              value:
                Math.max(
                  activeCalendarBillingAccounts,
                  activeWorkspaceBillingAccounts
                ),
              detail: `${trialAccounts} account${trialAccounts === 1 ? "" : "s"} on trial`,
            },
            {
              label: "Client engagement",
              value: totalClientViews,
              detail: `${clientViewsLast7Days} views this week`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4 sm:p-5"
              style={{
                background: COLOR.charcoal,
                borderColor: COLOR.line,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase"
                style={{
                  color: COLOR.faint,
                  letterSpacing: "0.12em",
                }}
              >
                {stat.label}
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {stat.value.toLocaleString()}
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color: COLOR.muted,
                }}
              >
                {stat.detail}
              </p>
            </div>
          ))}
        </section>

        {/* -------------------------------------------------- */}
        {/* OPERATIONAL HEALTH */}
        {/* -------------------------------------------------- */}

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{
              background: COLOR.charcoal,
              borderColor: COLOR.line,
            }}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color: COLOR.gold,
                    letterSpacing: "0.12em",
                  }}
                >
                  Operations
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Workspace health
                </h2>
              </div>

              <span
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                style={{
                  color:
                    offlineAccounts > 0
                      ? COLOR.red
                      : COLOR.green,
                  background:
                    offlineAccounts > 0
                      ? "rgba(248,113,113,0.10)"
                      : "rgba(74,222,128,0.10)",
                }}
              >
                {offlineAccounts > 0
                  ? `${offlineAccounts} offline`
                  : "No offline accounts"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HealthMetric
                label="Posts"
                value={totalPosts}
              />

              <HealthMetric
                label="Collaborators"
                value={totalCollaborators}
              />

              <HealthMetric
                label="Invites"
                value={totalInvites}
              />

              <HealthMetric
                label="Knowledge files"
                value={totalBusinessDocuments}
              />
            </div>

            <div
              className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3"
              style={{
                borderColor: COLOR.line,
              }}
            >
              <SmallMetric
                label="Documents / 30d"
                value={documentsLast30Days}
              />

              <SmallMetric
                label="Client views / 7d"
                value={clientViewsLast7Days}
              />

              <SmallMetric
                label="Workspaces / 7d"
                value={workspacesCreatedLast7Days}
              />
            </div>
          </div>

          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(245,200,66,0.10), rgba(255,255,255,0.025))",
              borderColor: "rgba(245,200,66,0.18)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase"
              style={{
                color: COLOR.gold,
                letterSpacing: "0.12em",
              }}
            >
              Revenue
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Content Workspace revenue
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <RevenueMetric
                label="Month"
                value={formatNgn(
                  monthRevenue._sum.amountNgn ?? 0
                )}
              />

              <RevenueMetric
                label="Year"
                value={formatNgn(
                  yearRevenue._sum.amountNgn ?? 0
                )}
              />

              <RevenueMetric
                label="All time"
                value={formatNgn(
                  allTimeRevenue._sum.amountNgn ?? 0
                )}
              />
            </div>

            <p
              className="mt-4 text-xs leading-5"
              style={{
                color: COLOR.muted,
              }}
            >
              Includes both current Content Workspace subscription
              charges and historical calendar subscription records.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* SEARCH + FILTERS */}
        {/* -------------------------------------------------- */}

        <section
          className="mb-8 rounded-2xl border p-4 sm:p-5"
          style={{
            background: COLOR.charcoal,
            borderColor: COLOR.line,
          }}
        >
          <form
            method="GET"
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search manager, company, client workspace or slug..."
                  className="h-11 w-full rounded-xl border bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
                  style={{
                    borderColor: COLOR.line,
                  }}
                />
              </div>

              <button
                type="submit"
                className="h-11 rounded-xl px-5 text-sm font-semibold"
                style={{
                  background: COLOR.gold,
                  color: COLOR.black,
                }}
              >
                Search
              </button>

              {(query || activeFilterCount > 0) && (
                <Link
                  href="/admin/social-calendars"
                  className="flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
                  style={{
                    borderColor: COLOR.line,
                    color: COLOR.muted,
                  }}
                >
                  Clear
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <FilterSelect
                name="status"
                label="Billing status"
                value={statusFilter}
                options={[
                  ["ALL", "All statuses"],
                  ["ACTIVE", "Active"],
                  ["TRIAL", "Trial"],
                  ["OFFLINE", "Offline"],
                  ["PENDING_SETUP", "Not subscribed"],
                ]}
              />

              <FilterSelect
                name="plan"
                label="Workspace plan"
                value={planFilter}
                options={[
                  ["ALL", "All plans"],
                  ["CREATOR", "Creator"],
                  ["STUDIO", "Studio"],
                ]}
              />

              <FilterSelect
                name="account"
                label="Account type"
                value={accountFilter}
                options={[
                  ["ALL", "All accounts"],
                  ["INDIVIDUAL", "Individual"],
                  ["COMPANY", "Company"],
                ]}
              />

              <FilterSelect
                name="connection"
                label="Social connection"
                value={connectionFilter}
                options={[
                  ["ALL", "All connections"],
                  ["CONNECTED", "Any connected"],
                  ["INSTAGRAM", "Instagram"],
                  ["TIKTOK", "TikTok"],
                  ["NONE", "Not connected"],
                ]}
              />

              <FilterSelect
                name="billing"
                label="Billing"
                value={billingFilter}
                options={[
                  ["ALL", "All billing"],
                  ["PAID", "Paid"],
                  ["TRIAL", "Trial"],
                  ["OFFLINE", "Offline"],
                ]}
              />
            </div>

            <input
              type="hidden"
              name="page"
              value="1"
            />
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 && (
              <span
                className="rounded-full px-3 py-1 text-[10px] font-bold"
                style={{
                  background: "rgba(245,200,66,0.10)",
                  color: COLOR.gold,
                }}
              >
                {activeFilterCount} filter
                {activeFilterCount === 1 ? "" : "s"} active
              </span>
            )}

            <span
              className="text-xs"
              style={{
                color: COLOR.faint,
              }}
            >
              {filteredWorkspaceCount.toLocaleString()} workspace
              {filteredWorkspaceCount === 1 ? "" : "s"} found
            </span>
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* WORKSPACE DIRECTORY */}
        {/* -------------------------------------------------- */}

        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-[10px] font-bold uppercase"
                style={{
                  color: COLOR.orange,
                  letterSpacing: "0.12em",
                }}
              >
                Client workspaces
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Workspace directory
              </h2>
            </div>

            <p
              className="text-xs"
              style={{
                color: COLOR.faint,
              }}
            >
              Page {currentPage} of {totalPages}
            </p>
          </div>

          {calendars.length === 0 ? (
            <div
              className="rounded-2xl border px-6 py-16 text-center"
              style={{
                background: COLOR.charcoal,
                borderColor: COLOR.line,
              }}
            >
              <div className="mx-auto max-w-md">
                <p className="text-lg font-semibold">
                  No workspaces found
                </p>

                <p
                  className="mt-2 text-sm leading-6"
                  style={{
                    color: COLOR.muted,
                  }}
                >
                  Try changing your search or filters. There are no
                  workspaces matching the current criteria.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {calendars.map((calendar) => {
                const plan = planMeta(
                  calendar.manager.contentWorkspacePlan
                );

                const billingStatus =
                  calendar.manager
                    .contentWorkspaceBillingStatus !==
                    "PENDING_SETUP"
                    ? calendar.manager
                        .contentWorkspaceBillingStatus
                    : calendar.manager
                        .calendarBillingStatus;

                const billing = statusMeta(
                  billingStatus
                );

                const planStatus =
                  workspacePlanStatusMeta(
                    calendar.planStatus
                  );

                const connection = connectionState(
                  calendar.instagramAccountId,
                  calendar.tikTokOpenId
                );

                const trialEndsAt =
                  calendar.manager
                    .contentWorkspaceTrialEndsAt ??
                  calendar.manager.calendarTrialEndsAt;

                const renewalDate =
                  calendar.manager
                    .contentWorkspaceSubscriptionRenewsAt ??
                  calendar.manager
                    .calendarSubscriptionRenewsAt;

                const expired = isTrialExpired(
                  billingStatus,
                  trialEndsAt
                );

                return (
                  <article
                    key={calendar.id}
                    className="group overflow-hidden rounded-2xl border transition hover:border-white/15"
                    style={{
                      background: COLOR.charcoal,
                      borderColor: COLOR.line,
                    }}
                  >
                    {/* Card header */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-sm font-bold"
                          style={{
                            background:
                              "rgba(255,255,255,0.04)",
                            borderColor: COLOR.line,
                          }}
                        >
                          {calendar.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={calendar.logoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            calendar.clientName
                              .slice(0, 1)
                              .toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/calendars/${calendar.id}`}
                              className="min-w-0 truncate text-base font-semibold text-white transition hover:text-white/70"
                            >
                              {calendar.clientName}
                            </Link>

                            <span
                              className="rounded-full px-2 py-1 text-[9px] font-bold"
                              style={{
                                background: billing.bg,
                                color: billing.color,
                              }}
                            >
                              {expired
                                ? "Trial expired"
                                : billing.label}
                            </span>
                          </div>

                          <p
                            className="mt-1 truncate text-xs"
                            style={{
                              color: COLOR.faint,
                            }}
                          >
                            /{calendar.slug}
                          </p>

                          <Link
                            href={`/admin/creators/${calendar.manager.id}`}
                            className="mt-2 block truncate text-xs transition hover:text-white"
                            style={{
                              color: COLOR.muted,
                            }}
                          >
                            Managed by{" "}
                            <span className="text-white/70">
                              {calendar.manager.name ||
                                calendar.manager.email}
                            </span>
                          </Link>
                        </div>
                      </div>

                      {/* Status row */}
                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <InfoPill
                          label="Plan"
                          value={plan.label}
                          color={plan.color}
                          bg={plan.bg}
                        />

                        <InfoPill
                          label="Workflow"
                          value={planStatus.label}
                          color={planStatus.color}
                          bg={planStatus.bg}
                        />

                        <InfoPill
                          label="Account"
                          value={
                            calendar.manager
                              .calendarAccountType
                              ? labelize(
                                  calendar.manager
                                    .calendarAccountType
                                )
                              : "Not set"
                          }
                          color={COLOR.muted}
                          bg="rgba(255,255,255,0.05)"
                        />

                        <InfoPill
                          label="Social"
                          value={connection.label}
                          color={connection.color}
                          bg={connection.bg}
                        />
                      </div>

                      {/* Operational metrics */}
                      <div
                        className="mt-5 grid grid-cols-2 gap-y-4 border-y py-4 sm:grid-cols-4"
                        style={{
                          borderColor: COLOR.line,
                        }}
                      >
                        <DataPoint
                          label="Posts"
                          value={calendar._count.posts}
                        />

                        <DataPoint
                          label="Collaborators"
                          value={
                            calendar._count.collaborators
                          }
                        />

                        <DataPoint
                          label="Client views"
                          value={
                            calendar._count.viewerEmails
                          }
                        />

                        <DataPoint
                          label="Knowledge"
                          value={
                            calendar._count.businessDocuments
                          }
                        />
                      </div>

                      {/* Connections */}
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <ConnectionRow
                          platform="Instagram"
                          username={
                            calendar.instagramUsername
                          }
                          connected={
                            !!calendar.instagramAccountId
                          }
                          connectedAt={
                            calendar.instagramConnectedAt
                          }
                          expiresAt={
                            calendar.instagramTokenExpiresAt
                          }
                        />

                        <ConnectionRow
                          platform="TikTok"
                          username={
                            calendar.tikTokUsername
                          }
                          connected={
                            !!calendar.tikTokOpenId
                          }
                          connectedAt={
                            calendar.tikTokConnectedAt
                          }
                          expiresAt={
                            calendar.tikTokAccessTokenExpiresAt
                          }
                        />
                      </div>

                      {/* Dates */}
                      <div
                        className="mt-4 grid gap-3 text-xs sm:grid-cols-3"
                        style={{
                          color: COLOR.faint,
                        }}
                      >
                        <div>
                          <span className="block uppercase tracking-wider text-white/20">
                            Created
                          </span>

                          <span className="mt-1 block text-white/55">
                            {formatDate(
                              calendar.createdAt
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="block uppercase tracking-wider text-white/20">
                            Last updated
                          </span>

                          <span className="mt-1 block text-white/55">
                            {relativeTime(
                              calendar.updatedAt
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="block uppercase tracking-wider text-white/20">
                            {billingStatus ===
                            "TRIAL"
                              ? "Trial ends"
                              : "Renews"}
                          </span>

                          <span
                            className="mt-1 block"
                            style={{
                              color:
                                expired
                                  ? COLOR.red
                                  : "rgba(255,255,255,0.55)",
                            }}
                          >
                            {billingStatus ===
                            "TRIAL"
                              ? formatDate(
                                  trialEndsAt
                                )
                              : formatDate(
                                  renewalDate
                                )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card actions */}
                    <div
                      className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between"
                      style={{
                        borderColor: COLOR.line,
                        background:
                          "rgba(255,255,255,0.015)",
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/calendars/${calendar.id}`}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/5"
                          style={{
                            borderColor: COLOR.line,
                            color: "rgba(255,255,255,0.75)",
                          }}
                        >
                          Open workspace
                        </Link>

                        <Link
                          href={`/admin/creators/${calendar.manager.id}`}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/5"
                          style={{
                            borderColor: COLOR.line,
                            color: "rgba(255,255,255,0.55)",
                          }}
                        >
                          Manager
                        </Link>
                      </div>

                      <div className="shrink-0">
                        <CalendarRowActions
                          calendarId={calendar.id}
                          billingStatus={
                            calendar.manager
                              .contentWorkspaceBillingStatus
                          }
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <Link
                href={pageHref(
                  Math.max(1, currentPage - 1)
                )}
                aria-disabled={currentPage <= 1}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{
                  borderColor: COLOR.line,
                  color:
                    currentPage <= 1
                      ? COLOR.faint
                      : "rgba(255,255,255,0.75)",
                  pointerEvents:
                    currentPage <= 1
                      ? "none"
                      : undefined,
                }}
              >
                ← Previous
              </Link>

              <span
                className="text-xs"
                style={{
                  color: COLOR.faint,
                }}
              >
                {currentPage} / {totalPages}
              </span>

              <Link
                href={pageHref(
                  Math.min(
                    totalPages,
                    currentPage + 1
                  )
                )}
                aria-disabled={
                  currentPage >= totalPages
                }
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{
                  borderColor: COLOR.line,
                  color:
                    currentPage >= totalPages
                      ? COLOR.faint
                      : "rgba(255,255,255,0.75)",
                  pointerEvents:
                    currentPage >= totalPages
                      ? "none"
                      : undefined,
                }}
              >
                Next →
              </Link>
            </div>
          )}
        </section>

        {/* -------------------------------------------------- */}
        {/* MANAGER DIRECTORY */}
        {/* -------------------------------------------------- */}

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-[10px] font-bold uppercase"
                style={{
                  color: COLOR.orange,
                  letterSpacing: "0.12em",
                }}
              >
                Accounts
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Social media managers
              </h2>
            </div>

            <p
              className="text-xs"
              style={{
                color: COLOR.faint,
              }}
            >
              {visibleManagers.length.toLocaleString()} shown
            </p>
          </div>

          {visibleManagers.length === 0 ? (
            <div
              className="rounded-2xl border px-6 py-12 text-center"
              style={{
                background: COLOR.charcoal,
                borderColor: COLOR.line,
              }}
            >
              <p
                className="text-sm"
                style={{
                  color: COLOR.muted,
                }}
              >
                No social media manager accounts match your
                search.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleManagers.map((manager) => {
                const plan = planMeta(
                  manager.contentWorkspacePlan
                );

                const billingStatus =
                  manager.contentWorkspaceBillingStatus !==
                  "PENDING_SETUP"
                    ? manager.contentWorkspaceBillingStatus
                    : manager.calendarBillingStatus;

                const billing =
                  statusMeta(billingStatus);

                const revenue =
                  managerRevenue.get(manager.id) ?? {
                    total: 0,
                    month: 0,
                  };

                const trialEndsAt =
                  manager.contentWorkspaceTrialEndsAt ??
                  manager.calendarTrialEndsAt;

                const renewal =
                  manager.contentWorkspaceSubscriptionRenewsAt ??
                  manager.calendarSubscriptionRenewsAt;

                const aiStatus = statusMeta(
                  manager.aiAssistantBillingStatus
                );

                return (
                  <article
                    key={manager.id}
                    className="rounded-2xl border p-5"
                    style={{
                      background: COLOR.charcoal,
                      borderColor: COLOR.line,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background:
                            "rgba(245,200,66,0.10)",
                          color: COLOR.gold,
                        }}
                      >
                        {initials(
                          manager.name,
                          manager.email
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/creators/${manager.id}`}
                          className="block truncate text-sm font-semibold transition hover:text-white/70"
                        >
                          {manager.name ||
                            manager.email}
                        </Link>

                        <p
                          className="mt-1 truncate text-xs"
                          style={{
                            color: COLOR.faint,
                          }}
                        >
                          {manager.email}
                        </p>

                        {manager.companyName && (
                          <p
                            className="mt-1 truncate text-xs"
                            style={{
                              color: COLOR.muted,
                            }}
                          >
                            {manager.companyName}
                          </p>
                        )}
                      </div>

                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[9px] font-bold"
                        style={{
                          color: billing.color,
                          background: billing.bg,
                        }}
                      >
                        {billing.label}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <InfoPill
                        label="Workspace plan"
                        value={plan.label}
                        color={plan.color}
                        bg={plan.bg}
                      />

                      <InfoPill
                        label="Account"
                        value={
                          manager.calendarAccountType
                            ? labelize(
                                manager.calendarAccountType
                              )
                            : "Not set"
                        }
                        color={COLOR.muted}
                        bg="rgba(255,255,255,0.05)"
                      />
                    </div>

                    <div
                      className="mt-4 grid grid-cols-3 border-y py-4"
                      style={{
                        borderColor: COLOR.line,
                      }}
                    >
                      <DataPoint
                        label="Workspaces"
                        value={
                          manager._count.ownedCalendars
                        }
                      />

                      <DataPoint
                        label="Collabs"
                        value={
                          manager._count
                            .calendarCollaborations
                        }
                      />

                      <DataPoint
                        label="Invites"
                        value={
                          manager._count
                            .calendarInvitesSent
                        }
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <AccountRow
                        label="AI Studio"
                        value={aiStatus.label}
                        valueColor={aiStatus.color}
                      />

                      <AccountRow
                        label={
                          billingStatus === "TRIAL"
                            ? "Trial ends"
                            : "Renewal"
                        }
                        value={
                          billingStatus === "TRIAL"
                            ? formatDate(
                                trialEndsAt
                              )
                            : formatDate(renewal)
                        }
                      />

                      <AccountRow
                        label="Revenue"
                        value={formatNgn(
                          revenue.total
                        )}
                      />

                      <AccountRow
                        label="Last login"
                        value={
                          manager.lastLoginAt
                            ? relativeTime(
                                manager.lastLoginAt
                              )
                            : "Never"
                        }
                      />
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span
                        className="text-[10px]"
                        style={{
                          color: COLOR.faint,
                        }}
                      >
                        Joined{" "}
                        {formatDate(
                          manager.createdAt
                        )}
                      </span>

                      <Link
                        href={`/admin/creators/${manager.id}`}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        style={{
                          borderColor: COLOR.line,
                          color:
                            "rgba(255,255,255,0.72)",
                        }}
                      >
                        Manage account
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* -------------------------------------------------- */}
        {/* ADMIN NOTE */}
        {/* -------------------------------------------------- */}

        <section
          className="mt-8 rounded-2xl border p-5"
          style={{
            background: "rgba(255,255,255,0.025)",
            borderColor: COLOR.line,
          }}
        >
          <div className="flex gap-3">
            <div
              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                background: COLOR.gold,
              }}
            />

            <div>
              <p className="text-sm font-semibold">
                Account-level billing
              </p>

              <p
                className="mt-1 max-w-4xl text-xs leading-5"
                style={{
                  color: COLOR.muted,
                }}
              >
                Calendar and Content Workspace subscriptions are
                account-level. A manager can own multiple client
                workspaces under the same subscription. The dashboard
                therefore reports billing at manager level while
                showing operational information separately for each
                client workspace.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================ */
/* SMALL UI COMPONENTS                                          */
/* ============================================================ */

function HealthMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: COLOR.line,
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <p
        className="text-[9px] font-bold uppercase"
        style={{
          color: COLOR.faint,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value.toLocaleString()}
      </p>
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
    <div>
      <p
        className="text-[9px] font-bold uppercase"
        style={{
          color: COLOR.faint,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white/75">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function RevenueMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p
        className="text-[9px] font-bold uppercase"
        style={{
          color: COLOR.faint,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold sm:text-base">
        {value}
      </p>
    </div>
  );
}

function DataPoint({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <p
        className="truncate text-[9px] font-bold uppercase"
        style={{
          color: COLOR.faint,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white/75">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function InfoPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="min-w-0 rounded-lg px-3 py-2"
      style={{
        background: bg,
      }}
    >
      <p
        className="truncate text-[8px] font-bold uppercase"
        style={{
          color: "rgba(255,255,255,0.30)",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </p>

      <p
        className="mt-1 truncate text-[11px] font-semibold"
        style={{
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function AccountRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-xs"
        style={{
          color: COLOR.faint,
        }}
      >
        {label}
      </span>

      <span
        className="truncate text-right text-xs font-medium"
        style={{
          color:
            valueColor ||
            "rgba(255,255,255,0.68)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ConnectionRow({
  platform,
  username,
  connected,
  connectedAt,
  expiresAt,
}: {
  platform: string;
  username: string | null;
  connected: boolean;
  connectedAt: Date | null;
  expiresAt: Date | null;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
      style={{
        borderColor: COLOR.line,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-white/70">
          {platform}
        </p>

        <p
          className="mt-0.5 truncate text-[10px]"
          style={{
            color: COLOR.faint,
          }}
        >
          {connected
            ? username
              ? `@${username.replace(/^@/, "")}`
              : `Connected ${formatDate(
                  connectedAt
                )}`
            : "Not connected"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <span
          className="inline-flex rounded-full px-2 py-1 text-[8px] font-bold"
          style={{
            color: connected
              ? COLOR.green
              : COLOR.faint,
            background: connected
              ? "rgba(74,222,128,0.10)"
              : "rgba(255,255,255,0.05)",
          }}
        >
          {connected ? "Connected" : "Offline"}
        </span>

        {connected && expiresAt && (
          <p
            className="mt-1 text-[8px]"
            style={{
              color:
                expiresAt.getTime() <= Date.now()
                  ? COLOR.red
                  : COLOR.faint,
            }}
          >
            Token {formatDate(expiresAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="min-w-0">
      <span
        className="mb-1.5 block text-[9px] font-bold uppercase"
        style={{
          color: COLOR.faint,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>

      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-xl border bg-black/20 px-3 text-xs text-white outline-none"
        style={{
          borderColor: COLOR.line,
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
            style={{
              background: COLOR.black,
              color: COLOR.white,
            }}
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}