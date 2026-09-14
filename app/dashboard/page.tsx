import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { PLAN_DISPLAY_NAME } from "@/lib/subscriptionTiers";
import { isAdminEmail } from "@/lib/admin";

const COMMUNITY_URL =
  "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  return (
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts[1]?.[0] ?? "").toUpperCase()
  );
}

/* -------------------------------------------------------------------------- */
/*                                   ICONS                                    */
/* -------------------------------------------------------------------------- */

function ArrowIcon({
  className = "h-4 w-4",
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
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon({
  className = "h-4 w-4",
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
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({
  className = "h-4 w-4",
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

function PortfolioIcon({
  className = "h-5 w-5",
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
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <circle
        cx="8.5"
        cy="9"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M3 16l5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeliveryIcon({
  className = "h-5 w-5",
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
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="m15.5 16.5 2.5-2.5 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceIcon({
  className = "h-5 w-5",
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
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M3 9.5h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M7 13h3M14 13h3M7 16.5h3M14 16.5h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CommunityIcon({
  className = "h-5 w-5",
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
      <circle
        cx="9"
        cy="9"
        r="3"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <circle
        cx="17"
        cy="10"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M3.5 19c.5-3.2 2.5-5 5.5-5s5 1.8 5.5 5M15 15c2.8 0 4.6 1.4 5 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   LOGO                                     */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <div
      role="img"
      aria-label="Showwork"
      className="h-[20px] w-[80px]"
      style={{
        backgroundColor: "#090A0C",
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
  );
}

/* -------------------------------------------------------------------------- */
/*                              DASHBOARD PAGE                                */
/* -------------------------------------------------------------------------- */

export default async function DashboardPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const [portfolio, calendar, projectCount, usage] = await Promise.all([
    db.portfolio.findFirst({
      where: {
        creatorId: creator.id,
      },
      select: {
        id: true,
      },
    }),

    db.socialCalendar.findFirst({
      where: {
        managerId: creator.id,
      },
      select: {
        id: true,
      },
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
  const admin = isAdminEmail(creator.email);

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#101114]">
      {/* ------------------------------------------------------------------ */}
      {/*                              NAVBAR                                */}
      {/* ------------------------------------------------------------------ */}

      <header className="sticky top-0 z-50 border-b border-[#E8EAEE] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-[70px]">
            {/* Logo */}
            <Link
              href="/dashboard"
              aria-label="Showwork dashboard"
              className="shrink-0"
            >
              <Logo />
            </Link>

            {/* ------------------------------------------------------------ */}
            {/*                        DESKTOP NAV                            */}
            {/* ------------------------------------------------------------ */}

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/dashboard/profile"
                className="rounded-full px-3.5 py-2 text-[11px] font-semibold text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] hover:text-[#101114]"
              >
                Profile
              </Link>

              {admin && (
                <Link
                  href="/admin"
                  className="rounded-full px-3.5 py-2 text-[11px] font-semibold text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] hover:text-[#101114]"
                >
                  Admin
                </Link>
              )}

              <Link
                href="/dashboard/billing"
                className="rounded-full border border-[#E1E4E9] bg-white px-3.5 py-2 text-[11px] font-semibold text-[#555B65] transition-colors duration-150 hover:border-[#CBD1DA] hover:bg-[#F9FAFB] hover:text-[#101114]"
              >
                Billing
              </Link>

              {/* Avatar */}
              <Link
                href="/dashboard/profile"
                className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#EDF3FF] text-[11px] font-bold text-[#2478FF] ring-1 ring-[#D8E6FF]"
                aria-label="Profile"
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
              </Link>

              <div className="ml-1">
                <LogoutButton />
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/*                         MOBILE NAV                            */}
            {/* ------------------------------------------------------------ */}

            <div className="flex items-center gap-2 sm:hidden">
              {/* Mobile avatar */}
              <Link
                href="/dashboard/profile"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#EDF3FF] text-[11px] font-bold text-[#2478FF] ring-1 ring-[#D8E6FF]"
                aria-label="Profile"
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
              </Link>

              {/* Native mobile menu */}
              <details className="relative">
                <summary
                  aria-label="Open navigation menu"
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[#E1E4E9] bg-white text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] [&::-webkit-details-marker]:hidden"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-[18px] w-[18px]"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </summary>

                <div className="absolute right-0 top-[calc(100%+10px)] w-[230px] overflow-hidden rounded-[20px] border border-[#E2E5E9] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
                  {/* Account */}
                  <div className="border-b border-[#ECEEF1] px-3 pb-3 pt-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#A0A5AD]">
                      Account
                    </p>

                    <p className="mt-1 truncate text-[12px] font-semibold text-[#25282D]">
                      {creator.name?.trim() || creator.email}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-[#9298A1]">
                      {creator.email}
                    </p>
                  </div>

                  {/* Navigation */}
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] hover:text-[#101114]"
                    >
                      <span>Profile</span>

                      <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#A0A5AD]" />
                    </Link>

                    {admin && (
                      <Link
                        href="/admin"
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] hover:text-[#101114]"
                      >
                        <span>Admin</span>

                        <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#A0A5AD]" />
                      </Link>
                    )}

                    <Link
                      href="/dashboard/billing"
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#555B65] transition-colors duration-150 hover:bg-[#F5F6F8] hover:text-[#101114]"
                    >
                      <span>Billing</span>

                      <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#A0A5AD]" />
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-[#ECEEF1] px-2 pb-1 pt-2">
                    <div className="flex justify-center">
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*                              CONTENT                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6 lg:px-8">
        {/* Compact orientation header */}
        <section className="pt-10 sm:pt-14 lg:pt-16">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D9E6FF] bg-[#F1F6FF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                <SparkIcon className="h-3.5 w-3.5" />

                Your workspace
              </div>

              <h1 className="mt-5 text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[58px]">
                {firstName
                  ? `Good to see you, ${firstName}.`
                  : "Good to see you."}
              </h1>

              <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#69717D] sm:text-[16px]">
                Everything you use to run your creative work, in one place.
                Pick an app and get straight to work.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#7B828D]">
              <span className="h-2 w-2 rounded-full bg-[#2478FF]" />

              <span>
                {projectCount}{" "}
                {projectCount === 1 ? "project" : "projects"}
              </span>

              <span className="text-[#C4C8CE]">·</span>

              <span>
                {calendar
                  ? "Content workspace ready"
                  : "No content workspace yet"}
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*                                APPS                               */}
        {/* ---------------------------------------------------------------- */}

        <section className="mt-10 sm:mt-12">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#969CA5]">
                Apps
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                Choose where to work
              </h2>
            </div>

            <span className="hidden text-xs text-[#969CA5] sm:block">
              4 environments
            </span>
          </div>

          {/* Featured workspace */}
          <Link
            href="/dashboard/calendars"
            className="group relative block overflow-hidden rounded-[28px] border border-[#CFE0FF] bg-[#EEF5FF] shadow-[0_18px_55px_rgba(36,120,255,0.08)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#B9D1FA] hover:shadow-[0_24px_70px_rgba(36,120,255,0.12)]"
          >
            <div className="absolute -right-28 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(36,120,255,.25),transparent_68%)]" />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2478FF] shadow-sm">
                    <WorkspaceIcon className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                      Content Workspace
                    </p>

                    <p className="mt-0.5 text-[11px] text-[#7889A2]">
                      Plan · create · approve · publish
                    </p>
                  </div>
                </div>

                <h3 className="mt-8 text-[38px] font-semibold leading-[0.96] tracking-[-0.055em] sm:text-[52px]">
                  Your client content,
                  <br className="hidden sm:block" /> in one place.
                </h3>

                <p className="mt-4 max-w-xl text-sm leading-6 text-[#617087]">
                  Manage ongoing client content, use AI with business context,
                  collect approvals and keep publishing moving.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {["AI Studio", "Calendar", "Approvals", "Publishing"].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-[#65748A]"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-5 border-t border-[#D2E0F4] pt-5 lg:min-w-[220px] lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#8998AD]">
                    {calendar ? "Ready" : "Get started"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#1B2B42]">
                    {calendar ? "Open workspace" : "Create workspace"}
                  </p>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2478FF] text-white shadow-[0_10px_25px_rgba(36,120,255,.22)] transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </div>
            </div>
          </Link>

          {/* Three secondary apps */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {/* Project Delivery */}
            <Link
              href="/dashboard/projects"
              className="group rounded-[24px] border border-[#E0E3E8] bg-[#101114] p-6 text-white transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(10,12,16,.13)] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-white ring-1 ring-white/10">
                  <DeliveryIcon />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#72A8FF]">
                  Delivery
                </span>
              </div>

              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em]">
                Project Delivery
              </h3>

              <p className="mt-2 min-h-[48px] text-xs leading-5 text-white/45">
                Deliver work, collect feedback and get projects across the
                line.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-semibold text-white/80">
                  Open projects
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#101114] transition-transform duration-150 group-hover:translate-x-1">
                  <ArrowIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            {/* Portfolio */}
            <Link
              href="/dashboard/portfolio"
              className="group rounded-[24px] border border-[#E0E3E8] bg-white p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(20,30,45,.07)] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5FC] text-[#2478FF]">
                  <PortfolioIcon />
                </span>

                <span className="rounded-full bg-[#F1F6FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2478FF]">
                  Free
                </span>
              </div>

              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em]">
                Portfolio
              </h3>

              <p className="mt-2 min-h-[48px] text-xs leading-5 text-[#737A84]">
                Present your best work in a polished, professional home.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#ECEEF1] pt-4">
                <span className="text-xs font-semibold text-[#343941]">
                  {portfolio ? "Open portfolio" : "Create portfolio"}
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5FC] text-[#2478FF] transition-transform duration-150 group-hover:translate-x-1">
                  <ArrowIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            {/* Creativo */}
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[24px] border border-[#24262C] bg-[#191A1E] p-6 text-white transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(10,10,15,.14)] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-white ring-1 ring-white/10">
                  <CommunityIcon />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91B8FF]">
                  Community
                </span>
              </div>

              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em]">
                Creativo
              </h3>

              <p className="mt-2 min-h-[48px] text-xs leading-5 text-white/45">
                Learn, connect, exchange ideas and grow with other creators.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-semibold text-white/80">
                  Enter Creativo
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#191A1E] transition-transform duration-150 group-hover:translate-x-1">
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*                            SUPPORT                                */}
        {/* ---------------------------------------------------------------- */}

        <section className="mt-10 rounded-[22px] border border-[#E2E5E9] bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.025)] sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF8EF] text-[#25D366]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-[19px] w-[19px]"
                  aria-hidden="true"
                >
                  <path
                    d="M20 11.5a8.5 8.5 0 0 1-12.65 7.42L4 20l1.13-3.2A8.5 8.5 0 1 1 20 11.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M8.5 9.2c.2-.45.42-.47.76-.48h.48c.17 0 .35.07.43.28l.65 1.56c.08.2.06.36-.07.53l-.43.55c-.1.13-.13.27-.04.42.34.58.83 1.08 1.4 1.43.16.1.3.08.43-.02l.54-.42c.16-.13.31-.15.5-.07l1.53.72c.2.09.27.23.25.43-.06.54-.31 1-.76 1.27-.4.24-.9.27-1.37.16-1.03-.24-2.13-.93-3.04-1.84-.91-.91-1.6-2-1.84-3.04-.11-.47-.08-.97.16-1.37.1-.16.22-.3.41-.49Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#25282D]">
                  Need a hand choosing where to start?
                </p>

                <p className="mt-1 max-w-xl text-xs leading-5 text-[#858B94]">
                  Tell us what you&apos;re trying to accomplish and we&apos;ll
                  point you to the right Showwork workspace. Our team is happy
                  to help.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/2347018819588?text=${encodeURIComponent(
                "Hello Showwork Support 👋\n\nI’m on my Showwork dashboard and I’d like some help choosing the right workspace for what I’m trying to accomplish.\n\nCould you please point me in the right direction?\n\nThank you."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,211,102,0.18)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#20BD5A] hover:shadow-[0_10px_24px_rgba(37,211,102,0.24)] sm:w-auto"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M20 11.5a8.5 8.5 0 0 1-12.65 7.42L4 20l1.13-3.2A8.5 8.5 0 1 1 20 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M8.5 9.2c.2-.45.42-.47.76-.48h.48c.17 0 .35.07.43.28l.65 1.56c.08.2.06.36-.07.53l-.43.55c-.1.13-.13.27-.04.42.34.58.83 1.08 1.4 1.43.16.1.3.08.43-.02l.54-.42c.16-.13.31-.15.5-.07l1.53.72c.2.09.27.23.25.43-.06.54-.31 1-.76 1.27-.4.24-.9.27-1.37.16-1.03-.24-2.13-.93-3.04-1.84-.91-.91-1.6-2-1.84-3.04-.11-.47-.08-.97.16-1.37.1-.16.22-.3.41-.49Z"
                  fill="currentColor"
                />
              </svg>

              <span>Chat with Showwork</span>

              <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*                              FOOTER                              */}
        {/* ---------------------------------------------------------------- */}

        <footer className="mt-10 flex flex-col gap-3 border-t border-[#E3E5E9] pt-6 text-xs text-[#969CA5] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />

            <span>Tools for modern creators.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/profile"
              className="transition-colors duration-150 hover:text-[#2478FF]"
            >
              Account
            </Link>

            <a
              href="mailto:hello@useshowwork.com"
              className="transition-colors duration-150 hover:text-[#2478FF]"
            >
              Support
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}