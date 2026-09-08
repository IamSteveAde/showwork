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
      <header className="sticky top-0 z-50 border-b border-[#E5E8ED]/90 bg-white/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-7 lg:px-10">
          <Link
            href="/dashboard"
            aria-label="Showwork home"
            className="group flex items-center"
          >
            <div
              role="img"
              aria-label="Showwork"
              className="transition-transform duration-300 group-hover:scale-[1.02]"
              style={{
                height: 22,
                width: 88,
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

          <div className="flex items-center gap-1.5 sm:gap-3">
            {isAdminEmail(creator.email) && (
              <Link
                href="/admin"
                className="hidden rounded-full px-3 py-2 text-xs font-semibold text-[#747982] transition hover:bg-[#F4F5F7] hover:text-[#0A0A0A] sm:block"
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
              className="hidden items-center gap-2 rounded-full border border-[#E0E4EA] bg-white px-3.5 py-2 text-xs font-semibold text-[#4C515A] shadow-[0_2px_5px_rgba(0,0,0,0.025)] transition hover:border-[#CBD1DA] hover:shadow-sm sm:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
              Delivery · {planName}
            </Link>

            <Link
              href="/dashboard/profile"
              className="group flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-[#F3F4F6]"
              aria-label="View profile"
            >
              <div
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold"
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
        </div>
      </header>

      {/* =========================================================
          HERO — ART DIRECTED
      ========================================================== */}
      <section className="relative overflow-hidden bg-white">
        {/* oversized glow */}
        <div
          className="pointer-events-none absolute -right-[180px] -top-[260px] h-[720px] w-[720px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,0.17) 0%, rgba(36,120,255,0.06) 35%, transparent 68%)",
          }}
        />

        <div
          className="pointer-events-none absolute -left-[220px] top-[170px] h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(102,76,255,0.065) 0%, transparent 68%)",
          }}
        />

        <GridPattern opacity={0.75} />
        <DotPattern />

        {/* giant decorative ring */}
        <div
          className="pointer-events-none absolute right-[7%] top-[18%] hidden h-[310px] w-[310px] rounded-full border border-[#2478FF]/10 lg:block"
          aria-hidden
        >
          <div className="absolute inset-[30px] rounded-full border border-[#2478FF]/[0.07]" />
          <div className="absolute inset-[62px] rounded-full border border-[#2478FF]/[0.05]" />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-14 sm:px-7 md:pb-16 md:pt-20 lg:px-10 lg:pb-20 lg:pt-24">
          <div className="max-w-[1050px]">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE7FC] bg-white text-[#2478FF] shadow-sm">
                <SparkIcon className="h-4 w-4" />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                Showwork / Workspace
              </span>
            </div>

            <h1 className="text-[47px] font-semibold leading-[0.95] tracking-[-0.065em] text-[#08090A] sm:text-[61px] md:text-[76px] lg:text-[92px]">
              Make the work.
              <br />
              <span className="relative inline-block">
                Move the work.
                <span className="absolute -bottom-2 left-0 h-[3px] w-[58%] rounded-full bg-[#2478FF] opacity-70 lg:-bottom-3" />
              </span>
            </h1>

            <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <p className="max-w-[620px] text-[15px] leading-7 text-[#6E737C] sm:text-[17px]">
                {firstName ? `Good to have you back, ${firstName}. ` : ""}
                Your creative business has different moving parts. Showwork
                gives each one a place to live, so you can spend less time
                managing the process and more time doing the work.
              </p>

              <div className="hidden shrink-0 md:block">
                <p className="text-right text-[10px] font-semibold uppercase tracking-[0.13em] text-[#A0A5AC]">
                  Current plan
                </p>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
                  <span className="text-sm font-semibold text-[#25272B]">
                    {planName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* stats rail */}
          <div className="mt-14 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-[#E6E8EC] pt-5">
            <MiniStat
              number={String(projectCount)}
              label={projectCount === 1 ? "project" : "projects"}
            />

            <span className="h-1 w-1 rounded-full bg-[#CDD1D7]" />

            <MiniStat
              number={portfolio ? "01" : "—"}
              label="portfolio"
            />

            <span className="h-1 w-1 rounded-full bg-[#CDD1D7]" />

            <MiniStat
              number={calendar ? "01" : "—"}
              label="content workspace"
            />

            <Link
              href="/dashboard/profile"
              className="ml-auto hidden items-center gap-2 text-xs font-semibold text-[#737780] transition hover:text-[#2478FF] sm:flex"
            >
              Account settings
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          APPS
      ========================================================== */}
      <section className="relative overflow-hidden bg-[#F7F8FA]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-7 md:py-20 lg:px-10 lg:py-24">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                The Showwork suite
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#0A0A0A] sm:text-4xl">
                Pick your next move.
              </h2>
            </div>

            <p className="max-w-[370px] text-sm leading-6 text-[#858A92]">
              Four focused environments. One creative business. Jump into the
              space that matches what you&apos;re doing right now.
            </p>
          </div>

          {/* =====================================================
              HERO APP — DELIVERY
          ====================================================== */}
          <Link
            href="/dashboard/projects"
            className="group relative block min-h-[520px] overflow-hidden rounded-[32px] bg-[#08090B] shadow-[0_25px_80px_rgba(15,20,30,0.11)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_35px_100px_rgba(15,20,30,0.17)]"
          >
            {/* BLUE LIGHT */}
            <div
              className="pointer-events-none absolute -right-[130px] -top-[180px] h-[600px] w-[600px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,0.62) 0%, rgba(36,120,255,0.2) 35%, transparent 68%)",
              }}
            />

            {/* SECOND LIGHT */}
            <div
              className="pointer-events-none absolute -bottom-[260px] left-[25%] h-[600px] w-[600px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(20,70,180,0.25), transparent 68%)",
              }}
            />

            {/* diagonal architecture */}
            <div
              className="pointer-events-none absolute right-[7%] top-[12%] h-[390px] w-[390px] rotate-[24deg] rounded-[80px] border border-white/[0.07]"
              aria-hidden
            >
              <div className="absolute inset-[35px] rounded-[65px] border border-white/[0.05]" />
              <div className="absolute inset-[70px] rounded-[50px] border border-white/[0.045]" />
            </div>

            {/* grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
                maskImage:
                  "linear-gradient(to bottom right, black, transparent 70%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom right, black, transparent 70%)",
              }}
            />

            <div className="relative flex min-h-[520px] flex-col justify-between p-7 sm:p-10 lg:p-12">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white backdrop-blur-xl">
                  <DeliveryIcon className="h-6 w-6" />
                </div>

                <AppPill dark>{planName}</AppPill>
              </div>

              <div className="max-w-[760px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#72A8FF]">
                  Client delivery
                </p>

                <h3 className="mt-3 text-[46px] font-semibold leading-[0.95] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[70px]">
                  Deliver work.
                  <br />
                  Get it across the line.
                </h3>

                <p className="mt-6 max-w-[570px] text-[14px] leading-6 text-white/50 sm:text-[15px]">
                  Send work through a premium client experience, collect
                  feedback, manage revisions, secure approvals and keep every
                  project moving.
                </p>
              </div>

              <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                      Projects
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      {projectCount} active in your account
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                      Built for
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Creators &amp; creative teams
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    Open Project Delivery
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#08090B] transition-transform duration-300 group-hover:translate-x-1">
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
            {/* PORTFOLIO */}
            <Link
              href="/dashboard/portfolio"
              className="group relative min-h-[430px] overflow-hidden rounded-[32px] border border-[#E0E3E8] bg-white transition-all duration-500 hover:-translate-y-1 hover:border-[#D3D8E0] hover:shadow-[0_25px_70px_rgba(20,30,45,0.07)]"
            >
              {/* cream / blue composition */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-[310px] w-[310px] rounded-full bg-[#EAF1FF]" />

              <div
                className="pointer-events-none absolute right-10 top-10 h-[230px] w-[230px] rounded-full border-[1px] border-[#2478FF]/10"
                aria-hidden
              />

              <div
                className="pointer-events-none absolute right-[65px] top-[65px] h-[180px] w-[180px] rounded-full border-[1px] border-[#2478FF]/[0.07]"
                aria-hidden
              />

              <div className="relative flex h-full min-h-[430px] flex-col justify-between p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F6FC] text-[#2478FF]">
                    <PortfolioIcon className="h-6 w-6" />
                  </div>

                  <AppPill>Free</AppPill>
                </div>

                <div className="relative">
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

            {/* CONTENT WORKSPACE */}
            <Link
              href="/dashboard/calendars"
              className="group relative min-h-[430px] overflow-hidden rounded-[32px] border border-[#DDE3ED] bg-[#F0F5FC] transition-all duration-500 hover:-translate-y-1 hover:border-[#CDD6E5] hover:shadow-[0_25px_70px_rgba(20,30,45,0.07)]"
            >
              {/* architectural background */}
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(36,120,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(36,120,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  maskImage:
                    "linear-gradient(to bottom right, black, transparent 78%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom right, black, transparent 78%)",
                }}
              />

              <div
                className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(36,120,255,0.25), transparent 67%)",
                }}
              />

              {/* floating interface cards */}
              <div className="pointer-events-none absolute right-7 top-8 hidden w-[180px] rotate-[4deg] rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_18px_45px_rgba(30,70,130,0.09)] backdrop-blur-xl sm:block">
                <div className="flex items-center justify-between">
                  <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
                  <span className="text-[7px] font-semibold uppercase tracking-wider text-[#9AA2AF]">
                    Content
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="h-2 w-20 rounded-full bg-[#E7ECF4]" />
                  <div className="h-2 w-28 rounded-full bg-[#EDF1F6]" />
                  <div className="h-2 w-16 rounded-full bg-[#EDF1F6]" />
                </div>
              </div>

              <div className="relative flex h-full min-h-[430px] flex-col justify-between p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75 text-[#2478FF] shadow-sm backdrop-blur-xl">
                    <WorkspaceIcon className="h-6 w-6" />
                  </div>

                  <AppPill>For teams</AppPill>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                    Social media
                  </p>

                  <h3 className="mt-2 max-w-[550px] text-4xl font-semibold tracking-[-0.05em] text-[#090A0C] sm:text-[48px]">
                    Content
                    <br />
                    Workspace
                  </h3>

                  <p className="mt-4 max-w-[500px] text-sm leading-6 text-[#687488]">
                    {calendar
                      ? "Your client workspace is ready. Keep planning, presenting and approving content in one ongoing space."
                      : "Give every client an ongoing content space where your team can plan, present and get work approved."}
                  </p>

                  <div className="mt-7 flex items-center justify-between border-t border-[#D9E1EC] pt-5">
                    <span className="text-xs font-semibold text-[#3E4652]">
                      {calendar
                        ? "Open content workspace"
                        : "Create a client workspace"}
                    </span>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2478FF] shadow-sm transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* =====================================================
              CREATIVO — DISTINCTIVE COMMUNITY AREA
          ====================================================== */}
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-5 block overflow-hidden rounded-[32px] bg-[#101114] text-white transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(10,10,15,0.15)]"
          >
            {/* abstract color field */}
            <div
              className="pointer-events-none absolute -right-[100px] -top-[180px] h-[520px] w-[520px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(100,125,255,0.42), rgba(80,90,180,0.1) 38%, transparent 68%)",
              }}
            />

            <div
              className="pointer-events-none absolute -bottom-[220px] left-[35%] h-[500px] w-[500px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,0.24), transparent 68%)",
              }}
            />

            {/* oversized typography texture */}
            <div
              className="pointer-events-none absolute right-[-15px] top-[15px] select-none text-[180px] font-semibold leading-none tracking-[-0.1em] text-white/[0.025] sm:text-[240px]"
              aria-hidden
            >
              C
            </div>

            <div className="relative flex flex-col gap-9 p-7 sm:p-9 lg:flex-row lg:items-end lg:justify-between lg:p-11">
              <div className="max-w-[760px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white backdrop-blur-xl">
                    <CommunityIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#75A8FF]">
                      Creator network
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-white/25" />
                      <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                        Free
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="mt-8 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  Creativo Community
                </h3>

                <p className="mt-4 max-w-[620px] text-sm leading-6 text-white/45 sm:text-[15px]">
                  A place for creators to learn, connect, exchange ideas,
                  discover opportunities and become better at the business
                  behind their craft.
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
                Need a hand choosing your next move?
              </p>

              <p className="mt-1 text-xs leading-5 text-[#858A92]">
                Tell us what you&apos;re trying to accomplish and we&apos;ll
                point you in the right direction.
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