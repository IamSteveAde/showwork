import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { verifyViewerToken } from "@/lib/auth";
import { canAccessCalendar } from "@/lib/calendarPermissions";
import CalendarPasswordGate from "@/components/calendars/CalendarPasswordGate";
import ClientCalendarView from "@/components/calendars/ClientCalendarView";
import CalendarStatsSummary from "@/components/calendars/CalendarStatsSummary";

const COLOR = {
  black: "#08090B",
  blackSoft: "#0D0F12",
  white: "#FFFFFF",
  blue: "#2478FF",
};

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
   Icons
───────────────────────────────────────────────────────────── */

function IconArrowRight({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function IconArrowDown({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
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
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconClock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function IconMessage({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 4H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3l4 3 4-3h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <path d="M7 9h10" />
      <path d="M7 12h6" />
    </svg>
  );
}

function IconLock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconSpark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */

export default async function SocialCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { slug },
    include: {
      manager: {
        select: {
          calendarBillingStatus: true,
          calendarTrialEndsAt: true,
        },
      },
      posts: {
        orderBy: { postDate: "asc" },
        include: {
          assets: {
            orderBy: { displayOrder: "asc" },
          },
          videoComments: {
            orderBy: { videoTimestampSeconds: "asc" },
          },
          customFields: true,
        },
      },
    },
  });

  if (!calendar) {
    notFound();
  }

  const cookieStore = await cookies();

  const token = cookieStore.get(
    cookieNameFor(calendar.id)
  )?.value;

  const viewer = token
    ? verifyViewerToken(token, calendar.id)
    : null;

  if (!viewer) {
    return (
      <CalendarPasswordGate
        slug={slug}
        clientName={calendar.clientName}
      />
    );
  }

  /*
   * The client should only see the workspace once the manager's
   * calendar is active.
   */
  if (!canAccessCalendar(calendar.manager)) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: COLOR.black }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "rgba(248,113,113,0.10)",
              border: "1px solid rgba(248,113,113,0.16)",
            }}
          >
            <IconLock
              className="h-6 w-6"
            />
          </div>

          <p
            className="mt-7 text-[10px] font-semibold uppercase"
            style={{
              color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.16em",
            }}
          >
            Workspace unavailable
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            This workspace isn&apos;t active yet.
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/45">
            Your content is safe. Check back once your manager has
            completed the workspace setup.
          </p>
        </div>
      </main>
    );
  }

  const desktopBannerUrl = calendar.headerBannerDesktopUrl
    ? publicUrlFor(calendar.headerBannerDesktopUrl)
    : null;

  const mobileBannerUrl = calendar.headerBannerMobileUrl
    ? publicUrlFor(calendar.headerBannerMobileUrl)
    : null;

  const hasRealBanner = Boolean(
    desktopBannerUrl || mobileBannerUrl
  );

  const displayTitle =
    calendar.headerTitle ||
    `${calendar.clientName}'s Content Calendar`;

  const displayDescription =
    calendar.headerDescription ||
    "Every post planned and ready for your review — approve what’s ready, or let your team know what needs another look.";

  /* ─────────────────────────────────────────────────────────
     Workspace stats
  ───────────────────────────────────────────────────────── */

  const totalPosts = calendar.posts.length;

  const approvedPosts = calendar.posts.filter(
    (post) => post.approvalStatus === "APPROVED"
  ).length;

  const pendingPosts = calendar.posts.filter(
    (post) => post.approvalStatus === "PENDING"
  ).length;

  const revisionPosts = calendar.posts.filter(
    (post) => post.approvalStatus === "NEEDS_REVISION"
  ).length;

  const totalAssets = calendar.posts.reduce(
    (sum, post) => sum + post.assets.length,
    0
  );

  const hasReviews = revisionPosts > 0;

  const approvalPercentage =
    totalPosts > 0
      ? Math.round((approvedPosts / totalPosts) * 100)
      : 0;

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: COLOR.black,
        color: COLOR.white,
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          TOP NAV
      ═══════════════════════════════════════════════════════ */}

      <header
        className="sticky top-0 z-50 border-b backdrop-blur-2xl"
        style={{
          background: "rgba(8,9,11,0.84)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto flex h-[68px] max-w-7xl items-center px-5 sm:px-7 lg:px-10">
          {/* Brand */}
          <a
            href="#top"
            className="flex shrink-0 items-center gap-3"
            aria-label="Back to top"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-xs font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, #2478FF 0%, #1557C9 100%)",
                boxShadow:
                  "0 8px 24px rgba(36,120,255,0.28)",
              }}
            >
              S
            </span>

            <span className="hidden text-sm font-semibold tracking-[-0.02em] text-white sm:block">
              Showwork
            </span>
          </a>

          {/* Desktop navigation */}
          <nav
            className="ml-auto hidden items-center gap-1 md:flex"
            aria-label="Workspace navigation"
          >
            <a
              href="#overview"
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Overview
            </a>

            <a
              href="#calendar"
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Calendar
            </a>

            <a
              href="#review"
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Review
            </a>
          </nav>

          {/* Client identity */}
          <div className="ml-3 flex items-center gap-3">
            <div className="hidden h-5 w-px bg-white/10 md:block" />

            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-medium text-white/75">
                {calendar.clientName}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/30">
                Private workspace
              </p>
            </div>

            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.09)",
              }}
            >
              <IconLock className="h-3.5 w-3.5 text-white/50" />
            </span>
          </div>
        </div>

        {/* Mobile navigation */}
        <div
          className="border-t md:hidden"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <nav
            className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5"
            aria-label="Mobile workspace navigation"
          >
            <a
              href="#overview"
              className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium text-white/55 hover:bg-white/[0.05] hover:text-white"
            >
              Overview
            </a>

            <a
              href="#calendar"
              className="shrink-0 rounded-lg bg-white/[0.07] px-3 py-2 text-[11px] font-medium text-white"
            >
              Calendar
            </a>

            <a
              href="#review"
              className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium text-white/55 hover:bg-white/[0.05] hover:text-white"
            >
              Review
            </a>
          </nav>
        </div>
      </header>

      <div id="top">
        {/* ═════════════════════════════════════════════════════
            HERO
        ═════════════════════════════════════════════════════ */}

        <section className="relative isolate overflow-hidden">
          {/* Banner */}
          <div className="absolute inset-0 h-[520px] sm:h-[580px]">
            {hasRealBanner ? (
              <>
                {mobileBannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mobileBannerUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover sm:hidden"
                  />
                )}

                {desktopBannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={desktopBannerUrl}
                    alt=""
                    className="absolute inset-0 hidden h-full w-full object-cover sm:block"
                  />
                )}
              </>
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 18% 20%, rgba(36,120,255,0.34), transparent 32%), radial-gradient(circle at 82% 12%, rgba(135,82,255,0.22), transparent 30%), radial-gradient(circle at 58% 88%, rgba(0,194,168,0.12), transparent 28%), #08090B",
                }}
              >
                <div
                  className="absolute inset-0 opacity-[0.035]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                  }}
                />
              </div>
            )}

            {/* Cinematic overlays */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(8,9,11,0.24) 0%, rgba(8,9,11,0.28) 28%, rgba(8,9,11,0.76) 66%, #08090B 100%)",
              }}
            />

            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(8,9,11,0.42) 0%, transparent 60%, rgba(8,9,11,0.18) 100%)",
              }}
            />
          </div>

          {/* Hero content */}
          <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-7 sm:pb-20 sm:pt-24 lg:px-10 lg:pb-24 lg:pt-28">
            <div className="max-w-4xl">
              {/* Eyebrow */}
              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 items-center gap-2 rounded-full border px-3 text-[9px] font-semibold uppercase tracking-[0.13em]"
                  style={{
                    background: "rgba(8,9,11,0.45)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.66)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "#43E097",
                      boxShadow: "0 0 12px rgba(67,224,151,0.7)",
                    }}
                  />
                  Private client workspace
                </span>
              </div>

              {/* Heading */}
              <h1 className="mt-7 max-w-4xl text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[76px]">
                {displayTitle}
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/62 sm:text-base sm:leading-8">
                {displayDescription}
              </p>

              {/* Hero actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#calendar"
                  className="group inline-flex h-12 items-center gap-2.5 rounded-xl px-5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{
                    background: COLOR.blue,
                    boxShadow:
                      "0 14px 34px rgba(36,120,255,0.25)",
                  }}
                >
                  View calendar

                  <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>

                <a
                  href="#overview"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  style={{
                    borderColor: "rgba(255,255,255,0.11)",
                    background: "rgba(8,9,11,0.34)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  Workspace overview
                </a>
              </div>
            </div>

            {/* Hero stats */}
            <div className="mt-14 grid max-w-4xl grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-4"
              style={{
                background: "rgba(8,9,11,0.58)",
                borderColor: "rgba(255,255,255,0.09)",
                backdropFilter: "blur(22px)",
              }}
            >
              <div className="border-b border-white/[0.07] p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Content
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  {totalPosts}
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  planned posts
                </p>
              </div>

              <div className="border-b border-white/[0.07] p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Approved
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  {approvedPosts}
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  {approvalPercentage}% approved
                </p>
              </div>

              <div className="p-4 sm:border-r sm:border-white/[0.07] sm:p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Review
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  {pendingPosts + revisionPosts}
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  awaiting action
                </p>
              </div>

              <div className="border-l border-white/[0.07] p-4 sm:border-l-0 sm:p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Files
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  {totalAssets}
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  attached assets
                </p>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="relative hidden justify-center pb-5 sm:flex">
            <a
              href="#overview"
              className="flex flex-col items-center gap-2 text-white/25 transition-colors hover:text-white/55"
              aria-label="Scroll to workspace overview"
            >
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em]">
                Explore workspace
              </span>
              <IconArrowDown className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            MAIN WORKSPACE
        ═════════════════════════════════════════════════════ */}

        <div
          className="relative"
          style={{
            background:
              "linear-gradient(180deg, #08090B 0%, #0B0D10 100%)",
          }}
        >
          {/* Subtle atmosphere */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 opacity-20 blur-[120px]"
            style={{
              background: "#2478FF",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-7 lg:px-10">
            {/* ═══════════════════════════════════════════════
                OVERVIEW
            ═══════════════════════════════════════════════ */}

            <section
              id="overview"
              className="scroll-mt-24 pt-10 sm:pt-14"
            >
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p
                    className="text-[9px] font-semibold uppercase"
                    style={{
                      color: "rgba(255,255,255,0.32)",
                      letterSpacing: "0.16em",
                    }}
                  >
                    Workspace overview
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
                    Everything at a glance.
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                    See what&apos;s planned, what&apos;s approved and what
                    still needs your attention.
                  </p>
                </div>

                <a
                  href="#calendar"
                  className="group inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-white/60 transition-colors hover:text-white"
                >
                  Open calendar
                  <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              {/* Stats summary */}
              <div
                className="overflow-hidden rounded-[26px] border"
                style={{
                  background: "#101216",
                  borderColor: "rgba(255,255,255,0.075)",
                }}
              >
                <CalendarStatsSummary
                  posts={calendar.posts.map((p) => ({
                    platform: p.platform,
                    postDate: p.postDate.toISOString(),
                  }))}
                />
              </div>

              {/* Status cards */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    borderColor: "rgba(255,255,255,0.065)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(67,224,151,0.09)",
                        color: "#43E097",
                      }}
                    >
                      <IconCheck className="h-4 w-4" />
                    </div>

                    <span className="text-[10px] font-semibold text-white/25">
                      {totalPosts > 0
                        ? `${approvalPercentage}%`
                        : "—"}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-white">
                    Approved
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Content ready to move forward.
                  </p>

                  <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {approvedPosts}
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    borderColor: "rgba(255,255,255,0.065)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(247,183,66,0.09)",
                        color: "#F7B742",
                      }}
                    >
                      <IconClock className="h-4 w-4" />
                    </div>

                    <span className="text-[10px] font-semibold text-white/25">
                      Review
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-white">
                    Awaiting review
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Posts that still need your attention.
                  </p>

                  <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {pendingPosts}
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    borderColor: "rgba(255,255,255,0.065)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        background: hasReviews
                          ? "rgba(248,113,113,0.09)"
                          : "rgba(36,120,255,0.09)",
                        color: hasReviews
                          ? "#F87171"
                          : "#2478FF",
                      }}
                    >
                      {hasReviews ? (
                        <IconMessage className="h-4 w-4" />
                      ) : (
                        <IconSpark className="h-4 w-4" />
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-white/25">
                      {hasReviews ? "Action" : "Clear"}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-white">
                    {hasReviews
                      ? "Needs another look"
                      : "Nothing to revise"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/35">
                    {hasReviews
                      ? "Your team has requested changes."
                      : "Everything currently looks good."}
                  </p>

                  <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {revisionPosts}
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════
                CALENDAR
            ═══════════════════════════════════════════════ */}

            <section
              id="calendar"
              className="scroll-mt-24 pt-20 sm:pt-28"
            >
              <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: COLOR.blue,
                        boxShadow:
                          "0 0 14px rgba(36,120,255,0.65)",
                      }}
                    />

                    <p
                      className="text-[9px] font-semibold uppercase"
                      style={{
                        color: "rgba(255,255,255,0.34)",
                        letterSpacing: "0.16em",
                      }}
                    >
                      Content planner
                    </p>
                  </div>

                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                    Your content, clearly organised.
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
                    Browse the calendar, open a post, review the content,
                    leave feedback and approve when everything is ready.
                  </p>
                </div>

                <div
                  className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "#43E097",
                      boxShadow:
                        "0 0 10px rgba(67,224,151,0.65)",
                    }}
                  />

                  <span className="text-[10px] font-medium text-white/50">
                    Workspace is active
                  </span>
                </div>
              </div>

              {/* Actual calendar application */}
              <div
                className="overflow-hidden rounded-[28px] border"
                style={{
                  background: "#0D0F12",
                  borderColor: "rgba(255,255,255,0.075)",
                  boxShadow:
                    "0 30px 80px rgba(0,0,0,0.24)",
                }}
              >
                <ClientCalendarView
                  slug={slug}
                  planStatus={calendar.planStatus}
                  clientName={calendar.clientName}
                  posts={calendar.posts.map((p) => ({
                    id: p.id,
                    postDate: p.postDate.toISOString(),
                    platform: p.platform,
                    postType: p.postType,
                    category: p.category,
                    caption: p.caption,
                    contentIdea: p.contentIdea,
                    cta: p.cta,
                    hashtags: p.hashtags,
                    taggedAccounts: p.taggedAccounts,
                    linkUrl: p.linkUrl,
                    approvalStatus: p.approvalStatus,
                    approvalNote: p.approvalNote,

                    assets: p.assets.map((a) => ({
                      id: a.id,
                      mediaType: a.mediaType,
                      contentUrl: publicUrlFor(a.fileKey),
                    })),

                    videoComments: p.videoComments.map((c) => ({
                      id: c.id,
                      authorName: c.authorName,
                      authorEmail: c.authorEmail,
                      note: c.note,
                      videoTimestampSeconds:
                        c.videoTimestampSeconds,
                    })),

                    customFields: p.customFields.map((f) => ({
                      id: f.id,
                      label: f.label,
                      value: f.value,
                    })),
                  }))}
                />
              </div>
            </section>

            {/* ═══════════════════════════════════════════════
                REVIEW GUIDANCE
            ═══════════════════════════════════════════════ */}

            <section
              id="review"
              className="scroll-mt-24 pt-20 sm:pt-28"
            >
              <div
                className="relative overflow-hidden rounded-[30px] border p-7 sm:p-10 lg:p-12"
                style={{
                  background:
                    "radial-gradient(circle at 90% 0%, rgba(36,120,255,0.14), transparent 35%), #101216",
                  borderColor: "rgba(255,255,255,0.075)",
                }}
              >
                <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="max-w-2xl">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(36,120,255,0.10)",
                        color: COLOR.blue,
                      }}
                    >
                      <IconMessage className="h-4 w-4" />
                    </div>

                    <p
                      className="mt-6 text-[9px] font-semibold uppercase"
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        letterSpacing: "0.16em",
                      }}
                    >
                      How to review
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
                      Review without the back-and-forth.
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-7 text-white/40">
                      Open any post to see its content and attached files.
                      Approve it when it&apos;s ready, or leave a note if
                      something needs to change.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:w-[390px] lg:grid-cols-1">
                    <div
                      className="flex items-center gap-3 rounded-xl border p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        borderColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "rgba(67,224,151,0.09)",
                          color: "#43E097",
                        }}
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>

                      <span className="text-[11px] font-medium text-white/65">
                        Approve ready content
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-3 rounded-xl border p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        borderColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "rgba(247,183,66,0.09)",
                          color: "#F7B742",
                        }}
                      >
                        <IconClock className="h-3.5 w-3.5" />
                      </span>

                      <span className="text-[11px] font-medium text-white/65">
                        Review pending posts
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-3 rounded-xl border p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        borderColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "rgba(36,120,255,0.09)",
                          color: COLOR.blue,
                        }}
                      >
                        <IconMessage className="h-3.5 w-3.5" />
                      </span>

                      <span className="text-[11px] font-medium text-white/65">
                        Leave feedback
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════
                FOOTER
            ═══════════════════════════════════════════════ */}

            <footer className="pt-20 sm:pt-28">
              <div
                className="border-t pt-7"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                      style={{
                        background: COLOR.blue,
                      }}
                    >
                      S
                    </span>

                    <div>
                      <p className="text-[11px] font-semibold text-white/55">
                        Showwork
                      </p>

                      <p className="mt-0.5 text-[9px] text-white/25">
                        Private client workspace
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <a
                      href="#top"
                      className="text-[10px] font-medium text-white/30 transition-colors hover:text-white/70"
                    >
                      Back to top
                    </a>

                    <span className="h-3 w-px bg-white/10" />

                    <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-white/25">
                      <IconLock className="h-3 w-3" />
                      Private
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}