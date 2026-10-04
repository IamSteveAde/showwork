import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Search,
  Users,
} from "lucide-react";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncContentWorkspaceRenewal } from "@/lib/syncContentWorkspaceRenewal";
import CreateCalendarForm from "@/components/calendars/CreateCalendarForm";
import CalendarCard from "@/components/calendars/CalendarCard";
import CalendarPaymentCallbackHandler from "@/components/calendars/CalendarPaymentCallbackHandler";
import WorkspaceOnboarding, {
  DashboardTourButton,
} from "@/components/calendars/WorkspaceOnboarding";

const PAGE_SIZE = 9;
const BILLING_HREF = "/dashboard/billing?product=content-workspace#content-workspace-plans";

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  return `/dashboard/calendars${params.size ? `?${params}` : ""}`;
}

export default async function CalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; onboarding?: string; q?: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedPage = Number(params.page);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;
  const where = {
    managerId: creator.id,
    ...(query
      ? { clientName: { contains: query, mode: "insensitive" as const } }
      : {}),
  };
  const [billing, totalCalendars, matchingCalendars, collaboratorMemberships] =
    await Promise.all([
      db.creator.findUnique({
        where: { id: creator.id },
        select: {
          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          contentWorkspaceTrialEndsAt: true,
          isComped: true,
          compedUntil: true,
        },
      }),
      db.socialCalendar.count({ where: { managerId: creator.id } }),
      db.socialCalendar.count({ where }),
      db.calendarCollaborator.findMany({
        where: {
          creatorId: creator.id,
          ...(query
            ? {
                calendar: {
                  clientName: { contains: query, mode: "insensitive" as const },
                },
              }
            : {}),
        },
        orderBy: { addedAt: "desc" },
        include: {
          calendar: {
            include: {
              manager: { select: { name: true, email: true } },
              _count: { select: { posts: true } },
            },
          },
        },
      }),
    ]);
  if (billing?.contentWorkspaceBillingStatus === "ACTIVE")
    await syncContentWorkspaceRenewal(creator.id);
  const totalPages = Math.max(1, Math.ceil(matchingCalendars / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const calendars = await db.socialCalendar.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
    include: { _count: { select: { posts: true, collaborators: true } } },
  });
  const trialEnd = billing?.contentWorkspaceTrialEndsAt;
  const complimentary = Boolean(
    billing?.isComped &&
    (!billing.compedUntil || billing.compedUntil > new Date()),
  );
  const trialExpired =
    billing?.contentWorkspaceBillingStatus === "TRIAL" &&
    trialEnd &&
    trialEnd <= new Date();
  const needsBilling =
    !complimentary &&
    (billing?.contentWorkspaceBillingStatus === "OFFLINE" || trialExpired);
  const trialDays = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null;

  const planName = billing?.contentWorkspacePlan
    ? { CREATOR: "Creator", STUDIO: "Studio", UNLIMITED: "Agency" }[
        billing.contentWorkspacePlan
      ]
    : "No plan";
  const billingSummary = complimentary
    ? "Complimentary"
    : billing?.contentWorkspaceBillingStatus === "TRIAL"
      ? trialExpired
        ? "Trial ended"
        : trialDays === null
          ? "Free trial"
          : `Trial · ${trialDays} ${trialDays === 1 ? "day" : "days"} left`
      : billing?.contentWorkspaceBillingStatus === "OFFLINE"
        ? "Access paused"
        : billing?.contentWorkspaceBillingStatus === "ACTIVE"
          ? "Active"
          : null;

  return (
    <main className="calendar-dashboard min-h-screen bg-[#F7F9FC] px-4 py-4 text-[#101828] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Dashboard navigation"
          className="mb-6 flex items-center justify-between gap-3 border-b border-[#E4E7EC] pb-3"
        >
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#475467] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            All apps
          </Link>
          <div className="flex items-center gap-1">
            <DashboardTourButton />
            <Link
              href={BILLING_HREF}
              data-dashboard-tour="billing"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#475467] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
            >
              <CreditCard
                aria-hidden="true"
                className="hidden h-4 w-4 shrink-0 sm:block"
              />
              <span className="block text-left">
                <span className="flex items-center gap-1.5">
                  Billing
                  <span className="rounded-full bg-[#EEF5FF] px-2 py-0.5 text-[11px] font-medium text-[#175CD3]">
                    {planName}
                  </span>
                </span>
                {billingSummary && (
                  <span
                    className={`mt-0.5 block text-[11px] font-normal ${needsBilling ? "text-amber-700" : "text-[#667085]"}`}
                  >
                    {billingSummary}
                  </span>
                )}
              </span>
            </Link>
          </div>
        </nav>
        <div data-dashboard-tour-slot="billing" />
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Client workspaces
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            Open a client’s workspace, or add a new client.
          </p>
        </header>
        {billing?.contentWorkspacePlan && needsBilling && (
          <aside
            aria-label="Workspace access"
            className={`mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-3 text-sm ${needsBilling ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50 text-[#175CD3]"}`}
          >
            <p>Subscribe to restore workspace access.</p>
            <Link
              href={BILLING_HREF}
              className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4"
            >
              Restore access
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </aside>
        )}
        <section
          data-onboarding="create-workspace"
          className="mb-6"
          aria-label="Create a client workspace"
        >
          <CreateCalendarForm
            contentWorkspacePlan={billing?.contentWorkspacePlan ?? null}
          />
          <div data-dashboard-tour-slot="create" />
        </section>
        <Suspense fallback={null}>
          <CalendarPaymentCallbackHandler />
        </Suspense>
        <section id="your-workspaces" aria-labelledby="your-workspaces-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              id="your-workspaces-title"
              data-dashboard-tour="workspaces"
              className="text-base font-semibold"
            >
              Your workspaces{" "}
              <span className="ml-1 font-normal text-[#667085]">
                ({totalCalendars})
              </span>
            </h2>
            {(totalCalendars > 0 ||
              collaboratorMemberships.length > 0 ||
              query) && (
              <form
                action="/dashboard/calendars"
                method="get"
                role="search"
                className="flex w-full items-center gap-2 sm:max-w-sm"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]"
                  />
                  <input
                    aria-label="Search client workspaces"
                    name="q"
                    defaultValue={query}
                    placeholder="Search clients"
                    type="search"
                    className="min-h-11 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-base outline-none focus:border-[#1768E8] focus:ring-2 focus:ring-blue-100 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-slate-50"
                >
                  Search
                </button>
              </form>
            )}
          </div>
          <div data-dashboard-tour-slot="workspaces" />
          {query && (
            <p className="mb-4 text-sm text-[#667085]">
              Results for “{query}”{" "}
              <Link
                href="/dashboard/calendars"
                className="ml-2 inline-flex min-h-11 items-center font-medium text-[#1768E8] underline"
              >
                Clear search
              </Link>
            </p>
          )}
          {calendars.length ? (
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
                  collaboratorCount={cal._count.collaborators}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-10 text-center">
              <CalendarDays
                aria-hidden="true"
                className="mx-auto mb-3 h-8 w-8 text-[#98A2B3]"
              />
              <h3 className="text-base font-semibold">
                {query ? "No matching workspaces" : "Your clients start here"}
              </h3>
              <p className="mt-2 text-sm text-[#667085]">
                {query
                  ? "Try another client name or clear your search."
                  : "Add your first client using the button above."}
              </p>
            </div>
          )}
          {totalPages > 1 && (
            <nav
              aria-label="Client workspace pagination"
              className="mt-5 flex items-center justify-between gap-2 border-t border-[#E4E7EC] pt-4"
            >
              <Link
                href={pageHref(Math.max(1, safePage - 1), query)}
                aria-disabled={safePage === 1}
                tabIndex={safePage === 1 ? -1 : undefined}
                className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm ${safePage === 1 ? "pointer-events-none text-[#98A2B3]" : "text-[#344054] hover:bg-slate-50"}`}
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Previous
              </Link>
              <span className="text-xs text-[#667085]">
                {safePage} of {totalPages}
              </span>
              <Link
                href={pageHref(Math.min(totalPages, safePage + 1), query)}
                aria-disabled={safePage === totalPages}
                tabIndex={safePage === totalPages ? -1 : undefined}
                className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm ${safePage === totalPages ? "pointer-events-none text-[#98A2B3]" : "text-[#344054] hover:bg-slate-50"}`}
              >
                Next
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </section>
        {collaboratorMemberships.length > 0 && (
          <section
            id="shared-workspaces"
            aria-labelledby="shared-workspaces-title"
            className="mt-8"
          >
            <h2
              id="shared-workspaces-title"
              className="mb-3 flex items-center gap-2 text-base font-semibold"
            >
              <Users aria-hidden="true" className="h-4 w-4 text-[#667085]" />
              Shared with you
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {collaboratorMemberships.map(({ calendar: cal, role }) => (
                <Link
                  key={cal.id}
                  href={`/dashboard/calendars/${cal.id}`}
                  className="rounded-2xl border border-[#E4E7EC] bg-white p-4 transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
                >
                  <h3 className="truncate font-semibold">{cal.clientName}</h3>
                  <p className="mt-1 truncate text-xs text-[#667085]">
                    Managed by {cal.manager.name || cal.manager.email}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#667085]">
                    <span>
                      {role === "EDIT_CALENDAR"
                        ? "Can edit"
                        : role === "ADD_CONTENT"
                          ? "Can add content"
                          : "View only"}
                    </span>
                    <span className="inline-flex min-h-11 items-center gap-1 font-semibold text-[#1768E8]">
                      Open workspace
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        <WorkspaceOnboarding
          isFirstWorkspace={totalCalendars === 0}
          hasExistingPlan={Boolean(billing?.contentWorkspacePlan)}
          testMode={params.onboarding === "test"}
        />
      </div>
    </main>
  );
}
