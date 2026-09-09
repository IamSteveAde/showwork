import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import CreateCalendarForm from "@/components/calendars/CreateCalendarForm";
import CalendarPaymentCallbackHandler from "@/components/calendars/CalendarPaymentCallbackHandler";
import TrialCountdownBanner from "@/components/calendars/TrialCountdownBanner";
import CalendarBillingSettings from "@/components/calendars/CalendarBillingSettings";
import CalendarCard from "@/components/calendars/CalendarCard";

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
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
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
const COLOR = {
  black: "#080808",
  blue: "#2478FF",
  charcoal: "#111111",
};

const PAGE_SIZE = 9;

function getPageNumber(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildPageHref(page: number) {
  return page <= 1
    ? "/dashboard/calendars"
    : `/dashboard/calendars?page=${page}`;
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Client workspace pagination"
      className="mt-10 flex flex-col gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-white/30">
        Page{" "}
        <span className="font-medium text-white/55">{currentPage}</span>{" "}
        of{" "}
        <span className="font-medium text-white/55">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1.5">
       <Link
  href={buildPageHref(Math.max(1, currentPage - 1))}
  aria-label="Previous page"
  aria-disabled={currentPage === 1}
  className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 transition-all ${
    currentPage === 1
      ? "pointer-events-none border-white/[0.04] text-white/15"
      : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
  }`}
>
  <ArrowLeftIcon className="h-3.5 w-3.5" />
</Link>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-7 items-center justify-center text-xs text-white/20"
            >
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildPageHref(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all ${
                page === currentPage
                  ? "border-[#2478FF]/40 bg-[#2478FF] text-white shadow-[0_6px_20px_rgba(36,120,255,0.20)]"
                  : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {page}
            </Link>
          )
        )}

        <Link
  href={buildPageHref(Math.min(totalPages, currentPage + 1))}
  aria-label="Next page"
  aria-disabled={currentPage === totalPages}
  className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 transition-all ${
    currentPage === totalPages
      ? "pointer-events-none border-white/[0.04] text-white/15"
      : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
  }`}
>
  <ArrowRightIcon className="h-3.5 w-3.5" />
</Link>
      </div>
    </nav>
  );
}

export default async function CalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const calendarBilling = await db.creator.findUnique({
    where: { id: creator.id },
    select: {
      calendarAccountType: true,
      calendarBillingStatus: true,
      calendarTrialEndsAt: true,
      calendarSubscriptionRenewsAt: true,
    },
  });

  const params = await searchParams;
  const currentPage = getPageNumber(params?.page);

  const totalCalendars = await db.socialCalendar.count({
    where: {
      managerId: creator.id,
    },
  });

  const totalPages = Math.max(1, Math.ceil(totalCalendars / PAGE_SIZE));

  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const calendars = await db.socialCalendar.findMany({
    where: {
      managerId: creator.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: PAGE_SIZE,
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  // Calendars this person was invited to and accepted — not owned,
  // but they should always be able to find their way back in from
  // their own dashboard, not just from the original invite email.
  const collaboratorMemberships = await db.calendarCollaborator.findMany({
    where: { creatorId: creator.id },
    orderBy: { addedAt: "desc" },
    include: {
      calendar: {
        include: {
          manager: { select: { name: true, email: true } },
          _count: { select: { posts: true } },
        },
      },
    },
  });

  return (
    <main
      className="min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-10 lg:px-10 xl:px-16"
      style={{ background: COLOR.black }}
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full opacity-[0.045] blur-[120px]"
          style={{ background: COLOR.blue }}
        />

        <div className="absolute right-[-180px] top-[35%] h-[420px] w-[420px] rounded-full bg-white/[0.025] blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* ─────────────────────────────────────────
            TOP NAV
        ───────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between sm:mb-12">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-xs font-medium text-white/35 transition-colors hover:text-white"
          >
           <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
  <ArrowLeftIcon className="h-3.5 w-3.5" />
</span>
            All apps
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">
              Workspace
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            HERO
        ───────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="h-px w-7"
                  style={{ background: COLOR.blue }}
                />

                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: COLOR.blue }}
                >
                  Client workspaces
                </p>
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-[46px] lg:leading-[1.05]">
                Your client
                <br className="hidden sm:block" /> workspaces.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/35 sm:text-[15px]">
                Plan, organize and manage every client’s social content from
                one focused workspace.
              </p>
            </div>

            {/* Summary */}
            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">
                  Total workspaces
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {totalCalendars}
                </p>
              </div>

              {calendarBilling?.calendarAccountType && (
                <div
                  className="rounded-2xl border px-4 py-3.5"
                  style={
                    calendarBilling.calendarAccountType === "COMPANY"
                      ? { borderColor: "rgba(36,120,255,0.25)", background: "rgba(36,120,255,0.06)" }
                      : { borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }
                  }
                >
                  <p
                    className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: calendarBilling.calendarAccountType === "COMPANY" ? "#68A4FF" : "rgba(255,255,255,0.25)" }}
                  >
                    Plan
                  </p>

                  <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                    {calendarBilling.calendarAccountType === "COMPANY" ? "Company" : "Individual"}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {calendars.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {calendarBilling?.calendarBillingStatus === "TRIAL" && calendarBilling.calendarTrialEndsAt && calendarBilling.calendarAccountType && (
          <TrialCountdownBanner
            trialEndsAt={calendarBilling.calendarTrialEndsAt.toISOString()}
            accountType={calendarBilling.calendarAccountType}
          />
        )}

        {/* Billing settings — only shows once an account type has
            actually been chosen, i.e. once at least one calendar has
            ever been created. */}
        {calendarBilling?.calendarAccountType && (
          <CalendarBillingSettings
            accountType={calendarBilling.calendarAccountType}
            billingStatus={calendarBilling.calendarBillingStatus}
            subscriptionRenewsAt={calendarBilling.calendarSubscriptionRenewsAt?.toISOString() ?? null}
            trialEndsAt={calendarBilling.calendarTrialEndsAt?.toISOString() ?? null}
          />
        )}

        {/* Payment callback */}
        <Suspense fallback={null}>
          <CalendarPaymentCallbackHandler />
        </Suspense>

        {/* ─────────────────────────────────────────
            CREATE CALENDAR
        ───────────────────────────────────────── */}
        <section className="mb-12">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2478FF]/10 text-[#2478FF]">
                  <PlusIcon className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Create a client workspace
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/30">
                    Create an ongoing content workspace for a client.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <CreateCalendarForm calendarAccountType={calendarBilling?.calendarAccountType ?? null} />
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            CALENDAR LIST HEADER
        ───────────────────────────────────────── */}
        {totalCalendars > 0 && (
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                All client workspaces
              </p>

              <p className="mt-1 text-xs text-white/25">
                {totalCalendars}{" "}
                {totalCalendars === 1 ? "client workspace" : "client workspaces"}
              </p>
            </div>

            {totalPages > 1 && (
              <p className="hidden text-[10px] uppercase tracking-[0.12em] text-white/20 sm:block">
                Page {safePage} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────
            CALENDAR CARDS
        ───────────────────────────────────────── */}
        {calendars.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {calendars.map((cal, index) => (
                <CalendarCard
                  key={cal.id}
                  id={cal.id}
                  clientName={cal.clientName}
                  planStatus={cal.planStatus}
                  postCount={cal._count.posts}
                  createdAt={cal.createdAt.toISOString()}
                  globalIndex={skip + index + 1}
                />
              ))}
            </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
            />
          </>
        ) : (
          /* ─────────────────────────────────────────
              EMPTY STATE
          ───────────────────────────────────────── */
          <section className="relative overflow-hidden rounded-3xl border border-dashed border-white/[0.09] bg-white/[0.018] px-6 py-20 text-center sm:py-28">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-[#2478FF]/[0.06] blur-[80px]" />

            <div className="relative mx-auto max-w-md">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                <div className="relative h-7 w-7">
                  <div className="absolute left-1 top-1 h-5 w-5 rounded-md border border-white/20" />
                  <div className="absolute bottom-0 right-0 h-5 w-5 rounded-md border border-[#2478FF]/60 bg-[#2478FF]/10" />
                </div>
              </div>

              <p className="text-lg font-semibold tracking-[-0.02em] text-white">
                No client workspaces yet
              </p>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/30">
                Your client workspaces will appear here once you create
                your first one.
              </p>

              <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#2478FF]/20 bg-[#2478FF]/[0.07] px-4 py-2.5 text-xs font-medium text-[#68B2FF]">
  <PlusIcon className="h-3.5 w-3.5" />
  Create your first client workspace above
</div>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────
            CALENDARS YOU COLLABORATE ON — invited by
            someone else, not owned. Kept separate from the
            paginated owned list above.
        ───────────────────────────────────────── */}
        {collaboratorMemberships.length > 0 && (
          <section className="mt-12">
            <div className="mb-5">
              <p className="text-sm font-semibold text-white">
                Calendars you collaborate on
              </p>
              <p className="mt-1 text-xs text-white/25">
                Client workspaces someone else invited you to.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {collaboratorMemberships.map((membership) => {
                const cal = membership.calendar;
                const roleLabel =
                  membership.role === "EDIT_CALENDAR"
                    ? "Edit calendar"
                    : membership.role === "ADD_CONTENT"
                    ? "Add content"
                    : "View only";
                const roleColor =
                  membership.role === "EDIT_CALENDAR"
                    ? "#F97316"
                    : membership.role === "ADD_CONTENT"
                    ? "#2478FF"
                    : "#A1A1AA";

                return (
                  <Link
                    key={cal.id}
                    href={`/dashboard/calendars/${cal.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.13] hover:bg-[#141414]"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                        style={{ background: `${roleColor}18`, color: roleColor }}
                      >
                        {roleLabel}
                      </span>
                      <ArrowUpRightIcon className="h-3.5 w-3.5 text-white/20 transition-all group-hover:text-[#68B2FF]" />
                    </div>

                    <h3 className="line-clamp-1 text-base font-semibold text-white">{cal.clientName}</h3>
                    <p className="mt-1 text-xs text-white/30">
                      Managed by {cal.manager.name || cal.manager.email}
                    </p>
                    <p className="mt-3 text-xs text-white/40">
                      {cal._count.posts} {cal._count.posts === 1 ? "post" : "posts"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom breathing room */}
        <div className="h-10 sm:h-16" />
      </div>
    </main>
  );
}