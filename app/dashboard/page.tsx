import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { PLAN_DISPLAY_NAME } from "@/lib/subscriptionTiers";
import { isAdminEmail } from "@/lib/admin";

const COLOR = {
  ink: "#090A0C",
  blue: "#2478FF",
  blueDeep: "#075BEA",
  paper: "#F7F8FA",
  line: "#E7E9ED",
};

const COMMUNITY_URL =
  "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  return (
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts[1]?.[0] ?? "").toUpperCase()
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortfolioIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle
        cx="8.5"
        cy="9"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3 16l5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeliveryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M15.5 16.5 18 14l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3 9.5h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M7 13h3M14 13h3M7 16.5h3M14 16.5h3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CommunityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="9"
        cy="9"
        r="3"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle
        cx="17"
        cy="10"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3.5 19c.5-3.2 2.5-5 5.5-5s5 1.8 5.5 5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M15 15c2.8 0 4.6 1.4 5 4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.8 13.7 9l6.2 1.7-6.2 1.7-1.7 6.2-1.7-6.2-6.2-1.7L10.3 9 12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridPattern({
  opacity = 0.35,
}: {
  opacity?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        opacity,
        backgroundImage:
          "linear-gradient(rgba(20,30,50,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(20,30,50,0.055) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage:
          "linear-gradient(to bottom right, black 0%, transparent 72%)",
        WebkitMaskImage:
          "linear-gradient(to bottom right, black 0%, transparent 72%)",
      }}
    />
  );
}

function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 h-[320px] w-[320px]"
      aria-hidden
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(36,120,255,0.25) 1px, transparent 1px)",
        backgroundSize: "13px 13px",
        maskImage:
          "linear-gradient(to bottom left, black, transparent 75%)",
        WebkitMaskImage:
          "linear-gradient(to bottom left, black, transparent 75%)",
      }}
    />
  );
}

function AppPill({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase"
      style={{
        letterSpacing: "0.1em",
        background: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.72)",
        color: dark ? "rgba(255,255,255,0.78)" : "#2478FF",
        border: dark
          ? "1px solid rgba(255,255,255,0.13)"
          : "1px solid rgba(36,120,255,0.11)",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </span>
  );
}

function MiniStat({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-semibold tracking-[-0.03em] text-[#101114]">
        {number}
      </span>
      <span className="text-xs text-[#858A93]">{label}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const [portfolio, calendar, projectCount, usage] = await Promise.all([
    db.portfolio.findFirst({
      where: { creatorId: creator.id },
      select: { id: true },
    }),

    db.socialCalendar.findFirst({
      where: { managerId: creator.id },
      select: { id: true },
    }),

    db.project.count({
      where: {
        creatorId: creator.id,
        deletedAt: null,
      },
    }),

    getCreatorUsage(creator),
  ]);

  const firstName = creator.name?.trim().split(" ")[0];
  const planName = PLAN_DISPLAY_NAME[usage.tier];

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8FA] text-[#090A0C]">
      {/* =========================================================
          NAV
      ========================================================== */}
      <header className="sticky top-0 z-50 border-b border-[#E5E8ED]/90 bg-white/90 backdrop-blur-2xl">
  <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:h-[72px] sm:px-7 lg:px-10">
    {/* ─────────────────────────────────────────────────────
        LOGO
    ────────────────────────────────────────────────────── */}
    <Link
      href="/dashboard"
      aria-label="Showwork home"
      className="group flex shrink-0 items-center"
    >
      <div
        role="img"
        aria-label="Showwork"
        className="transition-transform duration-300 group-hover:scale-[1.02]"
        style={{
          height: 21,
          width: 84,
          backgroundColor: COLOR.ink,
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
    </Link>

    {/* ─────────────────────────────────────────────────────
        DESKTOP NAV
    ────────────────────────────────────────────────────── */}
    <div className="hidden items-center gap-1.5 sm:flex sm:gap-2">
      {isAdminEmail(creator.email) && (
        <Link
          href="/admin"
          className="rounded-full px-3 py-2 text-xs font-semibold text-[#747982] transition hover:bg-[#F4F5F7] hover:text-[#0A0A0A]"
        >
          Admin
        </Link>
      )}

      <a
        href="mailto:hello@useshowwork.com?subject=Showwork%20support"
        className="hidden rounded-full px-3 py-2 text-xs font-medium text-[#747982] transition hover:bg-[#F4F5F7] hover:text-[#0A0A0A] md:block"
      >
        Support
      </a>

      <Link
        href="/dashboard/billing"
        className="flex items-center gap-2 rounded-full border border-[#E0E4EA] bg-white px-3.5 py-2 text-xs font-semibold text-[#4C515A] shadow-[0_2px_5px_rgba(0,0,0,0.025)] transition hover:border-[#CBD1DA] hover:shadow-sm"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
        <span>
          Delivery · {planName}
        </span>
      </Link>

      <Link
        href="/dashboard/profile"
        className="group ml-1 flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-[#F3F4F6]"
        aria-label="View profile"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold"
          style={{
            background: creator.avatarUrl ? undefined : "#EDF3FF",
            color: COLOR.blue,
            boxShadow: "0 0 0 1px rgba(36,120,255,0.16)",
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
            initials(creator.name, creator.email)
          )}
        </div>

        <span className="hidden max-w-[130px] truncate text-sm font-medium text-[#454951] lg:block">
          {creator.name || creator.email}
        </span>
      </Link>

      <LogoutButton />
    </div>

    {/* ─────────────────────────────────────────────────────
        MOBILE NAV
    ────────────────────────────────────────────────────── */}
    <div className="flex items-center gap-2 sm:hidden">
      {/* Profile avatar */}
      <Link
        href="/dashboard/profile"
        aria-label="View profile"
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          background: creator.avatarUrl ? undefined : "#EDF3FF",
          color: COLOR.blue,
          boxShadow: "0 0 0 1px rgba(36,120,255,0.16)",
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
          <span className="text-[11px] font-semibold">
            {initials(creator.name, creator.email)}
          </span>
        )}
      </Link>

      {/* CSS-only mobile menu */}
      <details className="relative">
        <summary
          aria-label="Open navigation menu"
          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[#E1E4E9] bg-white text-[#3F444C] shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition hover:border-[#CBD1DA] hover:bg-[#F8F9FB]"
        >
          <span className="sr-only">Open navigation</span>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          >
            <path
              d="M5 7h14M5 12h14M5 17h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </summary>

        {/* Mobile dropdown */}
        <div className="absolute right-0 top-[calc(100%+10px)] w-[calc(100vw-32px)] max-w-[320px] overflow-hidden rounded-2xl border border-[#E1E4E9] bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
          {/* Account identity */}
          <div className="mb-1 border-b border-[#EEF0F3] px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-[#15171A]">
              {creator.name || "Your account"}
            </p>

            <p className="mt-0.5 truncate text-[11px] text-[#9297A0]">
              {creator.email}
            </p>
          </div>

          {/* Admin */}
          {isAdminEmail(creator.email) && (
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#454951] transition hover:bg-[#F5F7FA] hover:text-[#090A0C]"
            >
              <span>Admin</span>

              <ArrowUpRightIcon className="h-4 w-4 text-[#A2A7AF]" />
            </Link>
          )}

          {/* Support */}
          <a
            href="mailto:hello@useshowwork.com?subject=Showwork%20support"
            className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#454951] transition hover:bg-[#F5F7FA] hover:text-[#090A0C]"
          >
            <span>Support</span>

            <ArrowUpRightIcon className="h-4 w-4 text-[#A2A7AF]" />
          </a>

          {/* Billing */}
          <Link
            href="/dashboard/billing"
            className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#454951] transition hover:bg-[#F5F7FA] hover:text-[#090A0C]"
          >
            <span className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />

              <span>Delivery · {planName}</span>
            </span>

            <ArrowUpRightIcon className="h-4 w-4 text-[#A2A7AF]" />
          </Link>

          {/* Profile */}
          <Link
            href="/dashboard/profile"
            className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#454951] transition hover:bg-[#F5F7FA] hover:text-[#090A0C]"
          >
            <span>Account settings</span>

            <ArrowUpRightIcon className="h-4 w-4 text-[#A2A7AF]" />
          </Link>

          {/* Logout */}
          <div className="mt-1 border-t border-[#EEF0F3] px-2 pt-2">
            <div className="rounded-xl px-1 py-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</header>
      {/* =========================================================
          HERO — ART DIRECTED
      ========================================================== */}
      <section className="relative isolate overflow-hidden bg-[#EEF4FF]">
  {/* =========================================================
      ATMOSPHERE
  ========================================================== */}

  {/* Main blue atmospheric glow */}
  <div
    className="pointer-events-none absolute -right-[260px] -top-[300px] h-[820px] w-[820px] rounded-full"
    aria-hidden
    style={{
      background:
        "radial-gradient(circle, rgba(36,120,255,0.26) 0%, rgba(36,120,255,0.12) 28%, rgba(36,120,255,0.035) 52%, transparent 72%)",
    }}
  />

  {/* Secondary violet atmosphere */}
  <div
    className="pointer-events-none absolute -left-[300px] -top-[100px] h-[680px] w-[680px] rounded-full"
    aria-hidden
    style={{
      background:
        "radial-gradient(circle, rgba(91,77,255,0.11) 0%, rgba(91,77,255,0.04) 42%, transparent 70%)",
    }}
  />

  {/* Bottom horizon light */}
  <div
    className="pointer-events-none absolute bottom-[-300px] left-[20%] h-[600px] w-[900px] rounded-full"
    aria-hidden
    style={{
      background:
        "radial-gradient(ellipse, rgba(36,120,255,0.09) 0%, transparent 68%)",
    }}
  />

  {/* =========================================================
      ARCHITECTURAL GRID
  ========================================================== */}

  <div
    className="pointer-events-none absolute inset-0"
    aria-hidden
    style={{
      backgroundImage:
        "linear-gradient(rgba(36,120,255,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(36,120,255,0.065) 1px, transparent 1px)",
      backgroundSize: "44px 44px",
      maskImage:
        "linear-gradient(to bottom right, black 0%, black 42%, transparent 82%)",
      WebkitMaskImage:
        "linear-gradient(to bottom right, black 0%, black 42%, transparent 82%)",
    }}
  />

  {/* Fine secondary grid */}
  <div
    className="pointer-events-none absolute inset-0 opacity-50"
    aria-hidden
    style={{
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
      backgroundSize: "11px 11px",
      maskImage:
        "radial-gradient(circle at 75% 20%, black 0%, transparent 45%)",
      WebkitMaskImage:
        "radial-gradient(circle at 75% 20%, black 0%, transparent 45%)",
    }}
  />

  {/* =========================================================
      LARGE GEOMETRIC ORBIT
  ========================================================== */}

  <div
    className="pointer-events-none absolute -right-[110px] top-[40px] hidden h-[560px] w-[560px] rounded-full border border-[#2478FF]/10 lg:block"
    aria-hidden
  >
    <div className="absolute inset-[42px] rounded-full border border-[#2478FF]/[0.08]" />
    <div className="absolute inset-[88px] rounded-full border border-[#2478FF]/[0.06]" />
    <div className="absolute inset-[138px] rounded-full border border-[#2478FF]/[0.05]" />

    {/* Orbit point */}
    <div className="absolute left-[16%] top-[9%] h-2 w-2 rounded-full bg-[#2478FF] shadow-[0_0_20px_rgba(36,120,255,0.5)]" />

    {/* Orbit point */}
    <div className="absolute bottom-[18%] right-[7%] h-1.5 w-1.5 rounded-full bg-[#2478FF]/50" />
  </div>

  {/* =========================================================
      ABSTRACT CORNER STRUCTURE
  ========================================================== */}

  <div
    className="pointer-events-none absolute right-[9%] top-[18%] hidden h-[190px] w-[190px] rotate-12 rounded-[42px] border border-white/70 bg-white/20 backdrop-blur-[2px] lg:block"
    aria-hidden
  >
    <div className="absolute inset-[18px] rounded-[30px] border border-[#2478FF]/10" />

    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#2478FF]/[0.06]" />

    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#2478FF]/[0.06]" />
  </div>

  {/* =========================================================
      CONTENT
  ========================================================== */}

  <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-14 sm:px-7 md:pb-16 md:pt-20 lg:px-10 lg:pb-20 lg:pt-24">
    <div className="max-w-[1050px]">
      {/* Eyebrow */}
      <div className="mb-7 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CFE0FF] bg-white/75 text-[#2478FF] shadow-[0_5px_20px_rgba(36,120,255,0.08)] backdrop-blur-xl">
          <SparkIcon className="h-4 w-4" />
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
            Showwork / Workspace
          </span>

          <span className="h-1 w-1 rounded-full bg-[#9DBDF5]" />

          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8799B7]">
            Your creative command center
          </span>
        </div>
      </div>

      {/* Main headline */}
      <h1 className="relative text-[47px] font-semibold leading-[0.93] tracking-[-0.065em] text-[#08090A] sm:text-[61px] md:text-[76px] lg:text-[92px]">
        Make the work.
        <br />

        <span className="relative inline-block">
          Move the work.

          <span
            className="absolute -bottom-2 left-0 h-[3px] w-[58%] rounded-full bg-[#2478FF] shadow-[0_0_14px_rgba(36,120,255,0.25)] lg:-bottom-3"
          />
        </span>
      </h1>

      {/* Description + plan */}
      <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <p className="max-w-[620px] text-[15px] leading-7 text-[#626D7E] sm:text-[17px]">
          {firstName ? `Good to have you back, ${firstName}. ` : ""}
          Your creative business has different moving parts. Showwork
          gives each one a place to live, so you can spend less time
          managing the process and more time doing the work.
        </p>

        {/* Plan card */}
        <div className="hidden shrink-0 md:block">
          <div className="rounded-2xl border border-white/80 bg-white/55 px-5 py-3.5 shadow-[0_10px_35px_rgba(30,70,130,0.06)] backdrop-blur-xl">
            <p className="text-right text-[9px] font-bold uppercase tracking-[0.14em] text-[#8995A8]">
              Current plan
            </p>

            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2478FF] shadow-[0_0_10px_rgba(36,120,255,0.4)]" />

              <span className="text-sm font-semibold text-[#252B35]">
                {planName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* =======================================================
        STATS / COMMAND RAIL
    ======================================================== */}

    <div className="mt-14 rounded-2xl border border-white/80 bg-white/45 p-1 shadow-[0_10px_40px_rgba(30,60,110,0.045)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-4 rounded-xl border border-white/60 bg-white/30 px-4 py-4 sm:px-5">
        <MiniStat
          number={String(projectCount)}
          label={projectCount === 1 ? "project" : "projects"}
        />

        <span className="h-1 w-1 rounded-full bg-[#B9C8DD]" />

        <MiniStat
          number={portfolio ? "01" : "—"}
          label="portfolio"
        />

        <span className="h-1 w-1 rounded-full bg-[#B9C8DD]" />

        <MiniStat
          number={calendar ? "01" : "—"}
          label="content workspace"
        />

        <Link
          href="/dashboard/profile"
          className="ml-auto hidden items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3.5 py-2 text-xs font-semibold text-[#687487] shadow-sm transition-all hover:border-[#C7D9F7] hover:bg-white hover:text-[#2478FF] sm:flex"
        >
          Account settings
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </div>

  {/* =========================================================
      BOTTOM TRANSITION
  ========================================================== */}

  <div
    className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
    aria-hidden
    style={{
      background:
        "linear-gradient(to bottom, transparent, rgba(247,248,250,0.8))",
    }}
  />
</section>
      {/* =========================================================
          APPS — CONTENT WORKSPACE LEADS
      ========================================================== */}
      <section className="relative overflow-hidden bg-[#F7F8FA]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-7 md:py-20 lg:px-10 lg:py-24">
          <div className="mb-10 max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
              The Showwork suite
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0A0A0A] sm:text-5xl">
              One workspace for the work
              <br className="hidden sm:block" /> behind the content.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#737982] sm:text-[15px]">
              Start with the environment that keeps your client content moving.
              Then use the rest of Showwork to present your work, deliver projects
              and grow your creative business.
            </p>
          </div>

          {/* =====================================================
              PRIMARY APP — CONTENT WORKSPACE
          ====================================================== */}
          <Link
            href="/dashboard/calendars"
            className="group relative block min-h-[590px] overflow-hidden rounded-[36px] border border-[#D6E0EF] bg-[#EDF4FF] shadow-[0_28px_90px_rgba(30,70,130,0.10)] transition-all duration-500 hover:-translate-y-1 hover:border-[#C7D7ED] hover:shadow-[0_38px_110px_rgba(30,70,130,0.15)]"
          >
            {/* Atmosphere */}
            <div
              className="pointer-events-none absolute -right-[180px] -top-[250px] h-[760px] w-[760px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,0.34) 0%, rgba(36,120,255,0.12) 34%, transparent 69%)",
              }}
            />

            <div
              className="pointer-events-none absolute -bottom-[330px] left-[30%] h-[720px] w-[720px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,0.18), transparent 68%)",
              }}
            />

            {/* Architectural grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.48]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(36,120,255,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(36,120,255,0.075) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
                maskImage:
                  "linear-gradient(to bottom right, black 0%, black 45%, transparent 82%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom right, black 0%, black 45%, transparent 82%)",
              }}
            />

            {/* Large calendar / AI composition */}
            <div className="pointer-events-none absolute right-[-80px] top-[55px] hidden h-[420px] w-[590px] lg:block">
              <div className="absolute right-0 top-0 h-[370px] w-[510px] rotate-[4deg] rounded-[30px] border border-white/80 bg-white/65 p-5 shadow-[0_30px_80px_rgba(30,70,130,0.10)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-2 w-24 rounded-full bg-[#DCE7F7]" />
                    <div className="mt-2 h-2 w-36 rounded-full bg-[#EDF2F8]" />
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
                    <span className="h-2 w-2 rounded-full bg-[#D7E4F7]" />
                    <span className="h-2 w-2 rounded-full bg-[#D7E4F7]" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-[42px] rounded-lg border ${
                        index === 9 || index === 18 || index === 27
                          ? "border-[#AFCBFA] bg-[#EAF2FF]"
                          : "border-[#EEF2F7] bg-white/70"
                      }`}
                    >
                      {(index === 9 || index === 18 || index === 27) && (
                        <div className="m-1.5 h-1.5 w-8 rounded-full bg-[#2478FF]/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI card */}
              <div className="absolute bottom-0 left-0 w-[300px] -rotate-[5deg] rounded-[24px] border border-white/90 bg-[#0A0F18]/95 p-5 text-white shadow-[0_25px_65px_rgba(10,20,40,0.22)]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2478FF]/15 text-[#72A8FF]">
                    <SparkIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#72A8FF]">
                      AI Studio
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-white/75">
                      Client-aware content
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="h-2 w-[88%] rounded-full bg-white/10" />
                  <div className="h-2 w-[68%] rounded-full bg-white/7" />
                  <div className="mt-4 h-8 w-28 rounded-xl bg-[#2478FF]" />
                </div>
              </div>
            </div>

            <div className="relative flex min-h-[590px] flex-col justify-between p-7 sm:p-10 lg:p-12">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-[#2478FF] shadow-[0_8px_24px_rgba(36,120,255,0.08)] backdrop-blur-xl">
                    <WorkspaceIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                      Content Workspace
                    </p>
                    <p className="mt-1 text-[11px] text-[#7C8CA5]">
                      Your ongoing client content command center
                    </p>
                  </div>
                </div>

                <span className="hidden rounded-full border border-[#CFE0FF] bg-white/70 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#2478FF] shadow-sm backdrop-blur-xl sm:inline-flex">
                  Built for social teams
                </span>
              </div>

              <div className="relative max-w-[780px]">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CFE0FF] bg-white/65 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2478FF] backdrop-blur-xl">
                  <SparkIcon className="h-3.5 w-3.5" />
                  Now with AI
                </div>

                <h3 className="max-w-[760px] text-[48px] font-semibold leading-[0.93] tracking-[-0.065em] text-[#080A0D] sm:text-[64px] lg:text-[78px]">
                  Plan content.
                  <br />
                  <span className="text-[#71809A]">Create with AI.</span>
                  <br />
                  Get it approved.
                </h3>

                <p className="mt-7 max-w-[640px] text-[15px] leading-7 text-[#5F6C80] sm:text-[17px]">
                  A dedicated workspace for social media managers, agencies and
                  creative teams managing content for clients. Keep the calendar,
                  creative context, client feedback, approvals and publishing
                  workflow together — and use AI to turn that context into better
                  content ideas and drafts.
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {[
                    "Client content calendar",
                    "AI content generation",
                    "Business knowledge",
                    "Approvals",
                    "Publishing",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/80 bg-white/60 px-3 py-2 text-[10px] font-medium text-[#617087] shadow-sm backdrop-blur-xl"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-5 border-t border-[#C9D6E8] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#8796AA]">
                    Best for
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#3E4B5E]">
                    Social media managers · Agencies · Content teams
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#172131]">
                    {calendar ? "Open your workspace" : "Create a client workspace"}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2478FF] text-white shadow-[0_10px_25px_rgba(36,120,255,0.22)] transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowIcon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* =====================================================
              SECONDARY APPS
          ====================================================== */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* PROJECT DELIVERY */}
            <Link
              href="/dashboard/projects"
              className="group relative min-h-[430px] overflow-hidden rounded-[32px] bg-[#08090B] shadow-[0_25px_80px_rgba(15,20,30,0.10)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_35px_100px_rgba(15,20,30,0.17)]"
            >
              <div
                className="pointer-events-none absolute -right-[130px] -top-[180px] h-[600px] w-[600px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(36,120,255,0.62) 0%, rgba(36,120,255,0.2) 35%, transparent 68%)",
                }}
              />

              <div
                className="pointer-events-none absolute -bottom-[260px] left-[25%] h-[600px] w-[600px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(20,70,180,0.25), transparent 68%)",
                }}
              />

              <div className="pointer-events-none absolute right-[7%] top-[12%] h-[390px] w-[390px] rotate-[24deg] rounded-[80px] border border-white/[0.07]">
                <div className="absolute inset-[35px] rounded-[65px] border border-white/[0.05]" />
                <div className="absolute inset-[70px] rounded-[50px] border border-white/[0.045]" />
              </div>

              <div className="relative flex min-h-[430px] flex-col justify-between p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white">
                    <DeliveryIcon className="h-6 w-6" />
                  </div>
                  <AppPill dark>Project Delivery</AppPill>
                </div>

                <div className="max-w-[620px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#72A8FF]">
                    Client delivery
                  </p>
                  <h3 className="mt-3 text-[42px] font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-[52px]">
                    Deliver work.
                    <br />
                    Get it across the line.
                  </h3>
                  <p className="mt-5 max-w-[560px] text-[14px] leading-6 text-white/45">
                    Present finished work, collect feedback, manage revisions,
                    secure approvals and keep every project moving.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                      Best for
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Creators & creative teams
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      Open Project Delivery
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#08090B] transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* PORTFOLIO */}
            <Link
              href="/dashboard/portfolio"
              className="group relative min-h-[430px] overflow-hidden rounded-[32px] border border-[#E0E3E8] bg-white transition-all duration-500 hover:-translate-y-1 hover:border-[#D3D8E0] hover:shadow-[0_25px_70px_rgba(20,30,45,0.07)]"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-[310px] w-[310px] rounded-full bg-[#EAF1FF]" />

              <div className="pointer-events-none absolute right-10 top-10 h-[230px] w-[230px] rounded-full border border-[#2478FF]/10" />

              <div className="relative flex h-full min-h-[430px] flex-col justify-between p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F6FC] text-[#2478FF]">
                    <PortfolioIcon className="h-6 w-6" />
                  </div>
                  <AppPill>Free</AppPill>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                    Showcase
                  </p>
                  <h3 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#090A0C] sm:text-[48px]">
                    Portfolio
                  </h3>
                  <p className="mt-4 max-w-[500px] text-sm leading-6 text-[#737880]">
                    {portfolio
                      ? "Your portfolio is already live. Keep shaping the way your work is seen."
                      : "Build a polished home for your best work and turn your body of work into an experience."}
                  </p>

                  <div className="mt-7 flex items-center justify-between border-t border-[#E9EBEF] pt-5">
                    <span className="text-xs font-semibold text-[#3E4249]">
                      {portfolio ? "Open your portfolio" : "Create your portfolio"}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5FC] text-[#2478FF] transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* =====================================================
              CREATIVO
          ====================================================== */}
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-5 block overflow-hidden rounded-[32px] bg-[#101114] text-white transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(10,10,15,0.15)]"
          >
            <div
              className="pointer-events-none absolute -right-[100px] -top-[180px] h-[520px] w-[520px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(100,125,255,0.42), rgba(80,90,180,0.1) 38%, transparent 68%)",
              }}
            />

            <div className="pointer-events-none absolute right-[-15px] top-[15px] select-none text-[180px] font-semibold leading-none tracking-[-0.1em] text-white/[0.025] sm:text-[240px]">
              C
            </div>

            <div className="relative flex flex-col gap-9 p-7 sm:p-9 lg:flex-row lg:items-end lg:justify-between lg:p-11">
              <div className="max-w-[760px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white">
                    <CommunityIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#75A8FF]">
                      Creator network
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                      Free
                    </p>
                  </div>
                </div>

                <h3 className="mt-8 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  Creativo Community
                </h3>

                <p className="mt-4 max-w-[620px] text-sm leading-6 text-white/45 sm:text-[15px]">
                  Learn, connect, exchange ideas, discover opportunities and get
                  better at the business behind your craft.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold text-white">
                  Enter Creativo
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#101114] transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowUpRightIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </a>

          {/* =====================================================
              SUPPORT
          ====================================================== */}
          <div className="mt-14 flex flex-col gap-6 border-t border-[#E1E4E9] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#25272B]">
                Need help choosing where to start?
              </p>
              <p className="mt-1 text-xs leading-5 text-[#858A92]">
                If you manage client content, start with Content Workspace.
                If you&apos;re delivering finished work, use Project Delivery.
              </p>
            </div>

            <a
              href="mailto:hello@useshowwork.com?subject=Which%20Showwork%20app%20should%20I%20use?"
              className="group flex w-fit items-center gap-2 rounded-full border border-[#D9DDE3] bg-white px-5 py-2.5 text-xs font-semibold text-[#383C43] shadow-[0_2px_5px_rgba(0,0,0,0.025)] transition-all hover:border-[#C7CDD6] hover:shadow-sm"
            >
              Talk to support
              <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="border-t border-[#E3E5E9] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <div
              role="img"
              aria-label="Showwork"
              style={{
                height: 16,
                width: 64,
                backgroundColor: "#8D929A",
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

            <span className="text-xs text-[#A8ADB5]">
              Tools for modern creators.
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="mailto:hello@useshowwork.com"
              className="text-xs text-[#858A92] transition-colors hover:text-[#2478FF]"
            >
              hello@useshowwork.com
            </a>

            <span className="hidden h-3 w-px bg-[#DDE0E5] sm:block" />

            <Link
              href="/dashboard/profile"
              className="text-xs text-[#858A92] transition-colors hover:text-[#2478FF]"
            >
              Account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}