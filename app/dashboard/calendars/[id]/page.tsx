import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import {
  getCalendarRole,
  canAccessCalendar,
} from "@/lib/calendarPermissions";

import CalendarGrid from "@/components/calendars/CalendarGrid";
import CalendarPlanStatus from "@/components/calendars/CalendarPlanStatus";
import InviteCollaboratorForm from "@/components/calendars/InviteCollaboratorForm";
import CalendarSettingsMenu from "@/components/calendars/CalendarSettingsMenu";
import CalendarPasswordDisplay from "@/components/calendars/CalendarPasswordDisplay";
import RetryCalendarPaymentButton from "@/components/calendars/RetryCalendarPaymentButton";
import InstagramConnectionCard from "@/components/calendars/InstagramConnectionCard";
import TikTokConnectionCard from "@/components/calendars/TikTokConnectionCard";
import BusinessKnowledgeCard from "@/components/calendars/BusinessKnowledgeCard";
import AiContentGeneratorCard from "@/components/calendars/AiContentGeneratorCard";
import CopyLinkButton from "@/components/CopyLinkButton";
import PublishTrigger from "@/components/calendars/PublishTrigger";

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
          calendarBillingStatus: true,
          calendarTrialEndsAt: true,
          aiAssistantBillingStatus: true,
          aiAssistantTrialEndsAt: true,
        },
      },
      _count: {
        select: {
          collaborators: true,
        },
      },
      businessDocuments: {
        orderBy: { createdAt: "desc" },
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

  const userRole = await getCalendarRole(creator.id, id);

  if (!userRole) {
    notFound();
  }

  const isManager = calendar.managerId === creator.id;
  const totalMembers = 1 + calendar._count.collaborators;

  if (!canAccessCalendar(calendar.manager)) {
    const trialExpired = calendar.manager.calendarBillingStatus === "TRIAL";

    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(36,120,255,0.10), transparent 32%), #08090B",
        }}
      >
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div
            className="mb-7 flex h-16 w-16 items-center justify-center rounded-[22px]"
            style={{
              background: "rgba(239,68,68,0.09)",
              border: "1px solid rgba(239,68,68,0.16)",
            }}
          >
            <IconShield className="h-7 w-7 text-red-400" />
          </div>

          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#72A8FF]">
            Workspace inactive
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            {trialExpired ? "Your free trial has ended" : "Payment required"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            {isManager
              ? trialExpired
                ? "Your 3-day trial for this workspace is over. Subscribe to continue using it."
                : "This workspace's first payment was not completed, so it isn't active yet."
              : "This workspace isn't active right now. Check back once the manager completes payment."}
          </p>

          {isManager && (
            <div className="mt-7">
              <RetryCalendarPaymentButton calendarId={calendar.id} />
            </div>
          )}

          <Link
            href="/dashboard/calendars"
            className="mt-8 text-xs font-medium text-white/35 transition-colors hover:text-white"
          >
            ← Back to client workspaces
          </Link>
        </div>
      </main>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const clientUrl = `${appUrl}/social-calendar/${calendar.slug}`;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthPosts = calendar.posts.filter((post) => {
    const date = new Date(post.postDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const surface = "#FFFFFF";
  const surfaceSoft = "#F7F8FA";
  const pageBackground = "#F5F7FB";
  const pageText = "#0A0D12";
  const secondaryText = "#475467";
  const tertiaryText = "#667085";
  const border = "rgba(10,13,18,0.08)";

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: pageBackground, color: pageText }}
    >
      {/* ============================================================
          HERO — intentionally dark in both themes
      ============================================================ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 78% 5%, rgba(36,120,255,0.18), transparent 25%), radial-gradient(circle at 15% 80%, rgba(36,120,255,0.07), transparent 28%), #07090D",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-[-180px] h-[520px] w-[520px] rounded-full"
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 0 0 80px rgba(255,255,255,0.018), 0 0 0 160px rgba(255,255,255,0.012)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-160px] left-[20%] h-[360px] w-[360px] rounded-full"
          style={{
            background: "rgba(36,120,255,0.07)",
            filter: "blur(80px)",
          }}
        />

        <header className="relative z-10 border-b border-white/[0.08]">
          <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 md:px-8 xl:px-10">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/dashboard/calendars"
                className="group flex shrink-0 items-center gap-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
              >
                <span className="transition-transform group-hover:-translate-x-0.5">←</span>
                <span className="hidden sm:inline">Workspaces</span>
              </Link>

              <span className="hidden h-5 w-px bg-white/[0.08] sm:block" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-[#72A8FF]">
                  <IconCalendar className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{calendar.clientName}</p>
                  <p className="hidden truncate text-[10px] uppercase tracking-[0.16em] text-white/50 sm:block">
                    Content workspace
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/calendars/${calendar.id}/report`}
                download
                className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.08] sm:flex"
              >
                <IconDownload className="h-3.5 w-3.5" />
                Report
              </a>

              <CalendarSettingsMenu
                calendarId={calendar.id}
                clientName={calendar.clientName}
                userRole={userRole}
                isManager={isManager}
              />
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-16 pt-14 md:px-8 md:pb-20 md:pt-20 xl:px-10">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="max-w-4xl">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#72A8FF]">
                  Client content workspace
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                  Active
                </span>
              </div>

              <h1 className="max-w-5xl text-[clamp(3rem,7vw,6.8rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-white">
                {calendar.clientName}
                <span className="text-white/20">.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                One place to plan, review and manage this client&apos;s content — continuously, as the relationship grows.
              </p>
            </div>

            <div className="lg:pb-1">
              <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                    Client experience
                  </span>
                  <IconArrowUpRight className="h-4 w-4 text-white/25" />
                </div>
                <p className="text-sm font-medium leading-6 text-white/70">
                  Give your client a clean, private place to see what&apos;s planned and review their content.
                </p>
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5"
                >
                  Open client view
                  <IconArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 border-t border-white/[0.08] pt-5 sm:grid-cols-4">
            <div className="border-r border-white/[0.08] pr-5 sm:px-5 sm:first:pl-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Planned</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{calendar.posts.length}</p>
            </div>
            <div className="border-b border-white/[0.08] pb-4 pl-5 sm:border-b-0 sm:border-r sm:px-5 sm:pb-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">This month</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{thisMonthPosts.length}</p>
            </div>
            <div className="border-r border-white/[0.08] pt-4 pr-5 sm:border-b-0 sm:px-5 sm:pt-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Team</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{totalMembers}</p>
              <p className="mt-1 text-[10px] text-white/35">{totalMembers === 1 ? "member" : "members"}</p>
            </div>
            <div className="pl-5 pt-4 sm:pt-0 sm:px-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Access</p>
              <p className="mt-2 text-sm font-semibold text-white">Private</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN WORKSPACE
      ============================================================ */}
      <div className="mx-auto max-w-[1500px] px-5 pb-28 md:px-8 md:pb-24 xl:px-10">
        {/* Workspace command rail */}
        <nav
          className="sticky top-3 z-40 -mt-6 flex w-full items-center gap-1 overflow-x-auto rounded-[18px] p-1.5 scrollbar-none"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(10,13,18,0.08)",
            boxShadow: "0 18px 50px rgba(15,23,42,0.11)",
            backdropFilter: "blur(22px)",
          }}
          aria-label="Workspace navigation"
        >
          <div className="hidden shrink-0 items-center gap-2 px-2.5 lg:flex">
            <span className="h-2 w-2 rounded-full bg-[#2478FF] shadow-[0_0_0_4px_rgba(36,120,255,0.10)]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">
              Workspace
            </span>
          </div>

          {isManager && (
            <a
              href="#team"
              className="shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-[#475467] transition-all hover:bg-[#F2F4F7] hover:text-[#101828]"
            >
              Team
            </a>
          )}

          <a
            href="#calendar"
            className="shrink-0 rounded-xl bg-[#EEF5FF] px-3.5 py-2.5 text-[11px] font-semibold text-[#2478FF] transition-all hover:bg-[#E4F0FF]"
          >
            Content
          </a>

          <a
            href="#overview"
            className="shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-[#475467] transition-all hover:bg-[#F2F4F7] hover:text-[#101828]"
          >
            Insights
          </a>

          <a
            href="#access"
            className="shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-[#475467] transition-all hover:bg-[#F2F4F7] hover:text-[#101828]"
          >
            Client access
          </a>

          {isManager && (
            <>
              <a
                href="#instagram"
                className="shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-[#475467] transition-all hover:bg-[#F2F4F7] hover:text-[#101828]"
              >
                Publishing
              </a>
              <a
                href="#ai-assistant"
                className="shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-[#475467] transition-all hover:bg-[#F2F4F7] hover:text-[#101828]"
              >
                AI studio
              </a>
              <PublishTrigger className="ml-auto shrink-0 rounded-xl bg-[#0A0D12] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#161A22]">
                Publish
              </PublishTrigger>
            </>
          )}
        </nav>

        {/* ==========================================================
            TEAM — intentionally before the calendar
        =========================================================== */}
        {isManager && (
          <section id="team" className="scroll-mt-8 pt-12 md:pt-16">
            <div
              className="relative overflow-hidden rounded-[32px]"
              style={{
                background: "linear-gradient(135deg, #0A0F18 0%, #101927 58%, #0B111A 100%)",
                border: "1px solid rgba(36,120,255,0.16)",
                boxShadow: "0 24px 70px rgba(15,23,42,0.14)",
              }}
            >
              <div
                className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full blur-3xl"
                style={{ background: "rgba(36,120,255,0.16)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full blur-3xl"
                style={{ background: "rgba(36,120,255,0.07)" }}
              />

              <div className="relative z-10 p-6 md:p-9 lg:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-5 flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                        Collaboration
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        {totalMembers} {totalMembers === 1 ? "member" : "members"}
                      </span>
                    </div>

                    <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                      Build the right team around the client.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 md:text-[15px]">
                      Invite designers, content creators and other collaborators, give each person the right level of access, and remove members whenever the team changes.
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:w-[390px]">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">Members</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{totalMembers}</p>
                      <p className="mt-1 text-[10px] text-white/35">Workspace team</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">Owner</p>
                      <p className="mt-2 truncate text-sm font-semibold text-white">You</p>
                      <p className="mt-1 text-[10px] text-white/35">Full control</p>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-blue-300/10 bg-blue-400/[0.07] p-4 sm:col-span-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-200/60">Access</p>
                      <p className="mt-2 text-sm font-semibold text-white">Role-based</p>
                      <p className="mt-1 text-[10px] text-white/40">Change or remove</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 border-t border-white/[0.08] bg-white/[0.025] p-5 md:p-7">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Team access</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">
                      Invite, update or remove access.
                    </p>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[0.07] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-300">
                    {totalMembers} {totalMembers === 1 ? "member" : "members"}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white">
                  <div className="p-1.5 sm:p-2">
                    <InviteCollaboratorForm calendarId={calendar.id} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/35">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Invite new members
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Adjust permissions
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Remove access when needed
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==========================================================
            CALENDAR
        =========================================================== */}
        <section id="calendar" className="scroll-mt-8 pt-12 md:pt-16">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">
                Content planner
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-4xl" style={{ color: pageText }}>
                Plan the work. See it clearly.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: secondaryText }}>
                Your calendar, previews, approvals and content all live in one place.
              </p>
            </div>
            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0A0D12] px-4 py-2.5 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Preview client view
              <IconArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-8 overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.07)]" style={{ background: surface, border: `1px solid ${border}` }}>
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
                instagramPublishStatus: p.instagramPublishStatus,
                instagramPermalink: p.instagramPermalink,
                instagramPublishError: p.instagramPublishError,
                tikTokPublishStatus: p.tikTokPublishStatus,
                tikTokPrivacyLevel: p.tikTokPrivacyLevel,
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
              }))}
            />
          </div>
        </section>

        {/* ==========================================================
            OVERVIEW
        =========================================================== */}
        <section id="overview" className="scroll-mt-8 pt-16 md:pt-24">
          <div className="mb-7 max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">Overview</p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em]" style={{ color: pageText }}>
              Know what&apos;s happening without digging.
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: secondaryText }}>
              A simple view of the workspace, approval activity and content health.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[26px] p-6 md:p-7" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#667085" }}>
                    Publishing activity
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: pageText }}>
                    Content by platform
                  </p>
                </div>
                <IconCalendar className="h-5 w-5" style={{ color: "#667085" }} />
              </div>
              <PlatformAnalytics
                posts={calendar.posts.map((p) => ({
                  platform: p.platform,
                  postDate: p.postDate.toISOString(),
                }))}
              />
            </div>

            <div className="rounded-[26px] p-6 md:p-7" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#667085" }}>
                    Review health
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: pageText }}>
                    Approval progress
                  </p>
                </div>
                <IconSpark className="h-5 w-5" style={{ color: "#2478FF" }} />
              </div>
              <ApprovalAnalytics
                posts={calendar.posts.map((p) => ({
                  approvalStatus: p.approvalStatus,
                  hasContent: p.assets.length > 0,
                }))}
              />
            </div>
          </div>

          <div className="mt-4 rounded-[26px] border border-[#0A0D12]/[0.08] bg-[#0A0F18] p-6 text-white md:p-7 lg:mt-0">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300/70">Team snapshot</p>
                <p className="mt-2 text-sm font-semibold text-white">{totalMembers} {totalMembers === 1 ? "member" : "members"} on this workspace</p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-white/45">
                  Keep collaborators close to the work. You can invite people, control their access and remove them when they are no longer involved.
                </p>
              </div>
              <IconUsers className="h-5 w-5 shrink-0 text-blue-300" />
            </div>
            {isManager && (
              <a href="#team" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[11px] font-semibold text-[#0A0D12] transition-transform hover:-translate-y-0.5">
                Manage team
                <IconArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>

        {/* ==========================================================
            ACCESS
        =========================================================== */}
        <section id="access" className="scroll-mt-8 pt-16 md:pt-24">
          <div className="mb-7 max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">Client access</p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em]" style={{ color: pageText }}>
              One clean link to the client experience.
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: secondaryText }}>
              Keep the workspace private while making it effortless for the client to review their content.
            </p>
          </div>

          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px]" style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="grid w-full min-w-0 max-w-full lg:grid-cols-[minmax(0,1fr)_500px] xl:grid-cols-[minmax(0,1fr)_540px]">
              <div className="min-w-0 p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-[#2478FF]">
                    <IconLink className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: pageText }}>Workspace link</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "#667085" }}>Private client-facing experience</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center" style={{ background: surfaceSoft, border: `1px solid ${border}` }}>
                  <a
                    href={clientUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate px-2 text-xs font-medium text-[#2478FF] hover:text-blue-500"
                  >
                    {clientUrl}
                  </a>
                  <CopyLinkButton url={clientUrl} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={clientUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2478FF] px-4 py-2.5 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Open client view
                    <IconArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-medium" style={{ background: surfaceSoft, color: "#475467" }}>
                    <IconShield className="h-3.5 w-3.5" />
                    Password protected
                  </span>
                </div>
              </div>

              {isManager && (
                <div
                  className="min-w-0 max-w-full border-t p-6 lg:border-l lg:border-t-0 md:p-8"
                  style={{ borderColor: border }}
                >
                  <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                    <div className="min-w-0 p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-[#72A8FF]">
                            <IconShield className="h-[18px] w-[18px]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-5 text-white">
                              Access password
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">
                              Private client access
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                          Protected
                        </span>
                      </div>

                      <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
                        Share this password with your client together with the workspace link.
                      </p>
                    </div>

                    <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
                      <div
                        data-password-display
                        className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#2A3A51] bg-[#111B29] p-3 sm:p-4"
                      >
                        <CalendarPasswordDisplay
                          calendarId={calendar.id}
                          accessCode={calendar.accessCode ?? ""}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ==========================================================
            PUBLISHING CONTROL CENTER
        =========================================================== */}
        {isManager && (
          <section id="instagram" className="scroll-mt-24 pt-16 md:pt-24">
            <div className="relative overflow-hidden rounded-[34px] border border-[#172033] bg-[#080D15] shadow-[0_26px_80px_rgba(15,23,42,0.15)]">
              <div className="pointer-events-none absolute -right-28 -top-36 h-[420px] w-[420px] rounded-full bg-[#2478FF]/[0.14] blur-[90px]" />
              <div className="pointer-events-none absolute -bottom-40 left-[18%] h-72 w-72 rounded-full bg-[#2478FF]/[0.07] blur-[80px]" />

              <div className="relative border-b border-white/[0.07] px-6 py-7 md:px-9 md:py-9 lg:px-10">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                        Publishing control
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/45">
                        Automatic delivery
                      </span>
                    </div>

                    <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                      Approved here. Published there.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
                      Connect each client channel once. Approved posts can then move from the content plan to the live platform on schedule.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 lg:w-[330px]">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Instagram</p>
                      <p className="mt-2 text-xs font-semibold text-white">
                        {calendar.instagramUsername ? "Connected" : "Not connected"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">TikTok</p>
                      <p className="mt-2 text-xs font-semibold text-white">
                        {calendar.tikTokUsername ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bg-white/[0.025] p-5 md:p-7 lg:p-8">
                <div className="mb-5">
                  <p className="text-sm font-semibold text-white">Connected channels</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/40">
                    Manage authentication and publishing access for this client.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <InstagramConnectionCard
                    calendarId={calendar.id}
                    username={calendar.instagramUsername}
                    connectedAt={calendar.instagramConnectedAt?.toISOString() ?? null}
                  />
                  <TikTokConnectionCard
                    calendarId={calendar.id}
                    username={calendar.tikTokUsername}
                    connectedAt={calendar.tikTokConnectedAt?.toISOString() ?? null}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==========================================================
            AI CONTENT STUDIO
        =========================================================== */}
        {isManager && (
          <section id="ai-assistant" className="scroll-mt-24 pt-16 md:pt-24">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex h-7 items-center gap-2 rounded-full border border-[#CFE0FB] bg-[#EEF5FF] px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
                    AI content studio
                  </span>
                </div>

                <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.05em] text-[#101828] md:text-5xl">
                  Context in. Better content out.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#667085]">
                  Give Showwork real business context, then turn that understanding into thoughtful content batches you can review before they enter the calendar.
                </p>
              </div>

              <div className="flex max-w-xl gap-2 overflow-x-auto pb-1">
                {[
                  ["01", "Teach", "Business knowledge"],
                  ["02", "Generate", "Draft a content batch"],
                  ["03", "Review", "Approve before calendar"],
                ].map(([number, title, description]) => (
                  <div
                    key={number}
                    className="min-w-[150px] rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3.5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]"
                  >
                    <p className="text-[9px] font-bold tracking-[0.14em] text-[#2478FF]">{number}</p>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#101828]">{title}</p>
                    <p className="mt-0.5 text-[9px] leading-4 text-[#98A2B3]">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-[#DFE5EE] bg-[#EEF3F9] p-2 shadow-[0_20px_65px_rgba(15,23,42,0.07)] sm:p-3 lg:p-4">
              <div className="pointer-events-none absolute -right-32 -top-36 h-96 w-96 rounded-full bg-[#2478FF]/[0.06] blur-3xl" />

              <div className="relative grid grid-cols-1 gap-3 xl:grid-cols-2">
                <BusinessKnowledgeCard
                  calendarId={calendar.id}
                  aiActive={
                    calendar.manager.aiAssistantBillingStatus === "ACTIVE" ||
                    (calendar.manager.aiAssistantBillingStatus === "TRIAL" &&
                      !!calendar.manager.aiAssistantTrialEndsAt &&
                      calendar.manager.aiAssistantTrialEndsAt.getTime() > Date.now())
                  }
                  businessSummary={calendar.aiBusinessSummary}
                  summaryUpdatedAt={calendar.aiBusinessSummaryUpdatedAt?.toISOString() ?? null}
                  lastResearchedAt={calendar.aiLastResearchedAt?.toISOString() ?? null}
                  documents={calendar.businessDocuments.map((doc) => ({
                    id: doc.id,
                    originalName: doc.originalName,
                    createdAt: doc.createdAt.toISOString(),
                  }))}
                />

                {(calendar.manager.aiAssistantBillingStatus === "ACTIVE" ||
                  (calendar.manager.aiAssistantBillingStatus === "TRIAL" &&
                    !!calendar.manager.aiAssistantTrialEndsAt &&
                    calendar.manager.aiAssistantTrialEndsAt.getTime() > Date.now())) && (
                  <AiContentGeneratorCard
                    calendarId={calendar.id}
                    hasBusinessSummary={!!calendar.aiBusinessSummary}
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==========================================================
            CLIENT PLAN & PUBLISH
        =========================================================== */}
        <section id="publish" className="scroll-mt-24 pt-16 md:pt-24">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">
                Client plan
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-[#101828] md:text-4xl">
                Move the plan from working to ready.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#667085]">
                Finalise the client-facing plan, review its presentation and publish when everything is ready to share.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-3 py-2 text-[10px] font-semibold text-[#667085]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
              Publication controls
            </span>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#E1E6EE] bg-white p-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-2">
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
        </section>



        {/* ==========================================================
            CLOSING CTA
        =========================================================== */}
        <section className="pt-20 md:pt-28">
          <div
            className="relative overflow-hidden rounded-[36px] px-7 py-10 shadow-[0_28px_80px_rgba(15,23,42,0.18)] md:px-12 md:py-14"
            style={{
              background:
                "radial-gradient(circle at 88% 18%, rgba(36,120,255,0.24), transparent 28%), radial-gradient(circle at 15% 100%, rgba(36,120,255,0.08), transparent 30%), linear-gradient(135deg, #111721, #070A0F)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#72A8FF]">
                  Keep the relationship moving
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  The workspace that grows with the relationship.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
                  Plan the next idea, review the next draft and keep every client conversation connected to the work — without starting over.
                </p>
              </div>

              <a
                href={clientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                View client experience
                <IconArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {isManager && (
          <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-50 sm:bottom-5 sm:left-5">
            <PublishTrigger
              className="group inline-flex h-11 items-center gap-2 rounded-full border border-[#1768E8] bg-[#2478FF] px-4 text-xs font-semibold text-white shadow-[0_14px_36px_rgba(36,120,255,0.30)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] hover:shadow-[0_18px_42px_rgba(36,120,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/30 focus:ring-offset-2"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                +
              </span>
              Publish
              <span className="text-sm transition-transform group-hover:translate-x-0.5">→</span>
            </PublishTrigger>
          </div>
        )}

        <style>{`
          [data-password-display],
          [data-password-display] * { box-sizing: border-box; }

          [data-password-display] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }

          [data-password-display] > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          [data-password-display] > div > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          [data-password-display] button,
          [data-password-display] a,
          [data-password-display] input {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          [data-password-display] button,
          [data-password-display] a {
            white-space: nowrap !important;
          }

          @media (min-width: 640px) {
            [data-password-display] > div {
              flex-direction: row !important;
              align-items: center !important;
            }

            [data-password-display] > div > *:first-child {
              flex: 1 1 auto !important;
              width: auto !important;
            }

            [data-password-display] button,
            [data-password-display] a {
              width: auto !important;
              flex: 0 0 auto !important;
            }
          }
        `}</style>

        <footer className="flex flex-col gap-3 py-10 text-[10px] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between" style={{ color: "#667085" }}>
          <span>Showwork · Client content workspace</span>
          <Link href="/dashboard/calendars" className="transition-colors hover:opacity-70">
            All client workspaces →
          </Link>
        </footer>
      </div>
    </main>
  );
}