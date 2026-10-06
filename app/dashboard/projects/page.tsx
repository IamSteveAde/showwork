import { cookies } from "next/headers";
import ProjectDashboardTheme, { ProjectThemeToggle } from "@/components/projects/ProjectDashboardTheme";
import UiSymbol from "@/components/ui/UiSymbol";
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
  const initialTheme = (await cookies()).get("showwork-projects-theme")?.value === "dark" ? "dark" : "light";
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
    <ProjectDashboardTheme initialTheme={initialTheme}>
      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}

      <section className="relative isolate overflow-hidden bg-[var(--pd-page)]">
        {/* Hero image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="projects-hero-image absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: "center 42%",
          }}
        />

        {/* Image treatment */}
        <div className="projects-hero-shade absolute inset-0" />


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
        <div className="pointer-events-none absolute inset-x-3 top-3 bottom-3 rounded-[28px] border border-[var(--pd-border)] sm:inset-x-5 sm:top-5 sm:bottom-5 md:inset-x-8 md:top-8 md:bottom-8" />

        {/* ═══════════════════════════════════════
            SIMPLE FLOATING NAV
        ═══════════════════════════════════════ */}

        <div className="relative z-40 px-4 pt-5 sm:px-6 sm:pt-7 md:px-10 lg:px-16">
          <div className="mx-auto max-w-[1400px]">
            <Link
              href="/dashboard"
              className="group mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--pd-muted)] transition hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2478FF]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Go to apps
            </Link>
            <header className="sticky top-4">
              <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--pd-border)] bg-[var(--pd-nav)] p-2 shadow-[var(--pd-shadow)] backdrop-blur-2xl">
                {/* Brand */}
                <Link
                  href="/dashboard"
                  aria-label="Showwork"
                  className="group flex shrink-0 items-center gap-2.5 rounded-[14px] px-2.5 py-2 transition hover:bg-[var(--pd-soft)] sm:px-3"
                >
                  <span className="projects-logo block" role="img" aria-label="Showwork" />
                </Link>

                {/* Primary page navigation */}
                <nav
                  aria-label="Page navigation"
                  className="hidden items-center gap-1 md:flex"
                >
                  <a
                    href="#projects"
                    className="rounded-xl bg-[var(--pd-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--pd-text)] shadow-sm transition hover:bg-[var(--pd-soft)]"
                  >
                    Projects
                  </a>

                  {managedProjects.length > 0 && (
                    <a
                      href="#managed"
                      className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--pd-muted)] transition hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)]"
                    >
                      Managed
                    </a>
                  )}

                  <a
                    href="#guide"
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--pd-muted)] transition hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)]"
                  >
                    Guide
                  </a>
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ProjectThemeToggle />
                  {/* Plan */}
                  <Link
                    href="/dashboard/billing?product=delivery#project-delivery-plans"
                    className="hidden items-center gap-2 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] px-3.5 py-2.5 text-[10px] font-semibold text-[var(--pd-muted)] transition hover:border-[var(--pd-border)] hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)] lg:flex"
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

                    <span className="text-[var(--pd-faint)]">
                      ·
                    </span>

                    <span className="text-[var(--pd-subtle)]">
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
                    className="group flex items-center rounded-xl p-1 transition hover:bg-[var(--pd-soft)]"
                  >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] text-[10px] font-bold text-[var(--pd-text)] backdrop-blur-xl transition group-hover:border-[var(--pd-border)] group-hover:scale-[1.03]">
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
                  <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] text-[var(--pd-muted)] min-[420px]:flex md:hidden">
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

                  <span className="text-[9px] font-bold uppercase tracking-[.22em] text-[var(--pd-muted)] sm:text-[10px]">
                    Project Delivery
                  </span>
                </div>

                <h1
                  className="font-semibold tracking-[-.065em] text-[var(--pd-text)]"
                  style={{
                    fontSize:
                      "clamp(2.15rem,5vw,5.25rem)",
                    lineHeight: 0.88,
                  }}
                >
                  Deliver the work.
                  <br />
                  <span className="text-[var(--pd-subtle)]">
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
                    className="hidden items-center gap-2 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] px-5 py-3.5 text-xs font-semibold text-[var(--pd-muted)] backdrop-blur-xl transition hover:border-[var(--pd-border)] hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)] sm:inline-flex"
                  >
                    View projects

                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-y-0.5"
                    ><UiSymbol name="down" /></span>
                  </a>
                </div>
              </div>

              {/* Overview card */}
              <div className="w-full max-w-[370px] lg:ml-auto">
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[#2478FF]/10 blur-[70px]" />

                  <div className="relative overflow-hidden rounded-[26px] border border-[var(--pd-border)] bg-[var(--pd-surface)] p-5 projects-overview backdrop-blur-2xl md:p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#2478FF]/10 blur-3xl" />

                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[var(--pd-subtle)]">
                          Overview
                        </p>

                        <p className="mt-2 text-sm font-medium text-[var(--pd-muted)]">
                          Your delivery activity
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2478FF]/20 bg-[#2478FF]/10">
                        <IconGrid
                          className="h-4 w-4"
                          style={{
                            color: "var(--pd-brand)",
                          }}
                        />
                      </div>
                    </div>

                    <div className="relative mt-7">
                      <p className="text-[10px] font-medium text-[var(--pd-subtle)]">
                        Projects
                      </p>

                      <div className="mt-1 flex items-end justify-between gap-4">
                        <p className="text-4xl font-semibold tracking-[-.055em] text-[var(--pd-text)] sm:text-5xl">
                          {totalCount}
                        </p>

                        <span className="mb-1.5 flex items-center gap-1.5 text-right text-[9px] font-semibold text-[var(--pd-subtle)] sm:text-[10px]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2478FF] shadow-[0_0_10px_rgba(36,120,255,.75)]" />

                          Active workspace
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] p-3.5 sm:p-4">
                        <div className="flex items-center gap-2">
                          <IconEye className="h-3.5 w-3.5 text-[var(--pd-subtle)]" />

                          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--pd-subtle)]">
                            Views
                          </span>
                        </div>

                        <p className="mt-2.5 text-xl font-semibold tracking-tight text-[var(--pd-text)] sm:text-2xl">
                          {totalViews}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] p-3.5 sm:p-4">
                        <div className="flex items-center gap-2">
                          <IconUsers className="h-3.5 w-3.5 text-[var(--pd-subtle)]" />

                          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--pd-subtle)]">
                            Contacts
                          </span>
                        </div>

                        <p className="mt-2.5 text-xl font-semibold tracking-tight text-[var(--pd-text)] sm:text-2xl">
                          {totalEmails}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] p-3.5 sm:p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--pd-faint)]">
                            {planName}
                          </p>

                          <p className="mt-1 text-xs text-[var(--pd-muted)]">
                            Project usage
                          </p>
                        </div>

                        <p className="text-xs font-semibold text-[var(--pd-muted)]">
                          {usage.limit === Infinity
                            ? "Unlimited"
                            : `${usage.used} / ${usage.limit}`}
                        </p>
                      </div>

                      {usage.limit !== Infinity && (
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--pd-soft)]">
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
                      href="/dashboard/billing?product=delivery#project-delivery-plans"
                      className="mt-3 flex items-center justify-between rounded-lg px-1 py-1 text-[10px] font-semibold text-[var(--pd-subtle)] transition hover:text-[var(--pd-muted)]"
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

            <div className="mt-10 flex items-center justify-between border-t border-[var(--pd-border)] pt-5">
              <span className="text-[8px] font-semibold uppercase tracking-[.18em] text-[var(--pd-faint)] sm:text-[9px]">
                Showwork · Project Delivery
              </span>

              <span className="text-[8px] font-medium text-[var(--pd-faint)] sm:text-[9px]">
                {firstName
                  ? `Welcome back, ${firstName}`
                  : "Your workspace"}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 projects-hero-fade" />
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

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--pd-text)] md:text-4xl">
                Projects
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--pd-subtle)]">
                Your client deliveries, all in one place.
              </p>
            </div>

            {totalCount > 0 && (
              <Link
                href="/dashboard/start"
                className="group flex w-fit items-center gap-2 rounded-full border border-[var(--pd-border)] bg-[var(--pd-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--pd-muted)] transition hover:border-[var(--pd-border)] hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)]"
              >
                <IconPlus className="h-3.5 w-3.5" />

                New project

                <span className="transition-transform group-hover:translate-x-0.5"><UiSymbol name="right" /></span>
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

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--pd-text)] md:text-4xl">
                  Managed projects
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--pd-subtle)]">
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
                      className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-2xl border border-[var(--pd-border)] bg-[var(--pd-surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--pd-border)] hover:bg-[var(--pd-hover)]"
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
                                    "var(--pd-success)",
                                  border:
                                    "1px solid rgba(34,197,94,0.15)",
                                }
                              : {
                                  background:
                                    "rgba(36,120,255,0.10)",
                                  color:
                                    "var(--pd-brand)",
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
                                "var(--pd-accent)",
                              border:
                                "1px solid rgba(255,204,0,0.12)",
                            }}
                          >
                            Collaborator
                          </span>
                        )}
                      </div>

                      <div className="relative mt-8">
                        <p className="text-xl font-semibold tracking-[-0.025em] text-[var(--pd-text)]">
                          {mp.name}
                        </p>

                        {mp.ownerLabel && (
                          <p className="mt-2 text-xs text-[var(--pd-subtle)]">
                            Owned by{" "}
                            <span className="text-[var(--pd-muted)]">
                              {mp.ownerLabel}
                            </span>
                          </p>
                        )}
                      </div>

                      {taskCount > 0 && (
                        <div className="relative mt-auto pt-8">
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase tracking-[0.10em] text-[var(--pd-subtle)]">
                              Progress
                            </span>

                            <span className="text-[10px] font-semibold text-[var(--pd-muted)]">
                              {doneCount}/{taskCount}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--pd-soft)]">
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
                            <p className="text-[10px] text-[var(--pd-subtle)]">
                              {doneCount} of{" "}
                              {taskCount} tasks done
                            </p>

                            <span className="text-[10px] font-semibold text-[var(--pd-subtle)]">
                              {progress}%
                            </span>
                          </div>
                        </div>
                      )}

                      {taskCount === 0 && (
                        <div className="relative mt-auto flex items-center justify-between border-t border-[var(--pd-border)] pt-5">
                          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--pd-faint)]">
                            No tasks yet
                          </span>

                          <span className="text-xs text-[var(--pd-subtle)] transition-transform group-hover:translate-x-1"><UiSymbol name="right" /></span>
                        </div>
                      )}

                      {taskCount > 0 && (
                        <div className="relative mt-5 flex items-center justify-between rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] px-4 py-3 text-xs font-semibold">
                          <span className="text-[var(--pd-muted)] transition-colors group-hover:text-[var(--pd-text)]">
                            {isPublished
                              ? "View delivery"
                              : "Continue managing"}
                          </span>

                          <span className="text-[var(--pd-subtle)] transition-transform group-hover:translate-x-1"><UiSymbol name="right" /></span>
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
            className="relative mt-24 scroll-mt-28 overflow-hidden rounded-[28px] border border-[var(--pd-border)] bg-[var(--pd-surface)]"
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

                <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] text-[var(--pd-text)] md:text-4xl">
                  A better way to deliver creative work.
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--pd-subtle)]">
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

              <div className="border-t border-[var(--pd-border)] p-7 md:border-l md:border-t-0 md:p-10 lg:p-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pd-faint)]">
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
                            "var(--pd-brand)",
                        }}
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>

                      <span className="pt-0.5 text-sm leading-5 text-[var(--pd-muted)]">
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

          <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-[var(--pd-border)] bg-[var(--pd-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--pd-text)]">
                Need a hand with something?
              </p>

              <p className="mt-1 text-xs text-[var(--pd-subtle)]">
                We reply within 5 hours.
              </p>
            </div>

            <a
              href="mailto:hello@useshowwork.com?subject=Showwork%20support"
              className="group flex w-fit items-center gap-2 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-soft)] px-5 py-3 text-sm font-semibold text-[var(--pd-muted)] transition hover:border-[var(--pd-border)] hover:bg-[var(--pd-soft)] hover:text-[var(--pd-text)]"
            >
              Contact support

              <span className="transition-transform group-hover:translate-x-1"><UiSymbol name="right" /></span>
            </a>
          </div>

          {/* Bottom spacing */}
          <div className="h-10" />
        </div>
      </section>
    </ProjectDashboardTheme>
  );
}
