import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { getCalendarRole } from "@/lib/calendarPermissions";
import CalendarGrid from "@/components/calendars/CalendarGrid";
import CalendarPlanStatus from "@/components/calendars/CalendarPlanStatus";
import CalendarReport from "@/components/calendars/CalendarReport";
import InviteCollaboratorForm from "@/components/calendars/InviteCollaboratorForm";
import CalendarSettingsMenu from "@/components/calendars/CalendarSettingsMenu";
import CalendarPasswordDisplay from "@/components/calendars/CalendarPasswordDisplay";
import CalendarStatsSummary from "@/components/calendars/CalendarStatsSummary";
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

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/calendars" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← All calendars
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
              Social calendar
            </p>
            <h1 className="text-3xl font-bold text-white">{calendar.clientName}</h1>
          </div>
          <CalendarSettingsMenu calendarId={calendar.id} clientName={calendar.clientName} userRole={userRole} isManager={isManager} />
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