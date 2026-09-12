"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ClientCalendarView from "@/components/calendars/ClientCalendarView";
import InstagramPreview from "@/components/calendars/InstagramPreview";
import TikTokPreview from "@/components/calendars/TikTokPreview";

type WorkspaceView = "overview" | "calendar" | "instagram" | "tiktok" | "review";

type Platform =
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "X"
  | "LINKEDIN";

type ApprovalStatus = "PENDING" | "APPROVED" | "NEEDS_REVISION";

type CalendarPost = {
  id: string;
  postDate: string;
  platform: Platform;
  postType: string | null;
  category: string | null;
  caption: string | null;
  contentIdea: string | null;
  cta: string | null;
  hashtags: string | null;
  taggedAccounts: string | null;
  linkUrl: string | null;
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  assets: Array<{
    id: string;
    mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
    contentUrl: string;
  }>;
  videoComments: Array<{
    id: string;
    authorName: string | null;
    authorEmail: string;
    note: string;
    videoTimestampSeconds: number;
  }>;
  customFields: Array<{
    id: string;
    label: string;
    value: string;
  }>;
};

type PreviewAsset = {
  id: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  contentUrl: string;
};

type PreviewPost = Omit<CalendarPost, "assets"> & {
  assets: PreviewAsset[];
};

type Props = {
  slug: string;
  clientName: string;
  planStatus: string;
  displayTitle: string;
  displayDescription: string;
  desktopBannerUrl: string | null;
  mobileBannerUrl: string | null;
  posts: CalendarPost[];
  stats: {
    totalPosts: number;
    approvedPosts: number;
    pendingPosts: number;
    revisionPosts: number;
    totalAssets: number;
    approvalPercentage: number;
  };
};

function Icon({
  name,
  className = "",
}: {
  name:
    | "grid"
    | "calendar"
    | "instagram"
    | "tiktok"
    | "review"
    | "check"
    | "clock"
    | "message"
    | "lock"
    | "arrow"
    | "spark";
  className?: string;
}) {
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 1 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
      </svg>
    );
  }

  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2.5v4M16 2.5v4M3 9h18" />
          <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="m8 11 2.2 2.2L16 7.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M19 4H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3l4 3 4-3h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
          <path d="M7 9h10M7 12h6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
          <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
        </svg>
      );
  }
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[12px] font-medium transition-all duration-200",
        active
          ? "bg-[#2478FF] text-white shadow-[0_10px_24px_rgba(36,120,255,0.22)]"
          : "text-white/45 hover:bg-white/[0.055] hover:text-white",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-white/12 text-white" : "bg-white/[0.035] text-white/40 group-hover:text-white/75",
        ].join(" ")}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className={[
          "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold",
          active ? "bg-white/15 text-white" : "bg-[#F7B742]/10 text-[#F7B742]",
        ].join(" ")}>
          {count}
        </span>
      )}
    </button>
  );
}

function ViewHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">
        {description}
      </p>
    </div>
  );
}

export default function ClientCalendarWorkspace({
  slug,
  clientName,
  planStatus,
  displayTitle,
  displayDescription,
  desktopBannerUrl,
  mobileBannerUrl,
  posts,
  stats,
}: Props) {
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");

  // Keyboard navigation makes the workspace feel like an application rather than
  // a collection of page anchors.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === "1") setActiveView("overview");
      if (event.altKey && event.key === "2") setActiveView("calendar");
      if (event.altKey && event.key === "3") setActiveView("instagram");
      if (event.altKey && event.key === "4") setActiveView("tiktok");
      if (event.altKey && event.key === "5") setActiveView("review");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const previewPosts = useMemo<PreviewPost[]>(
    () =>
      posts.map((post) => ({
        ...post,
        assets: post.assets.map((asset) => ({
          id: asset.id,
          mediaType:
            asset.mediaType === "VIDEO"
              ? "VIDEO"
              : asset.mediaType === "DOCUMENT"
                ? "DOCUMENT"
                : asset.mediaType === "PDF"
                  ? "PDF"
                  : "PHOTO",
          contentUrl: asset.contentUrl,
        })),
        videoComments: post.videoComments.map((comment) => ({
          ...comment,
          authorEmail: comment.authorEmail || "",
        })),
      })),
    [posts],
  );

  const reviewPosts = useMemo(
    () => posts.filter((post) => post.approvalStatus !== "APPROVED"),
    [posts],
  );

  const navigate = (view: WorkspaceView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mobileItems: Array<{
    view: WorkspaceView;
    label: string;
    icon: Parameters<typeof Icon>[0]["name"];
    count?: number;
  }> = [
    { view: "overview", label: "Overview", icon: "grid" },
    { view: "calendar", label: "Calendar", icon: "calendar" },
    { view: "instagram", label: "Instagram", icon: "instagram" },
    { view: "tiktok", label: "TikTok", icon: "tiktok" },
    { view: "review", label: "Review", icon: "review", count: reviewPosts.length },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090B] text-white">
      {/* Mobile app header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#08090B]/94 backdrop-blur-2xl lg:hidden">
        <div className="flex h-[68px] items-center gap-3 px-4">
          <Image
            src="/images/logo/swwhite.svg"
            alt="Showwork"
            width={80}
            height={20}
            className="h-5 w-auto shrink-0"
            priority
          />
          <div className="h-5 w-px bg-white/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/80">{clientName}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/30">
              Client workspace
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
            <Icon name="lock" className="h-4 w-4 text-white/40" />
          </span>
        </div>

        <div className="border-t border-white/[0.055] px-3 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {mobileItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => navigate(item.view)}
                className={[
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition-all",
                  activeView === item.view
                    ? "bg-[#2478FF] text-white"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
                {item.count ? (
                  <span className="rounded-full bg-[#F7B742]/10 px-1.5 py-0.5 text-[8px] text-[#F7C766]">
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Persistent desktop navigation */}
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0B0D10] lg:flex">
          <div className="border-b border-white/[0.07] px-5 py-5">
            <Image
              src="/images/logo/swwhite.svg"
              alt="Showwork"
              width={80}
              height={20}
              className="h-5 w-auto"
              priority
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-5">
            <div className="mb-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#68B2FF]">
                  <Icon name="spark" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/85">{clientName}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/28">
                    Private workspace
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.025] px-2.5 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#43E097] shadow-[0_0_10px_rgba(67,224,151,0.65)]" />
                <span className="text-[9px] font-medium text-white/40">Secure client access</span>
              </div>
            </div>

            <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              Workspace
            </div>
            <div className="space-y-1">
              <SidebarItem active={activeView === "overview"} onClick={() => navigate("overview")} icon="grid" label="Overview" />
              <SidebarItem active={activeView === "calendar"} onClick={() => navigate("calendar")} icon="calendar" label="Content Calendar" />
            </div>

            <div className="mb-2 mt-7 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              Previews
            </div>
            <div className="space-y-1">
              <SidebarItem active={activeView === "instagram"} onClick={() => navigate("instagram")} icon="instagram" label="Instagram" />
              <SidebarItem active={activeView === "tiktok"} onClick={() => navigate("tiktok")} icon="tiktok" label="TikTok" />
            </div>

            <div className="mb-2 mt-7 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              Review
            </div>
            <div className="space-y-1">
              <SidebarItem
                active={activeView === "review"}
                onClick={() => navigate("review")}
                icon="review"
                label="Review Centre"
                count={reviewPosts.length}
              />
            </div>
          </div>

          <div className="border-t border-white/[0.07] p-3.5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Icon name="lock" className="h-3.5 w-3.5 text-white/35" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-white/55">Private workspace</p>
                  <p className="mt-0.5 text-[9px] text-white/22">Powered by Showwork</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Everything below stays mounted. Only the active workspace view changes. */}
        <section className="min-w-0 flex-1">
          <header className="hidden h-[68px] items-center border-b border-white/[0.07] bg-[#08090B]/90 px-6 backdrop-blur-2xl lg:flex xl:px-9">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
                {activeView === "overview"
                  ? "Workspace"
                  : activeView === "calendar"
                    ? "Content"
                    : activeView === "review"
                      ? "Client review"
                      : "Social preview"}
              </p>
              <p className="mt-1 text-xs font-medium text-white/65">{clientName}</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-[#43E097]/15 bg-[#43E097]/[0.07] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#72E8AC]">
                Private
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                <Icon name="lock" className="h-4 w-4 text-white/40" />
              </span>
            </div>
          </header>

          {/* Hero is part of the persistent shell and does not reload between views. */}
          <div className="relative isolate overflow-hidden border-b border-white/[0.06]">
            <div className="absolute inset-0 h-[310px]">
              {mobileBannerUrl && (
                <img
                  src={mobileBannerUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover sm:hidden"
                />
              )}
              {desktopBannerUrl && (
                <img
                  src={desktopBannerUrl}
                  alt=""
                  className="absolute inset-0 hidden h-full w-full object-cover sm:block"
                />
              )}
              {!desktopBannerUrl && !mobileBannerUrl && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 15% 10%, rgba(36,120,255,0.28), transparent 32%), radial-gradient(circle at 88% 8%, rgba(124,58,237,0.17), transparent 30%), #08090B",
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-[#08090B]/35 via-[#08090B]/60 to-[#08090B]" />
            </div>

            <div className="relative px-5 pb-9 pt-11 sm:px-8 sm:pb-10 sm:pt-13 xl:px-9">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/30 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55 backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#43E097] shadow-[0_0_10px_rgba(67,224,151,0.65)]" />
                  Client content workspace
                </div>
                <h1 className="mt-5 max-w-3xl text-[2.2rem] font-semibold leading-[1] tracking-[-0.055em] text-white sm:text-5xl xl:text-6xl">
                  {displayTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/48 sm:text-[15px]">
                  {displayDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 pb-20 pt-7 sm:px-8 sm:pt-9 xl:px-9">
            <div className="animate-[showworkViewIn_220ms_ease-out]">
              {activeView === "overview" && (
                <div className="mx-auto max-w-6xl">
                  <ViewHeader
                    eyebrow="Overview"
                    title="Everything important, at a glance."
                    description="Jump directly into your calendar, social previews or anything waiting for your review."
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Planned", value: stats.totalPosts, sub: "posts in workspace", icon: "calendar" as const, color: "#2478FF" },
                      { label: "Approved", value: stats.approvedPosts, sub: `${stats.approvalPercentage}% of content`, icon: "check" as const, color: "#43E097" },
                      { label: "Needs attention", value: stats.pendingPosts + stats.revisionPosts, sub: "awaiting your action", icon: "review" as const, color: "#F7B742" },
                      { label: "Files", value: stats.totalAssets, sub: "attached assets", icon: "grid" as const, color: "#A78BFA" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/[0.065] bg-white/[0.025] p-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: stat.color, background: `${stat.color}12` }}>
                          <Icon name={stat.icon} className="h-4 w-4" />
                        </div>
                        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">{stat.label}</p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{stat.value}</p>
                        <p className="mt-1 text-[10px] text-white/30">{stat.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 grid gap-3 lg:grid-cols-2">
                    <button type="button" onClick={() => navigate("calendar")} className="group rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-6 text-left transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
                      <div className="flex items-start justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#68B2FF]"><Icon name="calendar" className="h-5 w-5" /></span>
                        <Icon name="arrow" className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/55" />
                      </div>
                      <p className="mt-6 text-sm font-semibold text-white">Content calendar</p>
                      <p className="mt-2 text-xs leading-5 text-white/35">Search, filter and review every planned post without moving through a long page.</p>
                    </button>

                    <button type="button" onClick={() => navigate("review")} className="group rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-6 text-left transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
                      <div className="flex items-start justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7B742]/10 text-[#F7C766]"><Icon name="review" className="h-5 w-5" /></span>
                        <Icon name="arrow" className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/55" />
                      </div>
                      <p className="mt-6 text-sm font-semibold text-white">Review centre</p>
                      <p className="mt-2 text-xs leading-5 text-white/35">
                        {reviewPosts.length ? `${reviewPosts.length} ${reviewPosts.length === 1 ? "post is" : "posts are"} waiting for your attention.` : "Nothing is waiting for your attention right now."}
                      </p>
                    </button>
                  </div>

                  <div className="mt-7 rounded-[24px] border border-white/[0.065] bg-[#0E1014] p-6 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">Approval progress</p>
                        <p className="mt-2 text-lg font-semibold text-white">{stats.approvedPosts} of {stats.totalPosts} posts approved</p>
                        <p className="mt-1 text-xs text-white/32">{reviewPosts.length ? "Review the outstanding posts from the Review Centre." : "Your workspace is fully up to date."}</p>
                      </div>
                      <div className="w-full max-w-xs">
                        <div className="mb-2 flex items-center justify-between text-[10px] text-white/30"><span>Progress</span><span className="font-semibold text-white/60">{stats.approvalPercentage}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#2478FF] transition-all duration-500" style={{ width: `${stats.approvalPercentage}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === "calendar" && (
                <div className="mx-auto max-w-6xl">
                  <ViewHeader
                    eyebrow="Workspace / Calendar"
                    title="Your content plan."
                    description="Find content by month, platform, status or keyword and open any post for the full review experience."
                  />
                  <ClientCalendarView
                    slug={slug}
                    planStatus={planStatus}
                    clientName={clientName}
                    posts={posts}
                  />
                </div>
              )}

              {activeView === "instagram" && (
                <div className="mx-auto max-w-6xl">
                  <ViewHeader
                    eyebrow="Social preview"
                    title="Instagram"
                    description="See how the planned Instagram content comes together as a complete feed."
                  />
                  <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#080808] p-3 sm:p-6">
                    <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#E1306C]/10 blur-[110px]" />
                    <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#7C3AED]/10 blur-[110px]" />
                    <div className="relative z-10">
                      <InstagramPreview posts={previewPosts} clientName={clientName.trim() || "Your brand"} />
                    </div>
                  </div>
                </div>
              )}

              {activeView === "tiktok" && (
                <div className="mx-auto max-w-6xl">
                  <ViewHeader
                    eyebrow="Social preview"
                    title="TikTok"
                    description="Experience the planned vertical content as a viewer would move through the feed."
                  />
                  <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#050505] p-3 sm:p-6">
                    <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#25F4EE]/10 blur-[110px]" />
                    <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#FE2C55]/10 blur-[110px]" />
                    <div className="relative z-10">
                      <TikTokPreview posts={previewPosts} clientName={clientName.trim() || "Your brand"} />
                    </div>
                  </div>
                </div>
              )}

              {activeView === "review" && (
                <div className="mx-auto max-w-5xl">
                  <ViewHeader
                    eyebrow="Review centre"
                    title="What needs your attention?"
                    description="See exactly what is waiting for your decision, then jump into the calendar to review each post."
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#F7B742]/15 bg-[#F7B742]/[0.055] p-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7B742]/10 text-[#F7C766]"><Icon name="clock" className="h-4 w-4" /></div>
                      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Awaiting review</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{stats.pendingPosts}</p>
                    </div>
                    <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.045] p-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-400/10 text-red-300"><Icon name="message" className="h-4 w-4" /></div>
                      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Needs revision</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{stats.revisionPosts}</p>
                    </div>
                    <div className="rounded-2xl border border-[#43E097]/15 bg-[#43E097]/[0.045] p-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#43E097]/10 text-[#72E8AC]"><Icon name="check" className="h-4 w-4" /></div>
                      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Approved</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{stats.approvedPosts}</p>
                    </div>
                  </div>

                  {reviewPosts.length ? (
                    <div className="mt-7 rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">You have {reviewPosts.length} {reviewPosts.length === 1 ? "post" : "posts"} to review.</p>
                          <p className="mt-1 text-xs leading-5 text-white/35">Open the calendar and use the status filter to see exactly what requires your attention.</p>
                        </div>
                        <button type="button" onClick={() => navigate("calendar")} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-5 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(36,120,255,0.18)] transition hover:-translate-y-0.5">
                          Review posts <Icon name="arrow" className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-6 space-y-2">
                        {reviewPosts.slice(0, 8).map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => navigate("calendar")}
                            className="flex w-full items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3 text-left transition hover:bg-white/[0.045]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7B742]/[0.08] text-[#F7C766]">
                              <Icon name={post.approvalStatus === "NEEDS_REVISION" ? "message" : "clock"} className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-white/70">{post.contentIdea || post.caption || "Untitled post"}</span>
                              <span className="mt-1 block text-[9px] text-white/25">
                                {post.platform} · {new Date(post.postDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </span>
                            <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-white/20" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-7 rounded-[26px] border border-[#43E097]/15 bg-[#43E097]/[0.045] p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#43E097]/10 text-[#72E8AC]"><Icon name="check" className="h-5 w-5" /></div>
                      <p className="mt-5 text-sm font-semibold text-white">You&apos;re all caught up.</p>
                      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/35">There are no posts waiting for approval or revision.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes showworkViewIn {
          from { opacity: 0.65; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
