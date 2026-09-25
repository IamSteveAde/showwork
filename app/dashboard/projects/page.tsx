import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import DashboardProjectList from "@/components/DashboardProjectList";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import {
  TIERS,
  PLAN_DISPLAY_NAME,
  NEXT_TIER,
} from "@/lib/subscriptionTiers";
import { isAdminEmail } from "@/lib/admin";

const COLOR = {
  black: "#08090B",
  blue: "#2478FF",
  blueBright: "#4C91FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  accent: "#FFCC00",
};

const PAGE_SIZE = 12;
const SHARED_DISPLAY_LIMIT = 12;

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */

function IconArrowUpRight({
  className = "",
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
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus({
  className = "",
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
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck({
  className = "",
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
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrid({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconUsers({
  className = "",
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
        d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="9.5"
        cy="7"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M17 11a3 3 0 1 0-1.2-5.75M21 20v-1.5a4 4 0 0 0-2.7-3.78"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEye({
  className = "",
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
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconLayers({
  className = "",
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
        d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m4 12.5 8 4 8-4M4 17l8 4 8-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMenu({
  className = "",
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
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  return (
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts[1]?.[0] ?? "").toUpperCase()
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default async function ProjectDeliveryPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  /* ─────────────────────────────────────────
     PROJECT DELIVERY DATA
  ───────────────────────────────────────── */

  const ownedWhere = {
    creatorId: creator.id,
    deletedAt: null,
  };

  const totalCount = await db.project.count({
    where: ownedWhere,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE),
  );

  const ownedProjects = await db.project.findMany({
    where: ownedWhere,
    orderBy: {
      createdAt: "desc",
    },
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

  /* ─────────────────────────────────────────
     SHARED PROJECTS
  ───────────────────────────────────────── */

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

  /* ─────────────────────────────────────────
     MANAGED PROJECTS
  ───────────────────────────────────────── */

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
      a.createdAt.getTime(),
  );

  /* ─────────────────────────────────────────
     STATS
  ───────────────────────────────────────── */

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
    0,
  );

  const totalEmails = allProjectsForStats.reduce(
    (sum, p) => sum + p._count.viewerEmails,
    0,
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
        Math.ceil(usage.limit * 0.2),
      );

  const atCap =
    usage.limit !== Infinity &&
    usage.remaining <= 0;

  const usagePercentage =
    usage.limit === Infinity
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            (usage.used / usage.limit) * 100,
          ),
        );

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#08090B] text-white"
    >
      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}

      <section className="relative isolate overflow-hidden bg-[#05070A]">
        {/* Hero image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: "center 42%",
          }}
        />

        {/* Image treatment */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,8,.97)_0%,rgba(3,5,8,.84)_28%,rgba(3,5,8,.42)_64%,rgba(3,5,8,.72)_100%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.9)_0%,rgba(3,5,8,.18)_35%,rgba(3,5,8,.3)_62%,#08090B_100%)]" />

        <div className="pointer-events-none absolute -left-48 top-1/3 h-[520px] w-[520px] rounded-full bg-[#2478FF]/15 blur-[140px]" />

        <div className="pointer-events-none absolute -right-40 top-1/4 h-[420px] w-[420px] rounded-full bg-[#4C91FF]/10 blur-[130px]" />

        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.20) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.20) 1px,transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom,black 0%,black 35%,transparent 86%)",
            WebkitMaskImage:
              "linear-gradient(to bottom,black 0%,black 35%,transparent 86%)",
          }}
        />

        {/* Hero frame */}
        <div className="pointer-events-none absolute inset-x-3 top-3 bottom-3 rounded-[28px] border border-white/[0.07] sm:inset-x-5 sm:top-5 sm:bottom-5 md:inset-x-8 md:top-8 md:bottom-8" />

        {/* ═══════════════════════════════════════
            SIMPLE FLOATING NAV
        ═══════════════════════════════════════ */}

        <div className="relative z-40 px-4 pt-5 sm:px-6 sm:pt-7 md:px-10 lg:px-16">
          <div className="mx-auto max-w-[1400px]">
            <header className="sticky top-4">
              <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/[0.10] bg-[#080A0E]/70 p-2 shadow-[0_24px_70px_rgba(0,0,0,.24)] backdrop-blur-2xl">
                {/* Brand */}
                <Link
                  href="/dashboard"
                  aria-label="Showwork"
                  className="group flex shrink-0 items-center gap-2.5 rounded-[14px] px-2.5 py-2 transition hover:bg-white/[0.05] sm:px-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[11px] font-black text-[#08090B] shadow-sm sm:h-9 sm:w-9">
                    S
                  </span>

                  <span className="hidden text-[15px] font-bold tracking-[-0.045em] sm:block">
                    <span className="text-white">
                      Show
                    </span>
                    <span className="bg-gradient-to-r from-[#2478FF] via-[#4C91FF] to-[#78B0FF] bg-clip-text text-transparent">
                      work
                    </span>
                  </span>
                </Link>

                {/* Primary page navigation */}
                <nav
                  aria-label="Page navigation"
                  className="hidden items-center gap-1 md:flex"
                >
                  <a
                    href="#projects"
                    className="rounded-xl bg-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-white/[0.13]"
                  >
                    Projects
                  </a>

                  {managedProjects.length > 0 && (
                    <a
                      href="#managed"
                      className="rounded-xl px-4 py-2.5 text-xs font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      Managed
                    </a>
                  )}

                  <a
                    href="#guide"
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Guide
                  </a>
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Plan */}
                  <Link
                    href="/dashboard/billing"
                    className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3.5 py-2.5 text-[10px] font-semibold text-white/65 transition hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white lg:flex"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: atCap
                          ? "#F97316"
                          : COLOR.blue,
                      }}
                    />

                    <span>{planName}</span>

                    <span className="text-white/20">
                      ·
                    </span>

                    <span className="text-white/35">
                      {usage.limit === Infinity
                        ? "Unlimited"
                        : `${usage.used}/${usage.limit}`}
                    </span>
                  </Link>

                  {/* New project */}
                  <Link
                    href="/dashboard/start"
                    className="group inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_30px_rgba(36,120,255,.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(36,120,255,.32)] sm:px-4"
                    style={{
                      background: COLOR.gradient,
                    }}
                  >
                    <IconPlus className="h-3.5 w-3.5" />

                    <span className="hidden sm:inline">
                      New project
                    </span>

                    <span className="sm:hidden">
                      New
                    </span>
                  </Link>

                  {/* Profile */}
                  <Link
                    href="/dashboard/profile"
                    aria-label="View profile"
                    className="group flex items-center rounded-xl p-1 transition hover:bg-white/[0.06]"
                  >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 text-[10px] font-bold text-white backdrop-blur-xl transition group-hover:border-white/25 group-hover:scale-[1.03]">
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
                          creator.email,
                        )
                      )}
                    </div>
                  </Link>

                  {/* Logout */}
                  <div className="hidden sm:block">
                    <LogoutButton />
                  </div>

                  {/* Mobile menu visual */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 md:hidden">
                    <IconMenu className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </header>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            HERO CONTENT
        ═══════════════════════════════════════ */}

        <div className="relative z-10 px-5 pb-12 pt-24 sm:px-6 sm:pb-14 sm:pt-28 md:px-10 md:pb-16 md:pt-32 lg:px-16 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-20">
              {/* Copy */}
              <div className="min-w-0 max-w-[900px]">
                <div className="mb-6 flex items-center gap-3 md:mb-8">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF] shadow-[0_0_18px_rgba(36,120,255,.95)]" />

                  <span className="text-[9px] font-bold uppercase tracking-[.22em] text-white/55 sm:text-[10px]">
                    Project Delivery
                  </span>
                </div>

                <h1
                  className="font-semibold tracking-[-.065em] text-white"
                  style={{
                    fontSize:
                      "clamp(2.15rem,5vw,5.25rem)",
                    lineHeight: 0.88,
                  }}
                >
                  Deliver the work.
                  <br />
                  <span className="text-white/40">
                    Without the chaos.
                  </span>
                </h1>

                <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
                  <Link
                    href="/dashboard/start"
                    className="group inline-flex min-h-[52px] items-center gap-3 rounded-xl px-5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 sm:min-h-14 sm:px-6"
                    style={{
                      background: COLOR.gradient,
                      boxShadow:
                        "0 18px 55px rgba(36,120,255,.28)",
                    }}
                  >
                    <IconPlus className="h-4 w-4" />

                    <span>New project</span>

                    <IconArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>

                  <a
                    href="#projects"
                    className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 py-3.5 text-xs font-semibold text-white/45 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[.07] hover:text-white sm:inline-flex"
                  >
                    View projects

                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-y-0.5"
                    >
                      ↓
                    </span>
                  </a>
                </div>
              </div>

              {/* Overview card */}
              <div className="w-full max-w-[370px] lg:ml-auto">
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[#2478FF]/10 blur-[70px]" />

                  <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#090C11]/80 p-5 shadow-2xl backdrop-blur-2xl md:p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#2478FF]/10 blur-3xl" />

                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/35">
                          Overview
                        </p>

                        <p className="mt-2 text-sm font-medium text-white/65">
                          Your delivery activity
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2478FF]/20 bg-[#2478FF]/10">
                        <IconGrid
                          className="h-4 w-4"
                          style={{
                            color: COLOR.blueBright,
                          }}
                        />
                      </div>
                    </div>

                    <div className="relative mt-7">
                      <p className="text-[10px] font-medium text-white/30">
                        Projects
                      </p>

                      <div className="mt-1 flex items-end justify-between gap-4">
                        <p className="text-4xl font-semibold tracking-[-.055em] text-white sm:text-5xl">
                          {totalCount}
                        </p>

                        <span className="mb-1.5 flex items-center gap-1.5 text-right text-[9px] font-semibold text-white/35 sm:text-[10px]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2478FF] shadow-[0_0_10px_rgba(36,120,255,.75)]" />

                          Active workspace
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-white/[.07] bg-white/[.035] p-3.5 sm:p-4">
                        <div className="flex items-center gap-2">
                          <IconEye className="h-3.5 w-3.5 text-white/35" />

                          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">
                            Views
                          </span>
                        </div>

                        <p className="mt-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                          {totalViews}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[.07] bg-white/[.035] p-3.5 sm:p-4">
                        <div className="flex items-center gap-2">
                          <IconUsers className="h-3.5 w-3.5 text-white/35" />

                          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">
                            Contacts
                          </span>
                        </div>

                        <p className="mt-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                          {totalEmails}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 sm:p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/25">
                            {planName}
                          </p>

                          <p className="mt-1 text-xs text-white/45">
                            Project usage
                          </p>
                        </div>

                        <p className="text-xs font-semibold text-white/55">
                          {usage.limit === Infinity
                            ? "Unlimited"
                            : `${usage.used} / ${usage.limit}`}
                        </p>
                      </div>

                      {usage.limit !== Infinity && (
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${usagePercentage}%`,
                              background: atCap
                                ? "#F97316"
                                : COLOR.blue,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <Link
                      href="/dashboard/billing"
                      className="mt-3 flex items-center justify-between rounded-lg px-1 py-1 text-[10px] font-semibold text-white/30 transition hover:text-white/70"
                    >
                      <span>
                        Manage plan
                      </span>

                      <IconArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-[8px] font-semibold uppercase tracking-[.18em] text-white/25 sm:text-[9px]">
                Showwork · Project Delivery
              </span>

              <span className="text-[8px] font-medium text-white/20 sm:text-[9px]">
                {firstName
                  ? `Welcome back, ${firstName}`
                  : "Your workspace"}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,#08090B_0%,rgba(8,9,11,.72)_32%,transparent_100%)]" />
      </section>

      {/* ═══════════════════════════════════════
          PROJECTS
      ═══════════════════════════════════════ */}

      <section
        id="projects"
        className="relative mx-auto max-w-[1400px] scroll-mt-28 px-5 py-16 md:px-10 md:py-20 lg:px-16"
      >
        <div
          className="pointer-events-none absolute -right-60 top-0 h-[500px] w-[500px] rounded-full blur-[150px]"
          style={{
            background:
              "rgba(36,120,255,0.045)",
          }}
        />

        <div className="relative">
          {/* Section header */}
          <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="h-[2px] w-8"
                  style={{
                    background: COLOR.blue,
                  }}
                />

                <p
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color: COLOR.blue,
                    letterSpacing: "0.16em",
                  }}
                >
                  Your work
                </p>
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                Projects
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/35">
                Your client deliveries, all in one place.
              </p>
            </div>

            {totalCount > 0 && (
              <Link
                href="/dashboard/start"
                className="group flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                <IconPlus className="h-3.5 w-3.5" />

                New project

                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            )}
          </div>

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
                }),
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

          {/* ═════════════════════════════════════
              MANAGED PROJECTS
          ═════════════════════════════════════ */}

          {managedProjects.length > 0 && (
            <div
              id="managed"
              className="mt-24 scroll-mt-28"
            >
              <div className="mb-9">
                <div className="flex items-center gap-3">
                  <span
                    className="h-[2px] w-8"
                    style={{
                      background: COLOR.blue,
                    }}
                  />

                  <p
                    className="text-[10px] font-bold uppercase"
                    style={{
                      color: COLOR.blue,
                      letterSpacing: "0.16em",
                    }}
                  >
                    Workspace
                  </p>
                </div>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                  Managed projects
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
                  Briefs, tasks, and internal review —
                  separate from your client deliveries above.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {managedProjects.map((mp) => {
                  const doneCount =
                    mp.tasks.filter(
                      (t) => t.status === "DONE",
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

                  const progress =
                    taskCount > 0
                      ? Math.round(
                          (doneCount /
                            taskCount) *
                            100,
                        )
                      : 0;

                  return (
                    <Link
                      key={mp.id}
                      href={href}
                      className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-[#15181C]"
                    >
                      <div
                        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{
                          background:
                            "rgba(36,120,255,0.10)",
                        }}
                      />

                      <div className="relative flex items-start justify-between gap-2">
                        <span
                          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={
                            isPublished
                              ? {
                                  background:
                                    "rgba(34,197,94,0.10)",
                                  color:
                                    "#4ADE80",
                                  border:
                                    "1px solid rgba(34,197,94,0.15)",
                                }
                              : {
                                  background:
                                    "rgba(36,120,255,0.10)",
                                  color:
                                    COLOR.blueBright,
                                  border:
                                    "1px solid rgba(36,120,255,0.15)",
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
                            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                            style={{
                              background:
                                "rgba(255,204,0,0.08)",
                              color:
                                COLOR.accent,
                              border:
                                "1px solid rgba(255,204,0,0.12)",
                            }}
                          >
                            Collaborator
                          </span>
                        )}
                      </div>

                      <div className="relative mt-8">
                        <p className="text-xl font-semibold tracking-[-0.025em] text-white">
                          {mp.name}
                        </p>

                        {mp.ownerLabel && (
                          <p className="mt-2 text-xs text-white/35">
                            Owned by{" "}
                            <span className="text-white/50">
                              {mp.ownerLabel}
                            </span>
                          </p>
                        )}
                      </div>

                      {taskCount > 0 && (
                        <div className="relative mt-auto pt-8">
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase tracking-[0.10em] text-white/30">
                              Progress
                            </span>

                            <span className="text-[10px] font-semibold text-white/45">
                              {doneCount}/{taskCount}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background:
                                  COLOR.blue,
                              }}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-[10px] text-white/30">
                              {doneCount} of{" "}
                              {taskCount} tasks done
                            </p>

                            <span className="text-[10px] font-semibold text-white/35">
                              {progress}%
                            </span>
                          </div>
                        </div>
                      )}

                      {taskCount === 0 && (
                        <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.06] pt-5">
                          <span className="text-[10px] uppercase tracking-[0.1em] text-white/25">
                            No tasks yet
                          </span>

                          <span className="text-xs text-white/35 transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      )}

                      {taskCount > 0 && (
                        <div className="relative mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-xs font-semibold">
                          <span className="text-white/45 transition-colors group-hover:text-white">
                            {isPublished
                              ? "View delivery"
                              : "Continue managing"}
                          </span>

                          <span className="text-white/30 transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════
              GUIDE
          ═════════════════════════════════════ */}

          <div
            id="guide"
            className="relative mt-24 scroll-mt-28 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#111316]"
          >
            <div
              className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full blur-[100px]"
              style={{
                background:
                  "rgba(36,120,255,0.10)",
              }}
            />

            <div className="relative grid md:grid-cols-[1.1fr_1fr]">
              <div className="p-7 md:p-10 lg:p-12">
                <div className="flex items-center gap-3">
                  <span
                    className="h-[2px] w-8"
                    style={{
                      background: COLOR.blue,
                    }}
                  />

                  <p
                    className="text-[10px] font-bold uppercase"
                    style={{
                      color: COLOR.blue,
                      letterSpacing: "0.16em",
                    }}
                  >
                    Project Delivery
                  </p>
                </div>

                <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] text-white md:text-4xl">
                  A better way to deliver creative work.
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-white/40">
                  Give every client a dedicated place to
                  view their work, respond with feedback,
                  and stay aligned from first delivery to
                  final approval.
                </p>

                <Link
                  href="/dashboard/start"
                  className="group mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                  style={{
                    background: COLOR.gradient,
                  }}
                >
                  Start a project

                  <IconArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              <div className="border-t border-white/[0.07] p-7 md:border-l md:border-t-0 md:p-10 lg:p-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">
                  What you can do
                </p>

                <div className="mt-7 flex flex-col gap-5">
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
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background:
                            "rgba(36,120,255,0.10)",
                          color:
                            COLOR.blueBright,
                        }}
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>

                      <span className="pt-0.5 text-sm leading-5 text-white/55">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════
              SUPPORT
          ═════════════════════════════════════ */}

          <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-[#111316] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Need a hand with something?
              </p>

              <p className="mt-1 text-xs text-white/30">
                We reply within 5 hours.
              </p>
            </div>

            <a
              href="mailto:hello@useshowwork.com?subject=Showwork%20support"
              className="group flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Contact support

              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>

          {/* Bottom spacing */}
          <div className="h-10" />
        </div>
      </section>
    </main>
  );
}