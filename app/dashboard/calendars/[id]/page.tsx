import type { TeamPermission } from "@/lib/calendarTeamPolicy";
import { complimentaryAccessSelect } from "@/lib/complimentaryAccess";
import UiSymbol from "@/components/ui/UiSymbol";
import CalendarPaymentCallbackHandler from "@/components/calendars/CalendarPaymentCallbackHandler";
import { requirePostPlatform } from "@/lib/calendarPosts";
import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import {
  getCalendarRole,
  getCalendarAccess,
  canAccessCalendarById,
} from "@/lib/calendarPermissions";
import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";
import { canUseContentWorkspaceFeature, isContentWorkspaceTrialActive } from "@/lib/contentWorkspaceUsage";
import { isAdminEmail } from "@/lib/admin";

import CalendarGrid from "@/components/calendars/CalendarGrid";
import CalendarPlanStatus from "@/components/calendars/CalendarPlanStatus";
import InviteCollaboratorForm from "@/components/calendars/InviteCollaboratorForm";
import CalendarSettingsMenu from "@/components/calendars/CalendarSettingsMenu";
import CalendarPasswordDisplay from "@/components/calendars/CalendarPasswordDisplay";
import InstagramConnectionCard from "@/components/calendars/InstagramConnectionCard";
import TikTokConnectionCard from "@/components/calendars/TikTokConnectionCard";
import AdditionalChannelCard from "@/components/calendars/AdditionalChannelCard";
import WhatsAppConnectionCard from "@/components/calendars/WhatsAppConnectionCard";
import BusinessKnowledgeCard from "@/components/calendars/BusinessKnowledgeCard";
import AiContentGeneratorCard from "@/components/calendars/AiContentGeneratorCard";
import CopyLinkButton from "@/components/CopyLinkButton";
import PublishTrigger from "@/components/calendars/PublishTrigger";
import CalendarWorkspaceShell, { type WorkspaceSection } from "@/components/calendars/CalendarWorkspaceShell";
import WorkspaceActionButton from "@/components/calendars/WorkspaceActionButton";
import CalendarReportingPanel from "@/components/calendars/CalendarReportingPanel";
import SocialLeadInbox from "@/components/calendars/SocialLeadInbox";
import CalendarLeadsPanel from "@/components/calendars/CalendarLeadsPanel";


const COLOR = {
  black: "#07090D",
  panel: "#10141B",
  panelSoft: "#151A22",
  blue: "#2478FF",
  blueSoft: "#72A8FF",
  white: "#FFFFFF",
  muted: "#929AA8",
  line: "rgba(255,255,255,0.09)",
};


type PlatformAnalyticsPost = {
  platform: string;
  postDate: string;
};

function ApprovalAnalytics({
  posts,
}: {
  posts: { approvalStatus: string; hasContent: boolean }[];
}) {
  const total = posts.length;
  const approved = posts.filter((p) => p.approvalStatus === "APPROVED").length;
  const pending = posts.filter((p) => p.approvalStatus === "PENDING").length;
  const revision = posts.filter((p) => p.approvalStatus === "NEEDS_REVISION").length;
  const withContent = posts.filter((p) => p.hasContent).length;
  const percent = total ? Math.round((approved / total) * 100) : 0;

  const rows = [
    { label: "Approved", count: approved, tone: "#16A34A", track: "#DCFCE7" },
    { label: "Pending review", count: pending, tone: "#D97706", track: "#FEF3C7" },
    { label: "Needs revision", count: revision, tone: "#DC2626", track: "#FEE2E2" },
  ];

  if (!total) {
    return (
      <div className="flex min-h-[190px] items-center justify-center rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] px-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2478FF] shadow-sm ring-1 ring-black/[0.06]">
            <span className="text-sm font-bold">0</span>
          </div>
          <p className="text-sm font-semibold text-[#101828]">No review activity yet</p>
          <p className="mt-1.5 text-xs leading-5 text-[#667085]">Add content to start tracking approvals and revisions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">Approval health</p>
          <p className="mt-1 text-sm font-semibold text-[#101828]">{approved} of {total} posts approved</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#ECFDF3] px-3 py-1.5 text-xs font-bold text-[#027A48]">{percent}% approved</span>
        </div>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E4E7EC]">
        <div className="h-full rounded-full bg-[#16A34A] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.tone }} />
                <span className="text-[13px] font-semibold text-[#344054]">{row.label}</span>
              </div>
              <span className="text-[12px] font-bold text-[#101828]">{row.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: row.track }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max((row.count / total) * 100, row.count ? 3 : 0)}%`, background: row.tone }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-[#E4E7EC] bg-white px-3.5 py-3">
        <span className="text-xs font-medium text-[#667085]">Content attached</span>
        <span className="text-xs font-bold text-[#101828]">{withContent} / {total}</span>
      </div>
    </div>
  );
}

function PlatformAnalytics({
  posts,
}: {
  posts: PlatformAnalyticsPost[];
}) {
  const platformLabels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube",
    FACEBOOK: "Facebook",
    X: "X",
    LINKEDIN: "LinkedIn",
  };

  const platformMeta: Record<string, { mark: string; className: string }> = {
    INSTAGRAM: { mark: "IG", className: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400" },
    TIKTOK: { mark: "TT", className: "bg-[#111318]" },
    YOUTUBE: { mark: "YT", className: "bg-red-500" },
    FACEBOOK: { mark: "f", className: "bg-blue-600" },
    X: { mark: "𝕏", className: "bg-[#111318]" },
    LINKEDIN: { mark: "in", className: "bg-[#0A66C2]" },
  };

  const counts = posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.platform] = (acc[post.platform] ?? 0) + 1;
    return acc;
  }, {});

  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({
      platform,
      label: platformLabels[platform] ?? platform.replace(/_/g, " "),
      count,
      percent: posts.length ? Math.round((count / posts.length) * 100) : 0,
      meta: platformMeta[platform] ?? { mark: "•", className: "bg-slate-700" },
    }));

  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  if (!rows.length) {
    return (
      <div className="flex min-h-[190px] items-center justify-center rounded-2xl border border-black/[0.07] bg-[#F8FAFC] px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[#0A0D12]">No platform activity yet</p>
          <p className="mt-1.5 text-xs leading-5 text-[#667085]">
            Add posts to start seeing your publishing mix.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-[#F8FAFC] p-4 sm:p-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#667085]">
            {posts.length} {posts.length === 1 ? "post" : "posts"} planned
          </p>
          <p className="mt-1 text-xs text-[#98A2B3]">
            Publishing mix across your channels
          </p>
        </div>
        <span className="rounded-full border border-[#DCE4EE] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#475467]">
          All platforms
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.platform}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold text-white ${row.meta.className}`}
                >
                  {row.meta.mark}
                </span>
                <span className="truncate text-[13px] font-semibold text-[#1D2939]">
                  {row.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[12px] font-semibold text-[#344054]">
                  {row.count}
                </span>
                <span className="w-9 text-right text-[10px] font-medium text-[#98A2B3]">
                  {row.percent}%
                </span>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#E7ECF2]">
              <div
                className="h-full min-w-[6px] rounded-full bg-[#2478FF] transition-all duration-500"
                style={{ width: `${Math.max((row.count / maxCount) * 100, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconCalendar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowUpRight({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M7 17L17 7M9 7H17V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDownload({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M12 3V15M7.5 11L12 15.5L16.5 11M4 20H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLink({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M9.5 14.5L14.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.2 17.8L5.7 19.3C4.2 20.8 1.8 20.8 0.3 19.3C-1.2 17.8-1.2 15.4 0.3 13.9L4.9 9.3C6.4 7.8 8.8 7.8 10.3 9.3" transform="translate(2 0)" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.8 6.2L18.3 4.7C19.8 3.2 22.2 3.2 23.7 4.7C25.2 6.2 25.2 8.6 23.7 10.1L19.1 14.7C17.6 16.2 15.2 16.2 13.7 14.7" transform="translate(-2 0)" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 19C3.9 15.7 5.7 14 9 14C12.3 14 14.1 15.7 14.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 5.5C17.4 5.6 18.8 7 18.8 9C18.8 10.5 18 11.6 16.8 12.2M16.5 14.3C19.2 14.8 20.3 16.4 20.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M12 3L19 6V11.2C19 15.7 16.1 19.3 12 21C7.9 19.3 5 15.7 5 11.2V6L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M12 2.8L13.7 9.3L20.2 11L13.7 12.7L12 19.2L10.3 12.7L3.8 11L10.3 9.3L12 2.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const { id } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    include: {
      manager: {
        select: {
          id: true,
          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          contentWorkspaceBillingCycle: true,
          contentWorkspaceTrialEndsAt: true,
          ...complimentaryAccessSelect, isComped: true,
compedUntil: true,
          
        },
      },
      _count: {
        select: {
          collaborators: true,
        },
      },
      businessDocuments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          createdAt: true,
          websiteUrl: true,
        },
      },
      posts: {
        orderBy: { postDate: "asc" },
        include: {
          assets: {
            orderBy: { displayOrder: "asc" },
          },
          videoComments: {
            orderBy: { videoTimestampSeconds: "asc" },
          },
          customFields: true,
        },
      },
    },
  });

  if (!calendar) {
    notFound();
  }

  const isAdmin = isAdminEmail(creator.email);
  const access = await getCalendarAccess(creator.id, id);
  if (!access && !isAdmin) notFound();
  const permissions: TeamPermission[] = access?.permissions ?? ["calendar.view", "analytics.view"];
  const can = (permission: TeamPermission) => permissions.includes(permission);
  const isOwner = calendar.managerId === creator.id;
  const isManager = isOwner || access?.role === "MANAGER";
  const canEditWorkspace = can("calendar.edit");
  const userRole = canEditWorkspace ? "EDIT_CALENDAR" : can("creatives.upload") ? "ADD_CONTENT" : "VIEW_ONLY";
  const totalMembers = 1 + calendar._count.collaborators;

  const workspaceActive = await canAccessCalendarById(calendar.id);
  const agencyTrial = isContentWorkspaceTrialActive(calendar.manager);
  const featureAccess = (feature: Parameters<typeof canUseContentWorkspaceFeature>[1]) => workspaceActive && canUseContentWorkspaceFeature(calendar.manager, feature);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const clientUrl = `${appUrl}/social-calendar/${calendar.slug}`;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthPosts = calendar.posts.filter((post) => {
    const date = new Date(post.postDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

const aiActive = workspaceActive;

  const calendarPosts = calendar.posts.map((p) => ({
    id: p.id,
    postDate: p.postDate.toISOString(),
    platform: requirePostPlatform(p.platform),
    postType: p.postType,
   category: p.category,
hook: p.hook,
script: p.script,
caption: p.caption,
contentIdea: p.contentIdea,
    cta: p.cta,
    hashtags: p.hashtags,
    taggedAccounts: p.taggedAccounts,
    linkUrl: p.linkUrl,
    approvalStatus: p.approvalStatus,
    approvalNote: p.approvalNote,
    publishStatus: p.publishStatus,
    publishError: p.publishError,
    publishPermalink: p.publishPermalink,
    instagramPublishStatus: p.instagramPublishStatus,
    instagramPermalink: p.instagramPermalink,
    instagramPublishError: p.instagramPublishError,
    tikTokPublishStatus: p.tikTokPublishStatus,
    tikTokPrivacyLevel: p.tikTokPrivacyLevel,
    tikTokSettings: p.tikTokSettings,
    tikTokConsentAt: p.tikTokConsentAt?.toISOString() ?? null,
    tikTokInitStartedAt: p.tikTokInitStartedAt?.toISOString() ?? null,
    tikTokPublishId: p.tikTokPublishId,
    tikTokPublishError: p.tikTokPublishError,
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
    customFields: p.customFields.map((f) => ({
      id: f.id,
      label: f.label,
      value: f.value,
    })),
  }));

  const approvedCount = calendar.posts.filter((post) => post.approvalStatus === "APPROVED").length;
  const revisionCount = calendar.posts.filter((post) => post.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = calendar.posts.filter((post) => post.approvalStatus === "PENDING").length;
  const contentCount = calendar.posts.filter((post) => post.assets.length > 0).length;

  const sections: WorkspaceSection[] = [
    {
      id: "overview",
      label: "Overview",
      eyebrow: "Command center",
      title: `Good to see you. Here’s ${calendar.clientName}.`,
      description:
        "The fastest view of what needs attention, what is ready, and what is moving next.",
      group: "Workspace",
      content: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Content", calendar.posts.length, "planned across the workspace", "content"],
              ["Ready", contentCount, "posts with creative attached", "content"],
              ["Approved", approvedCount, "cleared by the client", "publish"],
              ["Team", totalMembers, "people with access", "team"],
            ].map(([label, value, note, icon]) => (
              <WorkspaceActionButton
                key={String(label)}
                target={String(icon)}
                className="group rounded-[22px] border border-[#DFE6EF] bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_16px_38px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#98A2B3]">
                    {label}
                  </span>
                  <span className="text-[#B2BCC9] transition group-hover:translate-x-0.5 group-hover:text-[#1768E8]"><UiSymbol name="right" /></span>
                </div>
                <p className="mt-5 text-[36px] font-semibold tracking-[-0.06em] text-[#0B1220]">
                  {value}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#667085]">{note}</p>
              </WorkspaceActionButton>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
            <div className="overflow-hidden rounded-[28px] border border-[#DCE5F0] bg-white shadow-[0_16px_46px_rgba(15,23,42,0.045)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#E9EEF4] px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#1768E8]">
                    Workspace pulse
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-[#101828]">
                    What needs your attention
                  </h3>
                </div>
                <span className="rounded-full bg-[#F4F7FB] px-2.5 py-1 text-[9px] font-bold text-[#667085]">
                  Live
                </span>
              </div>

              <div className="divide-y divide-[#EEF1F5]">
                {[
                  {
                    title: `${pendingCount} ${pendingCount === 1 ? "post" : "posts"} waiting for review`,
                    detail: "Move client feedback forward before the next publishing window.",
                    tone: "blue",
                    action: "Review content",
                    target: "content",
                  },
                  {
                    title: `${revisionCount} ${revisionCount === 1 ? "revision" : "revisions"} requested`,
                    detail: revisionCount ? "There is feedback waiting inside the calendar." : "Nothing is currently blocked by revision requests.",
                    tone: revisionCount ? "amber" : "green",
                    action: revisionCount ? "Open revisions" : "View content",
                    target: "content",
                  },
                  {
                    title: aiActive ? "AI Studio is ready" : "AI Studio is waiting for activation",
                    detail: aiActive
                      ? "Generate from this client's context, then review every draft before publishing."
                      : "Activate AI Assistant to unlock client-aware generation.",
                    tone: aiActive ? "violet" : "slate",
                    action: aiActive ? "Open AI Studio" : "View AI",
                    target: aiActive ? "generate" : "knowledge",
                  },
                ].map((item) => (
                  <WorkspaceActionButton
                    key={item.title}
                    target={item.target}
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#FAFCFF] sm:px-6"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.tone === "blue"
                          ? "bg-[#1768E8]"
                          : item.tone === "amber"
                            ? "bg-[#F59E0B]"
                            : item.tone === "green"
                              ? "bg-[#16A34A]"
                              : item.tone === "violet"
                                ? "bg-[#7C3AED]"
                                : "bg-[#98A2B3]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-[#27364A]">
                        {item.title}
                      </span>
                      <span className="mt-1 block max-w-2xl text-[11px] leading-5 text-[#8A95A5]">
                        {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-[#1768E8] opacity-0 transition group-hover:opacity-100">
                      {item.action}<UiSymbol name="right" /></span>
                  </WorkspaceActionButton>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] bg-[#0B1220] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#1768E8]/35 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#5B9BFF]/15 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#BBD7FF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#72A8FF]" />
                    Client portal
                  </span>
                  <IconArrowUpRight className="h-4 w-4 text-white/35" />
                </div>
                <h3 className="mt-7 max-w-[260px] text-[25px] font-semibold leading-[1.08] tracking-[-0.045em]">
                  A cleaner way to get work approved.
                </h3>
                <p className="mt-3 text-[11px] leading-5 text-white/45">
                  Your client gets a focused review experience. You keep the production workspace.
                </p>
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold text-[#1768E8] transition hover:-translate-y-0.5"
                >
                  Open client view
                  <IconArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[26px] border border-[#DFE6EF] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.035)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#98A2B3]">
                    Approval health
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-[#101828]">
                    Client review
                  </h3>
                </div>
                <span className="text-[20px] font-semibold tracking-[-0.04em] text-[#1768E8]">
                  {calendar.posts.length
                    ? Math.round((approvedCount / calendar.posts.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="mt-5">
                <ApprovalAnalytics
                  posts={calendar.posts.map((post) => ({
                    approvalStatus: post.approvalStatus,
                    hasContent: post.assets.length > 0,
                  }))}
                />
              </div>
            </div>

            <div className="rounded-[26px] border border-[#DFE6EF] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.035)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#98A2B3]">
                    Publishing mix
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-[#101828]">
                    Where the work is going
                  </h3>
                </div>
                <WorkspaceActionButton
                  target="analytics"
                  className="text-[10px] font-bold text-[#1768E8]"
                ><>{" Full analytics "}<UiSymbol name="right" />{" "}</></WorkspaceActionButton>
              </div>
              <div className="mt-4">
                <PlatformAnalytics
                  posts={calendar.posts.map((post) => ({
                    platform: requirePostPlatform(post.platform),
                    postDate: post.postDate.toISOString(),
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "content",
      label: "Content",
      eyebrow: "Production",
      title: "Build the work.",
      description:
        "Plan, attach creative, review feedback and move each piece toward approval.",
      group: "Workspace",
      content: (
        <div className="overflow-hidden rounded-[26px] border border-[#DCE5F0] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CalendarGrid
            calendarId={calendar.id}
            isOwner={isOwner}
            planStatus={calendar.planStatus}
            userRole={userRole}
            clientName={calendar.clientName}
            permissions={permissions}
            initialPosts={calendarPosts}
          />
        </div>
      ),
    },
    ...(can("people.view") ? [{
      id: "team" as const, label: "People", eyebrow: "Team & permissions", title: "The right people. The right access.",
      description: "Invite teammates, set clear roles, and choose the features they can use.", group: "Collaboration" as const,
      content: <InviteCollaboratorForm calendarId={calendar.id} />,
    }] : []),
    {
      id: "analytics",
      label: "Analytics & Reporting",
      eyebrow: "Insights",
      title: "Know what is moving.",
      description:
        "Explore social performance, post metrics, new leads and hot opportunities. Use AI recommendations to guide your next content batch.",
      group: "Insights",
      content: (
        <div className="space-y-6">
          <CalendarReportingPanel
            calendarId={calendar.id}
            isManager={can("analytics.manage")}
            canViewLeads={can("leads.view")}
            canAnalyze={can("analytics.manage") && featureAccess("performanceRecommendations")}
            advancedAccess={featureAccess("advancedAnalytics")}
            recommendationsAccess={featureAccess("performanceRecommendations")}
            canApplyRecommendations={can("analytics.manage") && canEditWorkspace && aiActive && featureAccess("performanceRecommendations")}
          />
          <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-[26px] border border-[#DFE6EF] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.035)] sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#1768E8]">
              Distribution
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
              Content by platform
            </h3>
            <div className="mt-5">
              <PlatformAnalytics
                posts={calendar.posts.map((post) => ({
                  platform: requirePostPlatform(post.platform),
                  postDate: post.postDate.toISOString(),
                }))}
              />
            </div>
          </div>
          <div className="rounded-[26px] border border-[#DFE6EF] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.035)] sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#1768E8]">
              Review
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
              Approval progress
            </h3>
            <div className="mt-5">
              <ApprovalAnalytics
                posts={calendar.posts.map((post) => ({
                  approvalStatus: post.approvalStatus,
                  hasContent: post.assets.length > 0,
                }))}
              />
            </div>
          </div>
          </div>
        </div>
      ),
    },
    {
      id: "leads",
      label: "Leads",
      eyebrow: "Lead management",
      title: "Keep every opportunity moving.",
      description: "Manage social contacts and manually added leads, qualify interest, and keep contact details and follow-up status current.",
      group: "Leads & Messages",
      content: (
        <div>
          <CalendarLeadsPanel calendarId={calendar.id} canEdit={can("leads.manage")} featureLocked={!featureAccess("leadManagement")} />
        </div>
      ),
    },
    {
      id: "inbox",
      label: "Inbox",
      eyebrow: "Social inbox",
      title: "Manage conversations in one inbox.",
      description: "Read connected social and WhatsApp conversations, reply where supported and prepare AI replies using business knowledge.",
      group: "Leads & Messages",
      content: (
        <div>
        <SocialLeadInbox
          key={calendar.id}
          calendarId={calendar.id}
          isManager={can("workspace.manage")}
          isOwner={isOwner}
          canManageLeads={can("leads.manage")}
          canViewChannels={can("channels.view")}
          canReplyFromWorkspace={can("inbox.reply") && featureAccess("socialInbox")}
          inboxAccess={featureAccess("socialInbox")}
          autoRepliesAccess={featureAccess("aiAutoReplies")}
          businessKnowledge={can("knowledge.manage") ? {
            aiActive,
            businessSummary: calendar.aiBusinessSummary,
            summaryUpdatedAt: calendar.aiBusinessSummaryUpdatedAt?.toISOString() ?? null,
            documents: calendar.businessDocuments.map(doc => ({ id: doc.id, originalName: doc.originalName, createdAt: doc.createdAt.toISOString(), websiteUrl: doc.websiteUrl })),
          } : undefined}
        />
        </div>
      ),
    },
    {
      id: "access",
      label: "Client",
      eyebrow: "Client experience",
      title: "Give the client a beautiful front door.",
      description:
        "Keep the private review link and access credentials together, ready to share.",
      group: "Client",
      content: (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0B1220] p-7 text-white shadow-[0_18px_50px_rgba(15,23,42,0.13)] md:p-9">
            <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-[#1768E8]/35 blur-3xl" />
            <div className="relative max-w-2xl">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8EB9FF]">
                Private client view
              </p>
              <h3 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.055em] md:text-[42px]">
                The work should look as good as the work you made.
              </h3>
              <p className="mt-4 max-w-xl text-[12px] leading-6 text-white/45">
                Share a dedicated client-facing experience instead of exposing the production workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[11px] font-bold text-[#1768E8] transition hover:-translate-y-0.5"
                >
                  Open client view <IconArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <div className="flex min-w-0 items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] text-white/45">
                  <span className="truncate">{clientUrl}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#DFE6EF] bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.045)]">
  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#98A2B3]">
    Access credentials
  </p>

  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
    Private workspace password
  </h3>

  <p className="mt-2 text-[11px] leading-5 text-[#667085]">
    Only share this with people who should see the client-facing view.
  </p>

  <div
    className="mt-7 rounded-2xl border border-[#D8E0EA] bg-[#101828] p-4"
    data-password-display
  >
    <CalendarPasswordDisplay
      calendarId={calendar.id}
      accessCode={calendar.accessCode ?? ""}
      canManage={can("workspace.manage")}
    />
  </div>
</div>
        </div>
      ),
    },
    ...((can("channels.view") || can("knowledge.view") || can("ai.generate"))
  ? [
          {
            id: "channels" as const,
            label: "Channels",
            eyebrow: "Publishing",
            title: "Connect the channels behind the work.",
            description:
              "Connect this client’s social and messaging accounts and manage their access here.",
            group: "Publishing" as const,
            content: (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                <InstagramConnectionCard
  calendarId={calendar.id}
  username={calendar.instagramUsername}
  connectedAt={calendar.instagramConnectedAt?.toISOString() ?? null}
  isManager={can("channels.manage")}
/>

<TikTokConnectionCard
  calendarId={calendar.id}
  username={calendar.tikTokUsername}
  connectedAt={calendar.tikTokConnectedAt?.toISOString() ?? null}
  isManager={can("channels.manage")}
/>
                <AdditionalChannelCard
                  channel="facebook"
                  calendarId={calendar.id}
                  accountName={calendar.facebookPageName}
                  connectedAt={calendar.facebookConnectedAt?.toISOString() ?? null}
                  isManager={can("channels.manage")}
                />
                <AdditionalChannelCard
                  channel="linkedin"
                  calendarId={calendar.id}
                  accountName={calendar.linkedinName}
                  connectedAt={calendar.linkedinConnectedAt?.toISOString() ?? null}
                  isManager={can("channels.manage")}
                />
                <WhatsAppConnectionCard calendarId={calendar.id} isManager={can("channels.manage")} />
                <AdditionalChannelCard
                  channel="x"
                  calendarId={calendar.id}
                  accountName={calendar.xUsername}
                  connectedAt={calendar.xConnectedAt?.toISOString() ?? null}
                  isManager={can("channels.manage")}
                />
              </div>
            ),
          },
          {
            id: "knowledge" as const,
            label: "Knowledge",
            eyebrow: "AI Studio · context",
            title: "Give AI the context this client deserves.",
            description:
              "Keep the client's brand, products, voice and source material close to every generation.",
            group: "AI Studio" as const,
            content: (
              <BusinessKnowledgeCard
                canEdit={can("knowledge.manage")}
                calendarId={calendar.id}
                aiActive={aiActive}
                businessSummary={calendar.aiBusinessSummary}
                summaryUpdatedAt={calendar.aiBusinessSummaryUpdatedAt?.toISOString() ?? null}
                lastResearchedAt={calendar.aiLastResearchedAt?.toISOString() ?? null}
                documents={calendar.businessDocuments.map((doc) => ({
                  id: doc.id,
                  originalName: doc.originalName,
                  createdAt: doc.createdAt.toISOString(),
                  websiteUrl: doc.websiteUrl,
                }))}
              />
            ),
          },
          {
            id: "generate" as const,
            label: "Generate",
            eyebrow: "AI Studio · create",
            title: "Turn context into the next content batch.",
            description:
              "Set the creative direction, choose the channels and generate drafts that stay grounded in this client's world.",
            group: "AI Studio" as const,
            content: (
              <div className="relative overflow-hidden rounded-[28px] border border-[#CFE0FF] bg-[linear-gradient(145deg,#F4F8FF,#FFFFFF_48%,#EEF5FF)] p-1 shadow-[0_18px_55px_rgba(23,104,232,0.08)]">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#1768E8]/10 blur-3xl" />
                <div className="relative">
                  <AiContentGeneratorCard
                    calendarId={calendar.id}
                    hasBusinessSummary={!!calendar.aiBusinessSummary}
                    performanceRecommendationsAccess={featureAccess("performanceRecommendations")}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "publish" as const,
            label: "Client delivery",
            eyebrow: "Client review & delivery",
            title: "Put the approved plan into the world.",
            description:
              "Control the client-facing plan, header and publication state from one focused publishing room.",
            group: "Publishing" as const,
            content: (
              <div
                id="publish"
                className="overflow-hidden rounded-[26px] border border-[#DFE6EF] bg-white p-2 shadow-[0_14px_44px_rgba(15,23,42,0.045)]"
              >
                <CalendarPlanStatus
                  calendarId={calendar.id}
                  planStatus={calendar.planStatus}
                  planApprovalNote={calendar.planApprovalNote}
                  headerTitle={calendar.headerTitle}
                  headerDescription={calendar.headerDescription}
                  headerBannerDesktopUrl={calendar.headerBannerDesktopUrl}
                  headerBannerMobileUrl={calendar.headerBannerMobileUrl}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
    <CalendarPaymentCallbackHandler />
    <CalendarWorkspaceShell
      clientName={calendar.clientName}
      clientUrl={can("delivery.manage") ? clientUrl : ""}
      isManager={isManager}
      settings={can("workspace.manage") ?
        <CalendarSettingsMenu
          calendarId={calendar.id}
          clientName={calendar.clientName}
          userRole={can("workspace.manage") ? "EDIT_CALENDAR" : "VIEW_ONLY"}
          isManager={isOwner}
        /> : undefined
      }
     publishAction={
  can("delivery.manage") && workspaceActive ? (
    <PublishTrigger className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#1768E8] px-4 py-3 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(23,104,232,0.20)] transition-all hover:-translate-y-0.5 hover:bg-[#125CCF] hover:shadow-[0_14px_30px_rgba(23,104,232,0.24)]">
      Publish workspace <span aria-hidden><><UiSymbol name="right" /></></span>
    </PublishTrigger>
  ) : undefined
}
      sections={sections.filter(section => {
        const required: Record<string, TeamPermission> = { overview: "workspace.manage", content: "calendar.view", team: "people.view", analytics: "analytics.view", inbox: "inbox.view", leads: "leads.view", access: "delivery.manage", channels: "channels.view", knowledge: "knowledge.view", generate: "ai.generate", publish: "delivery.manage" };
        if (section.id === "overview") return can("workspace.manage") && can("calendar.view") && can("analytics.view") && can("inbox.view") && can("leads.view");
        return can(required[section.id]);
      }).map(section => ({ ...section, content: (
        <>
          {agencyTrial && <WorkspaceFeatureNotice trial paidPlan={calendar.manager.contentWorkspaceBillingStatus === "ACTIVE" ? calendar.manager.contentWorkspacePlan : null} trialEndsAt={calendar.manager.contentWorkspaceTrialEndsAt} />}
          {!workspaceActive && <WorkspaceFeatureNotice />}
          {!workspaceActive && !["overview", "analytics", "inbox", "leads", "team"].includes(section.id)
            ? <fieldset disabled className="min-w-0">{section.content}</fieldset>
            : section.content}
        </>
      ) }))}
    />
    </>
  );
}
