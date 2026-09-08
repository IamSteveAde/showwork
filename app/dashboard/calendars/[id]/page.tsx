import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { getCalendarRole, canAccessCalendar } from "@/lib/calendarPermissions";
import CalendarGrid from "@/components/calendars/CalendarGrid";
import CalendarPlanStatus from "@/components/calendars/CalendarPlanStatus";
import CalendarReport from "@/components/calendars/CalendarReport";
import InviteCollaboratorForm from "@/components/calendars/InviteCollaboratorForm";
import CalendarSettingsMenu from "@/components/calendars/CalendarSettingsMenu";
import CalendarPasswordDisplay from "@/components/calendars/CalendarPasswordDisplay";
import CalendarStatsSummary from "@/components/calendars/CalendarStatsSummary";
import RetryCalendarPaymentButton from "@/components/calendars/RetryCalendarPaymentButton";
import CopyLinkButton from "@/components/CopyLinkButton";

const COLOR = { black: "#0A0A0A", blue: "#2478FF" };

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const { id } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    include: {
      manager: { select: { calendarBillingStatus: true, calendarTrialEndsAt: true } },
      posts: {
        orderBy: { postDate: "asc" },
        include: {
          assets: { orderBy: { displayOrder: "asc" } },
          videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
          customFields: true,
        },
      },
    },
  });

  if (!calendar) notFound();

  // Fixes a real gap: this page used to only ever let the manager in
  // at all — an accepted collaborator hitting this URL got a 404,
  // even though they'd correctly joined the calendar. Every
  // registered role can now open the page; what each of them can
  // actually do on it is what the role itself still controls.
  const userRole = await getCalendarRole(creator.id, id);
  if (!userRole) notFound();
  const isManager = calendar.managerId === creator.id;

  // The actual fix for a real bug: this page used to show the full
  // calendar regardless of billing status, so a manager could hit
  // back from Paystack mid-checkout, reselect the still-pending
  // calendar from the list, and get in anyway. Now nothing past this
  // point renders unless billing genuinely allows it.
  if (!canAccessCalendar(calendar.manager)) {
    const trialExpired = calendar.manager.calendarBillingStatus === "TRIAL";
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.12)" }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#F87171" strokeWidth="1.8">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-white">
            {trialExpired ? "Your free trial has ended" : "Payment required"}
          </h1>
          <p className="text-sm text-white/50">
            {isManager
              ? trialExpired
                ? "Your 3-day trial for this calendar is over. Subscribe to keep using it."
                : "This calendar's first payment was never completed, so it isn't active yet."
              : "This calendar isn't active right now — check back once the manager has completed payment."}
          </p>
          {isManager && <RetryCalendarPaymentButton calendarId={calendar.id} />}
          <Link href="/dashboard/calendars" className="mt-2 text-xs text-white/40 underline hover:text-white">
            ← Back to your calendars
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/calendars" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← All calendars
        </Link>

        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
              Social calendar
            </p>
            <h1 className="text-3xl font-bold text-white">{calendar.clientName}</h1>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <a
              href={`/api/calendars/${calendar.id}/report`}
              download
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v6.5M6 7.5L3 4.5M6 7.5L9 4.5M1.5 9.5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download report
            </a>
            <CalendarSettingsMenu calendarId={calendar.id} clientName={calendar.clientName} userRole={userRole} isManager={isManager} />
          </div>
        </div>

        <div className="mb-6 rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
          <p className="mb-2 text-sm text-white/50">Share this link and password with your client — both are needed to get in.</p>
          <div className="flex items-center gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL}/social-calendar/${calendar.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium underline"
              style={{ color: COLOR.blue }}
            >
              {process.env.NEXT_PUBLIC_APP_URL}/social-calendar/{calendar.slug}
            </a>
            <CopyLinkButton url={`${process.env.NEXT_PUBLIC_APP_URL}/social-calendar/${calendar.slug}`} />
          </div>
          {isManager && <CalendarPasswordDisplay calendarId={calendar.id} accessCode={calendar.accessCode ?? ""} />}
        </div>

        <CalendarPlanStatus
          calendarId={calendar.id}
          planStatus={calendar.planStatus}
          planApprovalNote={calendar.planApprovalNote}
          headerTitle={calendar.headerTitle}
          headerDescription={calendar.headerDescription}
          headerBannerDesktopUrl={calendar.headerBannerDesktopUrl}
          headerBannerMobileUrl={calendar.headerBannerMobileUrl}
        />

        <CalendarStatsSummary posts={calendar.posts.map((p) => ({ platform: p.platform, postDate: p.postDate.toISOString() }))} />

        <CalendarReport posts={calendar.posts.map((p) => ({ approvalStatus: p.approvalStatus, hasContent: p.assets.length > 0 }))} />

        {isManager && (
          <div className="mb-8">
            <InviteCollaboratorForm calendarId={calendar.id} />
          </div>
        )}

        <CalendarGrid
          calendarId={calendar.id}
          planStatus={calendar.planStatus}
          userRole={userRole}
          clientName={calendar.clientName}
          initialPosts={calendar.posts.map((p) => ({
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
              fileKey: a.fileKey,
              mediaType: a.mediaType,
              contentUrl: publicUrlFor(a.fileKey),
            })),
            videoComments: p.videoComments.map((c) => ({
              id: c.id,
              authorName: c.authorName,
              authorEmail: c.authorEmail,
              note: c.note,
              videoTimestampSeconds: c.videoTimestampSeconds,
            })),
            customFields: p.customFields.map((f) => ({ id: f.id, label: f.label, value: f.value })),
          }))}
        />
      </div>
    </main>
  );
}