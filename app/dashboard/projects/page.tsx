import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import DashboardProjectList from "@/components/DashboardProjectList";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import {
  TIERS,
  PaidTier,
  Tier,
  PLAN_DISPLAY_NAME,
  NEXT_TIER,
} from "@/lib/subscriptionTiers";
import { isAdminEmail } from "@/lib/admin";

const COLOR = {
  black: "#0A0A0A",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  accent: "#FFCC00",
  warmWhite: "#F8F7F4",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

const PAGE_SIZE = 12;
const SHARED_DISPLAY_LIMIT = 12;

// ─────────────────────────────────────────────
// Small UI icons
// ─────────────────────────────────────────────

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArrowUpRight({ className }: { className?: string }) {
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
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  return (
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts[1]?.[0] ?? "").toUpperCase()
  );
}

export default async function ProjectDeliveryPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  // ─────────────────────────────────────────────
  // Project delivery data
  // ─────────────────────────────────────────────

  const ownedWhere = {
    creatorId: creator.id,
    deletedAt: null,
  };

  const totalCount = await db.project.count({
    where: ownedWhere,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const ownedProjects = await db.project.findMany({
    where: ownedWhere,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: {
      _count: {
        select: {
          media: true,
          viewerEmails: true,
        },
      },
    },
  });

  // ─────────────────────────────────────────────
  // Shared projects
  // ─────────────────────────────────────────────

  const collaboratorMemberships =
    await db.projectCollaborator.findMany({
      where: {
        creatorId: creator.id,
        project: {
          deletedAt: null,
        },
      },
      orderBy: {
        addedAt: "desc",
      },
      take: SHARED_DISPLAY_LIMIT + 1,
      include: {
        project: {
          include: {
            creator: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                media: true,
              },
            },
          },
        },
      },
    });

  const sharedProjects = collaboratorMemberships
    .slice(0, SHARED_DISPLAY_LIMIT)
    .map((c) => c.project);

  const hasMoreShared =
    collaboratorMemberships.length > SHARED_DISPLAY_LIMIT;

  // ─────────────────────────────────────────────
  // Managed projects
  // ─────────────────────────────────────────────

  const [
    ownedManagedProjects,
    collaboratingManagedProjects,
  ] = await Promise.all([
    db.managedProject.findMany({
      where: {
        creatorId: creator.id,
        deliveryProject: {
          deletedAt: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        deliveryProject: {
          select: {
            id: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
    }),

    db.managedProject.findMany({
      where: {
        collaborators: {
          some: {
            creatorId: creator.id,
          },
        },
        deliveryProject: {
          deletedAt: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        deliveryProject: {
          select: {
            id: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const managedProjects = [
    ...ownedManagedProjects.map((mp) => ({
      ...mp,
      role: "owner" as const,
      ownerLabel: null as string | null,
    })),

    ...collaboratingManagedProjects.map((mp) => ({
      ...mp,
      role: "collaborator" as const,
      ownerLabel: mp.creator.name || mp.creator.email,
    })),
  ].sort(
    (a, b) =>
      b.createdAt.getTime() -
      a.createdAt.getTime()
  );

  // ─────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────

  const allProjectsForStats =
    await db.project.findMany({
      where: {
        creatorId: creator.id,
        deletedAt: null,
      },
      select: {
        viewCount: true,
        _count: {
          select: {
            viewerEmails: true,
          },
        },
      },
    });

  const usage = await getCreatorUsage(creator);

  const totalViews = allProjectsForStats.reduce(
    (sum, p) => sum + p.viewCount,
    0
  );

  const totalEmails = allProjectsForStats.reduce(
    (sum, p) => sum + p._count.viewerEmails,
    0
  );

  const firstName = creator.name?.split(" ")[0];

  const planName = PLAN_DISPLAY_NAME[usage.tier];

  const nextTier = NEXT_TIER[usage.tier];

  const nextTierInfo = nextTier
    ? TIERS[nextTier]
    : null;

  const nearCap =
    usage.limit !== Infinity &&
    usage.remaining <=
      Math.max(
        1,
        Math.ceil(usage.limit * 0.2)
      );

  const atCap =
    usage.limit !== Infinity &&
    usage.remaining <= 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <main
      className="min-h-screen"
      style={{ background: COLOR.black }}
    >
      {/* ─────────────────────────────────────────
          TOP NAV
      ───────────────────────────────────────── */}

      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-6 md:px-20">
        <div className="flex items-center gap-5">
          {/* All apps */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />

            <span>All apps</span>
          </Link>

          <div className="hidden h-5 w-px bg-white/10 sm:block" />

          {/* Showwork logo */}
          <div
            role="img"
            aria-label="Showwork"
            className="hidden sm:block"
            style={{
              height: 22,
              width: 22 * 4,
              backgroundColor: COLOR.blue,
              WebkitMaskImage:
                "url(/images/logo/sw.svg)",
              maskImage:
                "url(/images/logo/sw.svg)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "left center",
              maskPosition: "left center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
        </div>

        <div className="flex items-center gap-4">
          {isAdminEmail(creator.email) && (
            <Link
              href="/admin"
              className="hidden text-xs font-semibold text-white/40 transition-colors hover:text-white sm:inline"
            >
              Admin
            </Link>
          )}

          <a
            href="mailto:hello@useshowwork.com?subject=Showwork%20support"
            className="hidden text-xs font-medium text-white/40 transition-colors hover:text-white sm:inline"
          >
            Support
          </a>

          <Link
            href="/dashboard/billing"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
            style={{
              background:
                "rgba(36,120,255,0.15)",
              color: COLOR.blue,
            }}
          >
            <span className="font-bold">
              {planName}
            </span>

            <span className="text-white/40">
              ·
            </span>

            {usage.limit === Infinity
              ? "Unlimited"
              : `${usage.used}/${usage.limit} this cycle`}
          </Link>

          <Link
            href="/dashboard/profile"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:flex"
            style={{
              background:
                "rgba(255,255,255,0.08)",
              color: "white",
            }}
          >
            View profile
            <span aria-hidden>
              →
            </span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="group flex items-center gap-3"
            aria-label="View profile"
          >
            <div
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-semibold transition-transform group-hover:scale-110 sm:h-8 sm:w-8"
              style={{
                background: creator.avatarUrl
                  ? undefined
                  : "rgba(36,120,255,0.18)",
                color: COLOR.blue,
                boxShadow:
                  "0 0 0 2px rgba(36,120,255,0.5)",
              }}
            >
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

            <span className="hidden text-sm font-medium text-white/80 transition-colors group-hover:text-white sm:inline">
              {creator.name || creator.email}
            </span>
          </Link>

          <LogoutButton />
        </div>
      </div>

      {/* ─────────────────────────────────────────
          HERO
      ───────────────────────────────────────── */}

      <section className="relative flex min-h-[650px] w-full items-end overflow-hidden md:min-h-[540px]">
        {/* Hero image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.42 }}
        />

        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.18) 38%, rgba(10,10,10,0.98) 100%)",
          }}
        />

        {/* Side vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(10,10,10,0.35) 0%, transparent 50%, rgba(10,10,10,0.2) 100%)",
          }}
        />

        <div className="relative z-10 w-full px-6 pb-14 md:px-20 md:pb-16">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              {/* Left */}
              <div className="max-w-3xl">
                <p
                  className="mb-4 text-xs font-semibold uppercase"
                  style={{
                    color: COLOR.blue,
                    letterSpacing: "0.14em",
                  }}
                >
                  Project Delivery
                </p>

                <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-white md:text-6xl">
                  Deliver work.
                  <br />
                  <span className="text-white/50">
                    Get feedback. Get paid.
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
                  Everything you need to present your work,
                  collaborate with clients, collect feedback,
                  and deliver projects professionally.
                </p>

                {/* Stats */}
                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-white">
                      {totalCount}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {totalCount === 1
                        ? "Project"
                        : "Projects"}</p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-white">
                      {totalViews}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Views
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-white">
                      {totalEmails}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Client emails
                    </p>
                  </div>
                </div>

                {/* Plan usage */}
                <div className="mt-8 max-w-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {planName}
                      </span>

                      <span className="text-xs text-white/30">
                        plan
                      </span>
                    </div>

                    <span className="text-xs text-white/40">
                      {usage.limit === Infinity
                        ? "Unlimited"
                        : `${usage.used} / ${usage.limit}`}
                    </span>
                  </div>

                  {usage.limit !== Infinity && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (usage.used /
                              usage.limit) *
                              100
                          )}%`,
                          background: atCap
                            ? "#F97316"
                            : COLOR.blue,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Upgrade warning */}
                {(nearCap || atCap) &&
                  nextTierInfo && (
                    <div
                      className="mt-6 max-w-2xl rounded-xl p-5"
                      style={{
                        background: atCap
                          ? "rgba(249,115,22,0.1)"
                          : "rgba(36,120,255,0.08)",
                        border: atCap
                          ? "1px solid rgba(249,115,22,0.3)"
                          : "1px solid rgba(36,120,255,0.25)",
                        backdropFilter:
                          "blur(10px)",
                      }}
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p
                            className="text-[11px] font-semibold uppercase"
                            style={{
                              color: atCap
                                ? "#fdba74"
                                : COLOR.blue,
                              letterSpacing:
                                "0.08em",
                            }}
                          >
                            {atCap
                              ? "Limit reached"
                              : "Almost there"}
                          </p>

                          <h3 className="mt-1 text-base font-bold text-white">
                            {atCap
                              ? `You've used all ${usage.limit} projects on ${planName}.`
                              : `Only ${usage.remaining} project${
                                  usage.remaining ===
                                  1
                                    ? ""
                                    : "s"
                                } left on ${planName}.`}
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-white/50">
                            Move up to{" "}
                            {nextTierInfo.name}
                            {nextTierInfo.limit ===
                            Infinity
                              ? " for unlimited projects"
                              : ` for up to ${nextTierInfo.limit} a month`}{" "}
                            — ₦
                            {nextTierInfo.priceNgnMonthly.toLocaleString()}
                            /mo.
                          </p>
                        </div>

                        <Link
                          href="/dashboard/billing"
                          className="flex w-fit shrink-0 items-center gap-2 rounded-lg px-5 py-3 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
                          style={{
                            background:
                              COLOR.gradient,
                          }}
                        >
                          Upgrade
                          <IconArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
              </div>

              {/* Right CTA */}
              <div className="shrink-0 lg:pb-1">
                <Link
                  href="/dashboard/start"
                  className="group flex w-fit items-center gap-3 rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: COLOR.gradient,
                    boxShadow:
                      "0 16px 40px rgba(36,120,255,0.22)",
                  }}
                >
                  <IconPlus className="h-4 w-4" />

                  <span>
                    New project
                  </span>

                  <IconArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <p className="mt-3 text-right text-[10px] text-white/30">
                  Create a new client delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          PROJECTS
      ───────────────────────────────────────── */}

      <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-20 md:py-20">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="h-[3px] w-10"
                style={{
                  background: COLOR.blue,
                }}
                aria-hidden
              />

              <p
                className="text-xs font-semibold uppercase"
                style={{
                  color: COLOR.blue,
                  letterSpacing: "0.12em",
                }}
              >
                Your work
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Projects
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Your client deliveries, all in one place.
            </p>
          </div>

          {totalCount > 0 && (
            <Link
              href="/dashboard/start"
              className="group flex w-fit items-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-white"
            >
              <IconPlus className="h-4 w-4" />
              New project
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}
        </div>

        {/* Existing project list component.
            IMPORTANT: keep the initialData contract. */}
        <DashboardProjectList
          initialData={{
            ownedProjects: ownedProjects.map(
              (p) => ({
                id: p.id,
                clientName: p.clientName,
                slug: p.slug,
                createdAt:
                  p.createdAt.toISOString(),
                viewCount: p.viewCount,
                _count: p._count,
              })
            ),

            totalCount,

            totalPages,

            currentPage: 1,

            sharedProjects:
              sharedProjects.map((p) => ({
                id: p.id,
                clientName: p.clientName,
                createdAt:
                  p.createdAt.toISOString(),
                creator: p.creator,
                _count: p._count,
              })),

            hasMoreShared,
          }}
        />

        {/* ─────────────────────────────────────────
            MANAGED PROJECTS
        ───────────────────────────────────────── */}

        {managedProjects.length > 0 && (
          <div className="mt-20">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div
                  className="h-[3px] w-10"
                  style={{
                    background: COLOR.blue,
                  }}
                  aria-hidden
                />

                <p
                  className="text-xs font-semibold uppercase"
                  style={{
                    color: COLOR.blue,
                    letterSpacing: "0.12em",
                  }}
                >
                  Workspace
                </p>
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Managed projects
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                Briefs, tasks, and internal review —
                separate from your client deliveries above.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managedProjects.map((mp) => {
                const doneCount =
                  mp.tasks.filter(
                    (t) => t.status === "DONE"
                  ).length;

                const taskCount =
                  mp.tasks.length;

                const isPublished =
                  !!mp.publishedAt;

                const href =
                  isPublished &&
                  mp.deliveryProject
                    ? `/dashboard/${mp.deliveryProject.id}`
                    : `/dashboard/managed/${mp.id}`;

                return (
                  <Link
                    key={mp.id}
                    href={href}
                    className="group relative flex flex-col gap-5 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background:
                        COLOR.charcoal,
                      boxShadow:
                        "0 0 0 1px rgba(36,120,255,0.1)",
                    }}
                  >
                    {/* Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={
                          isPublished
                            ? {
                                background:
                                  "rgba(34,197,94,0.15)",
                                color:
                                  "#4ade80",
                              }
                            : {
                                background:
                                  "rgba(36,120,255,0.15)",
                                color:
                                  COLOR.blue,
                              }
                        }
                      >
                        {isPublished
                          ? "Published"
                          : "In progress"}
                      </span>

                      {mp.role ===
                        "collaborator" && (
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-semibold"
                          style={{
                            background:
                              "rgba(255,204,0,0.12)",
                            color:
                              COLOR.accent,
                          }}
                        >
                          Collaborator
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-white">
                        {mp.name}
                      </p>

                      {mp.ownerLabel && (
                        <p
                          className="mt-1 text-xs"
                          style={{
                            color:
                              COLOR.midGray,
                          }}
                        >
                          Owned by{" "}
                          {mp.ownerLabel}
                        </p>
                      )}
                    </div>

                    {/* Task progress */}
                    {taskCount > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] text-white/30">
                            Progress
                          </span>

                          <span className="text-[11px] text-white/40">
                            {doneCount}/
                            {taskCount}
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(
                                (doneCount /
                                  taskCount) *
                                  100
                              )}%`,
                              background:
                                COLOR.blue,
                            }}
                          />
                        </div>

                        <p
                          className="mt-2 text-xs"
                          style={{
                            color:
                              COLOR.midGray,
                          }}
                        >
                          {doneCount} of{" "}
                          {taskCount} tasks done
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    <div
                      className="mt-auto flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold"
                      style={{
                        background:
                          "rgba(36,120,255,0.1)",
                        color: COLOR.blue,
                      }}
                    >
                      <span>
                        {isPublished
                          ? "View delivery"
                          : "Continue managing"}
                      </span>

                      <span
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        aria-hidden
                      >
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────
            QUICK GUIDE
        ───────────────────────────────────────── */}

        <div
          className="mt-20 overflow-hidden rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(36,120,255,0.09), rgba(255,255,255,0.025))",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="p-7 md:p-10">
              <p
                className="text-xs font-semibold uppercase"
                style={{
                  color: COLOR.blue,
                  letterSpacing: "0.12em",
                }}
              >
                Project Delivery
              </p>

              <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-white md:text-3xl">
                A better way to deliver creative work.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-white/45">
                Give every client a dedicated place to
                view their work, respond with feedback,
                and stay aligned from first delivery to
                final approval.
              </p>

              <Link
                href="/dashboard/start"
                className="mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{
                  background: COLOR.gradient,
                }}
              >
                Start a project
                <IconArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div
              className="border-t p-7 md:border-l md:border-t-0 md:p-10"
              style={{
                borderColor:
                  "rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/30">
                What you can do
              </p>

              <div className="mt-6 flex flex-col gap-5">
                {[
                  "Create a dedicated client delivery",
                  "Present work in a professional space",
                  "Collect client feedback",
                  "Track views and engagement",
                  "Manage projects with internal tasks",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background:
                          "rgba(36,120,255,0.12)",
                        color: COLOR.blue,
                      }}
                    >
                      <IconCheck className="h-3 w-3" />
                    </span>

                    <span className="text-sm leading-5 text-white/60">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            SUPPORT
        ───────────────────────────────────────── */}

        <div
          className="mt-6 flex flex-col items-center gap-4 rounded-2xl p-6 text-center sm:flex-row sm:justify-between sm:text-left"
          style={{
            background: COLOR.charcoal,
          }}
        >
          <div>
            <p className="text-sm font-semibold text-white">
              Need a hand with something?
            </p>

            <p className="mt-1 text-xs text-white/40">
              We reply within 5 hours.
            </p>
          </div>

          <a
            href="mailto:hello@useshowwork.com?subject=Showwork%20support"
            className="flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{
              background:
                "rgba(36,120,255,0.12)",
              color: COLOR.blue,
            }}
          >
            Contact support
            <span aria-hidden>→</span>
          </a>
        </div>
      </section>
    </main>
  );
}