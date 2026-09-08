import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { verifyViewerToken } from "@/lib/auth";
import { canAccessCalendar } from "@/lib/calendarPermissions";
import CalendarPasswordGate from "@/components/calendars/CalendarPasswordGate";
import ClientCalendarView from "@/components/calendars/ClientCalendarView";
import CalendarStatsSummary from "@/components/calendars/CalendarStatsSummary";

const COLOR = { black: "#0A0A0A", blue: "#2478FF" };

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export const dynamic = "force-dynamic";

export default async function SocialCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { slug },
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

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieNameFor(calendar.id))?.value;
  const viewer = token ? verifyViewerToken(token, calendar.id) : null;

  if (!viewer) {
    return <CalendarPasswordGate slug={slug} clientName={calendar.clientName} />;
  }

  // Same gate as the manager's page — a calendar that's never been
  // paid for, or whose trial has run out, isn't viewable by the
  // client either. No retry button here since the client can't pay;
  // this is just a waiting message.
  if (!canAccessCalendar(calendar)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.12)" }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#F87171" strokeWidth="1.8">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-white">This calendar isn&apos;t active right now</h1>
          <p className="text-sm text-white/50">Check back once your manager has completed payment for this calendar.</p>
        </div>
      </main>
    );
  }

  const desktopBannerUrl = calendar.headerBannerDesktopUrl ? publicUrlFor(calendar.headerBannerDesktopUrl) : null;
  const mobileBannerUrl = calendar.headerBannerMobileUrl ? publicUrlFor(calendar.headerBannerMobileUrl) : null;
  const hasRealBanner = !!(desktopBannerUrl || mobileBannerUrl);
  const displayTitle = calendar.headerTitle || `${calendar.clientName}'s Content Calendar`;
  const displayDescription =
    calendar.headerDescription ||
    "Every post planned and ready for your review — approve what's ready, or let your team know what needs another look.";

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px]">
        {hasRealBanner ? (
          <>
            {mobileBannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mobileBannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover sm:hidden" />
            )}
            {desktopBannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={desktopBannerUrl} alt="" className="absolute inset-0 hidden h-full w-full object-cover sm:block" />
            )}
          </>
        ) : (
          // No banner set — a rich, brand-colored aurora rather than a
          // flat placeholder box, so the page never looks unfinished
          // even before a manager uploads anything.
          <div className="absolute inset-0" style={{ background: "#0A0A0A" }}>
            <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full opacity-40 blur-[90px]" style={{ background: "#2478FF" }} />
            <div className="absolute -right-16 -top-20 h-80 w-80 rounded-full opacity-30 blur-[90px]" style={{ background: "#9B59F6" }} />
            <div className="absolute bottom-[-80px] left-1/3 h-72 w-72 rounded-full opacity-30 blur-[90px]" style={{ background: "#FFCC00" }} />
            <div className="absolute bottom-[-60px] right-1/4 h-64 w-64 rounded-full opacity-25 blur-[90px]" style={{ background: "#00C2A8" }} />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
          </div>
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.45) 55%, rgba(10,10,10,0.35) 100%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-9 md:px-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-xs font-semibold uppercase text-white/60" style={{ letterSpacing: "0.12em" }}>
              Content calendar
            </p>
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{displayTitle}</h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/70">{displayDescription}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-20">
        <CalendarStatsSummary posts={calendar.posts.map((p) => ({ platform: p.platform, postDate: p.postDate.toISOString() }))} />

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
              videoTimestampSeconds: c.videoTimestampSeconds,
            })),
            customFields: p.customFields.map((f) => ({ id: f.id, label: f.label, value: f.value })),
          }))}
        />
      </div>
    </main>
  );
}