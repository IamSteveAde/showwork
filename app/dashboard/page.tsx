import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import { getCreatorUsage } from "@/lib/subscriptionUsage";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  warmWhite: "#F8F7F4",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

// Simple, dependency-free relative time — "Today", "3 days ago", etc.
// Good enough for a dashboard list; not trying to be a full i18n library.
function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

export default async function DashboardPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const projects = await db.project.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { media: true, viewerEmails: true } } },
  });

  const usage = await getCreatorUsage(creator);
  const liveCount = projects.filter((p) => p.paid || creator.subscriptionActive).length;
  const totalViews = projects.reduce((sum, p) => sum + p.viewCount, 0);
  const totalEmails = projects.reduce((sum, p) => sum + p._count.viewerEmails, 0);
  const firstName = creator.name?.split(" ")[0];

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      {/* ── TOP NAV — sits over the hero, transparent ── */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-20">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-white">
            Show<span style={{ color: COLOR.gold }}>work</span>
          </span>
          <span
            className="hidden text-xs font-medium uppercase text-white/40 sm:inline"
            style={{ letterSpacing: "0.1em" }}
          >
            by Spotlite Africa
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/billing"
            className="hidden rounded-full px-3 py-1.5 text-xs font-semibold sm:inline"
            style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
          >
            {usage.limit === Infinity ? "Unlimited" : `${usage.used}/${usage.limit} this cycle`}
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "rgba(245,200,66,0.18)", color: COLOR.gold }}
            >
              {initials(creator.name, creator.email)}
            </div>
            <span className="text-sm font-medium text-white/80">{creator.name || creator.email}</span>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <section className="relative flex h-[52vh] min-h-[380px] w-full items-end overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.5 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.2) 40%, rgba(10,10,10,0.96) 100%)",
          }}
        />

        <div className="relative z-10 w-full px-6 pb-10 md:px-20 md:pb-14">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="mb-3 text-xs font-semibold uppercase"
                style={{ color: COLOR.gold, letterSpacing: "0.1em" }}
              >
                Dashboard
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
                Welcome back{firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="mt-3 text-base font-normal text-white/60 md:text-lg">
                {projects.length === 0
                  ? "Nothing here yet — create your first delivery."
                  : `${projects.length} project${projects.length === 1 ? "" : "s"} · ${liveCount} live · ${totalViews} view${totalViews === 1 ? "" : "s"} · ${totalEmails} email${totalEmails === 1 ? "" : "s"} captured`}
              </p>
              {!creator.subscriptionActive && (
  <div
    className="mt-6 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between"
    style={{
      background: "rgba(245,200,66,0.08)",
      border: "1px solid rgba(245,200,66,0.25)",
      backdropFilter: "blur(10px)",
    }}
  >
    <div>
      <p
        className="text-xs font-semibold uppercase"
        style={{ color: COLOR.gold, letterSpacing: "0.08em" }}
      >
        Upgrade your workspace
      </p>

      <h3 className="mt-1 text-lg font-bold text-white">
        Unlock unlimited client deliveries
      </h3>

      <p className="mt-1 text-sm text-white/60">
        Upgrade your plan to create more projects, remove limits, and access premium features.
      </p>
    </div>

    <Link
      href="/dashboard/billing"
      className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:scale-[1.03]"
      style={{
        background: COLOR.gold,
        color: COLOR.black,
        boxShadow: "0 10px 30px rgba(245,200,66,0.25)",
      }}
    >
      Upgrade Plan
      <span>→</span>
    </Link>
  </div>
)}
            </div>

            <Link
              href="/dashboard/new"
              className="flex w-fit items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: COLOR.gold, color: COLOR.black }}
            >
              <span className="text-base leading-none">+</span>
              New project
            </Link>
          </div>
        </div>
      </section>

      {/* ── PROJECT LIST ── */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-20">
        {projects.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 rounded-xl px-8 py-20 text-center"
            style={{ background: COLOR.charcoal }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.3)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 4v12M4 10h12"
                  stroke={COLOR.gold}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">No projects yet</p>
              <p className="mt-1 max-w-xs text-sm font-normal text-white/45">
                Every client delivery you create will show up here, ready to send.
              </p>
            </div>
            <Link
              href="/dashboard/new"
              className="mt-2 rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: COLOR.gold, color: COLOR.black }}
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
                <h2 className="text-xl font-semibold text-white">Your projects</h2>
              </div>
              <p className="text-sm text-white/40">
                Click any project below to manage its files, publish it, or see what your client approved.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
              const isLive = project.paid || creator.subscriptionActive;
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/${project.id}`}
                  className="group flex flex-col gap-4 rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: COLOR.charcoal,
                    boxShadow: "0 0 0 1px rgba(248,247,244,0.04)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={
                        isLive
                          ? { background: "rgba(245,200,66,0.15)", color: COLOR.gold }
                          : { background: "rgba(248,247,244,0.06)", color: "rgba(248,247,244,0.4)" }
                      }
                    >
                      {isLive ? "Live" : "Draft"}
                    </span>
                    <span
                      className="text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-white">{project.clientName}</p>
                    <p className="mt-0.5 text-xs font-normal" style={{ color: COLOR.midGray }}>
                      /{project.slug}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between pt-3 text-xs font-normal"
                    style={{ borderTop: "1px solid rgba(248,247,244,0.06)", color: COLOR.midGray }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="1.5" y="2" width="9" height="8" rx="1" stroke={COLOR.midGray} strokeWidth="1" />
                          <path d="M1.5 7.5L4 5l2 2 2.5-2.5L10.5 7" stroke={COLOR.midGray} strokeWidth="1" />
                        </svg>
                        {project._count.media}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M1 6s1.8-3.5 5-3.5S11 6 11 6s-1.8 3.5-5 3.5S1 6 1 6z"
                            stroke={COLOR.midGray}
                            strokeWidth="1"
                          />
                          <circle cx="6" cy="6" r="1.4" stroke={COLOR.midGray} strokeWidth="1" />
                        </svg>
                        {project.viewCount}
                      </span>
                    </div>
                    <span>{relativeTime(project.createdAt)}</span>
                  </div>

                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold"
                    style={{ background: "rgba(245,200,66,0.1)", color: COLOR.gold }}
                  >
                    View project
                    <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}