import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import DashboardProjectList from "@/components/DashboardProjectList";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { TIERS, PaidTier, Tier, PLAN_DISPLAY_NAME, NEXT_TIER } from "@/lib/subscriptionTiers";
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

const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

const PAGE_SIZE = 12;
const SHARED_DISPLAY_LIMIT = 12;

// ─────────────────────────────────────────────
// Custom line icons — thin stroke, single color, consistent geometry.
// No emoji anywhere on this page — emoji renders inconsistently
// across devices and reads as unfinished on a premium product.
// ─────────────────────────────────────────────
function IconPortfolio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTarget({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconSliders({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 6h9M17 6h3M4 18h3M11 18h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="13" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M9.5 14.5l5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M8 16.5l-1.8 1.8a3.5 3.5 0 0 1-5-5L3 11.5M16 7.5l1.8-1.8a3.5 3.5 0 0 1 5 5L21 12.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTrophy({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 14v3M9 20h6M9.5 17h5l.5 3H9l.5-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

// The actual Creativo logo, colored via CSS mask so it renders
// correctly regardless of the source file's own internal colors —
// same technique as the Showwork wordmark. White here since it sits
// on the blue gradient buttons.
function CreativoLogo({ size = 16 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Creativo"
      style={{
        display: "inline-block",
        height: size,
        width: size,
        backgroundColor: "#FFFFFF",
        WebkitMaskImage: "url(/images/logo/creativo.svg)",
        maskImage: "url(/images/logo/creativo.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export default async function DashboardPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  // Initial data for the very first paint only — computed exactly the
  // same way /api/dashboard/projects computes it, so there's no
  // loading flash on page load. Every search keystroke and page click
  // after this happens client-side against that API instead.
  const ownedWhere = { creatorId: creator.id, deletedAt: null };
  const totalCount = await db.project.count({ where: ownedWhere });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const ownedProjects = await db.project.findMany({
    where: ownedWhere,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { _count: { select: { media: true, viewerEmails: true } } },
  });

  const collaboratorMemberships = await db.projectCollaborator.findMany({
    where: { creatorId: creator.id, project: { deletedAt: null } },
    orderBy: { addedAt: "desc" },
    take: SHARED_DISPLAY_LIMIT + 1,
    include: {
      project: {
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { media: true } },
        },
      },
    },
  });
  const sharedProjects = collaboratorMemberships.slice(0, SHARED_DISPLAY_LIMIT).map((c) => c.project);
  const hasMoreShared = collaboratorMemberships.length > SHARED_DISPLAY_LIMIT;

  // Managed projects this creator can see — owned or collaborating,
  // combined into one list. Each carries its linked delivery's id
  // (for the smart link once published) and a raw task-status list
  // (to compute a quick completion count without a separate query).
  const [ownedManagedProjects, collaboratingManagedProjects] = await Promise.all([
    db.managedProject.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      include: {
        deliveryProject: { select: { id: true } },
        tasks: { select: { status: true } },
      },
    }),
    db.managedProject.findMany({
      where: { collaborators: { some: { creatorId: creator.id } } },
      orderBy: { createdAt: "desc" },
      include: {
        deliveryProject: { select: { id: true } },
        tasks: { select: { status: true } },
        creator: { select: { name: true, email: true } },
      },
    }),
  ]);
  const managedProjects = [
    ...ownedManagedProjects.map((mp) => ({ ...mp, role: "owner" as const, ownerLabel: null as string | null })),
    ...collaboratingManagedProjects.map((mp) => ({
      ...mp,
      role: "collaborator" as const,
      ownerLabel: mp.creator.name || mp.creator.email,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const allProjectsForStats = await db.project.findMany({
    where: { creatorId: creator.id, deletedAt: null },
    select: { viewCount: true, _count: { select: { viewerEmails: true } } },
  });
  const usage = await getCreatorUsage(creator);
  const liveCount = totalCount;
  const totalViews = allProjectsForStats.reduce((sum, p) => sum + p.viewCount, 0);
  const totalEmails = allProjectsForStats.reduce((sum, p) => sum + p._count.viewerEmails, 0);
  const firstName = creator.name?.split(" ")[0];

  const planName = PLAN_DISPLAY_NAME[usage.tier];
  const nextTier = NEXT_TIER[usage.tier];
  const nextTierInfo = nextTier ? TIERS[nextTier] : null;

  const nearCap =
    usage.limit !== Infinity && usage.remaining <= Math.max(1, Math.ceil(usage.limit * 0.2));
  const atCap = usage.limit !== Infinity && usage.remaining <= 0;

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      {/* ── TOP NAV ── */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-20">
        <div
          role="img"
          aria-label="Showwork"
          style={{
            height: 22,
            width: 22 * 4,
            backgroundColor: COLOR.blue,
            WebkitMaskImage: "url(/images/logo/sw.svg)",
            maskImage: "url(/images/logo/sw.svg)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "left center",
            maskPosition: "left center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />

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
            style={{ background: "rgba(36,120,255,0.15)", color: COLOR.blue }}
          >
            <span className="font-bold">{planName}</span>
            <span className="text-white/40">·</span>
            {usage.limit === Infinity ? "Unlimited" : `${usage.used}/${usage.limit} this cycle`}
          </Link>

          <Link
            href="/dashboard/profile"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:flex"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          >
            View profile
            <span aria-hidden>→</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="group flex items-center gap-3"
            aria-label="View profile"
          >
            <div
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-semibold transition-transform group-hover:scale-110 sm:h-8 sm:w-8"
              style={{
                background: creator.avatarUrl ? undefined : "rgba(36,120,255,0.18)",
                color: COLOR.blue,
                boxShadow: `0 0 0 2px rgba(36,120,255,0.5)`,
              }}
            >
              {creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(creator.name, creator.email)
              )}
            </div>
            <span className="hidden text-sm font-medium text-white/80 transition-colors group-hover:text-white sm:inline">
              {creator.name || creator.email}
            </span>
          </Link>

          <LogoutButton />
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <section className="relative flex min-h-[720px] w-full items-end overflow-hidden md:min-h-[520px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero1.png" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.2) 40%, rgba(10,10,10,0.96) 100%)" }}
        />

        <div className="relative z-10 w-full px-6 pb-16 md:px-20 md:pb-14">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
                Dashboard
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
                Welcome back{firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="mt-3 text-base font-normal text-white/60 md:text-lg">
                {totalCount === 0
                  ? "Nothing here yet — create your first delivery."
                  : `${totalCount} project${totalCount === 1 ? "" : "s"} · ${liveCount} live · ${totalViews} view${totalViews === 1 ? "" : "s"} · ${totalEmails} email${totalEmails === 1 ? "" : "s"} captured`}
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{planName} plan</span>
                  <span className="text-sm text-white/40">
                    {usage.limit === Infinity
                      ? "Unlimited projects"
                      : `${usage.used} of ${usage.limit} projects used this cycle`}
                  </span>
                </div>
                {usage.limit !== Infinity && (
                  <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                        background: atCap ? "#F97316" : COLOR.blue,
                      }}
                    />
                  </div>
                )}
              </div>

              {(nearCap || atCap) && nextTierInfo && (
                <div
                  className="mt-5 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    background: atCap ? "rgba(249,115,22,0.1)" : "rgba(36,120,255,0.08)",
                    border: atCap ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(36,120,255,0.25)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div>
                    <p
                      className="text-xs font-semibold uppercase"
                      style={{ color: atCap ? "#fdba74" : COLOR.blue, letterSpacing: "0.08em" }}
                    >
                      {atCap ? "You've reached your limit" : "Almost there"}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">
                      {atCap
                        ? `You've used all ${usage.limit} projects on ${planName} this cycle.`
                        : `Only ${usage.remaining} project${usage.remaining === 1 ? "" : "s"} left on ${planName}.`}
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      Move up to {nextTierInfo.name}
                      {nextTierInfo.limit === Infinity ? " for unlimited projects" : ` for up to ${nextTierInfo.limit} a month`} — ₦{nextTierInfo.priceNgnMonthly.toLocaleString()}/mo.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/billing"
                    className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.03]"
                    style={{ background: COLOR.gradient, boxShadow: "0 10px 30px rgba(36,120,255,0.25)" }}
                  >
                    Upgrade to {nextTierInfo.name}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:items-end">
              <Link
                href="/dashboard/start"
                className="flex w-fit items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: COLOR.gradient }}
              >
                <span className="text-base leading-none">+</span>
                New project
              </Link>
              <Link
                href="/dashboard/portfolio"
                className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <IconPortfolio className="h-4 w-4" />
                Create your portfolio
              </Link>
              <a
                href={COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <CreativoLogo size={16} />
                Join Creativo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROJECT LIST — search, grids, and pagination are all
          handled client-side from here, updating live as you type
          rather than needing a page reload. ── */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-20">
        <DashboardProjectList
          initialData={{
            ownedProjects: ownedProjects.map((p) => ({
              id: p.id,
              clientName: p.clientName,
              slug: p.slug,
              createdAt: p.createdAt.toISOString(),
              viewCount: p.viewCount,
              _count: p._count,
            })),
            totalCount,
            totalPages,
            currentPage: 1,
            sharedProjects: sharedProjects.map((p) => ({
              id: p.id,
              clientName: p.clientName,
              createdAt: p.createdAt.toISOString(),
              creator: p.creator,
              _count: p._count,
            })),
            hasMoreShared,
          }}
        />

        {/* ── MANAGED PROJECTS — briefs, tasks, and internal review,
             separate from the delivery list above. The link is smart:
             an unpublished project takes you back to keep managing it
             (brief/tasks/review); once published, there's nothing
             left to manage internally, so it goes straight to the
             real delivery page instead, where client feedback is
             what actually matters now. ── */}
        {managedProjects.length > 0 && (
          <div className="mt-14">
            <div className="mb-8 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-[3px] w-10" style={{ background: COLOR.blue }} aria-hidden />
                <h2 className="text-xl font-semibold text-white">Managed projects</h2>
              </div>
              <p className="text-sm text-white/40">
                Briefs, tasks, and internal review — separate from your deliveries above.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managedProjects.map((mp) => {
                const doneCount = mp.tasks.filter((t) => t.status === "DONE").length;
                const totalCount = mp.tasks.length;
                const isPublished = !!mp.publishedAt;
                // Smart link: still managing it internally, or already
                // live for the client — whichever is actually useful
                // to land on right now.
                const href = isPublished && mp.deliveryProject
                  ? `/dashboard/${mp.deliveryProject.id}`
                  : `/dashboard/managed/${mp.id}`;

                return (
                  <Link
                    key={mp.id}
                    href={href}
                    className="group relative flex flex-col gap-4 rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5"
                    style={{ background: COLOR.charcoal, boxShadow: "0 0 0 1px rgba(36,120,255,0.1)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={
                          isPublished
                            ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                            : { background: "rgba(36,120,255,0.15)", color: COLOR.blue }
                        }
                      >
                        {isPublished ? "Published" : "In progress"}
                      </span>
                      {mp.role === "collaborator" && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(255,204,0,0.12)", color: COLOR.accent }}>
                          Collaborator
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-white">{mp.name}</p>
                      {mp.ownerLabel && (
                        <p className="mt-0.5 text-xs font-normal" style={{ color: COLOR.midGray }}>
                          Owned by {mp.ownerLabel}
                        </p>
                      )}
                    </div>

                    {totalCount > 0 && (
                      <div>
                        <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((doneCount / totalCount) * 100)}%`, background: COLOR.blue }}
                          />
                        </div>
                        <p className="text-xs" style={{ color: COLOR.midGray }}>
                          {doneCount} of {totalCount} tasks done
                        </p>
                      </div>
                    )}

                    <div
                      className="mt-auto flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold"
                      style={{ background: "rgba(36,120,255,0.1)", color: COLOR.blue }}
                    >
                      {isPublished ? "View delivery" : "Continue managing"}
                      <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* SUPPORT */}
        <div
          className="mt-12 flex flex-col items-center gap-3 rounded-xl p-6 text-center sm:flex-row sm:justify-between sm:text-left"
          style={{ background: COLOR.charcoal }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Need a hand with something?</p>
            <p className="mt-1 text-xs text-white/40">We reply within 5 hours.</p>
          </div>
          <a
            href="mailto:hello@useshowwork.com?subject=Showwork%20support"
            className="flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{ background: "rgba(36,120,255,0.12)", color: COLOR.blue }}
          >
            Contact support
            <span aria-hidden>→</span>
          </a>
        </div>

        {/* ── COMMUNITY ── */}
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: COLOR.charcoal }}>
          <div className="grid sm:grid-cols-2">
            <div className="relative min-h-[220px] sm:min-h-full" style={{ background: "#111111" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/com.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.9 }} />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to right, transparent 0%, rgba(26,26,26,0.35) 100%)" }}
              />
            </div>

            <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
                  Creativo · Powered by Showwork
                </p>
                <h2 className="text-2xl font-bold text-white">You don&apos;t have to figure this out alone.</h2>
                <p className="mt-2 text-sm text-white/50">
                  Creativo is a free community for creators — not just Showwork users. It&apos;s where you get real answers on the parts of the job nobody else teaches you.
                </p>
              </div>

              <ul className="flex flex-col gap-3 text-sm text-white/70">
                <li className="flex items-start gap-2.5">
                  <IconTarget className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLOR.blue }} />
                  <span><strong className="text-white">Better clients & positioning</strong> — how to find clients worth taking, position yourself with confidence, and stand out in a crowded market.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <IconSliders className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLOR.blue }} />
                  <span><strong className="text-white">Pricing & craft</strong> — what to actually charge, how to say your rate without flinching, plus editing techniques and the software other creators swear by.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <IconLink className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLOR.blue }} />
                  <span><strong className="text-white">Referrals between creators</strong> — when someone in the community needs what you do, your name comes up first.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <IconTrophy className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLOR.blue }} />
                  <span>
                    <strong className="text-white">Creator Challenges</strong> — the top 3 each round win real monetary prizes and get spotlighted across all our platforms, putting your work in front of a much bigger audience.
                  </span>
                </li>
              </ul>

              <a
                href={COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: COLOR.gradient }}
              >
                <CreativoLogo size={16} />
                Join Creativo
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}