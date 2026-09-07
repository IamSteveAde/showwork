"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import CalendarVideoComments, { type CalendarVideoCommentData } from "@/components/calendars/CalendarVideoComments";
import InstagramPreview from "@/components/calendars/InstagramPreview";
import TikTokPreview from "@/components/calendars/TikTokPreview";

type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "X" | "LINKEDIN";
type ApprovalStatus = "PENDING" | "APPROVED" | "NEEDS_REVISION";

interface CalendarPostAssetData {
  id: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  contentUrl: string;
}

interface CalendarPostCustomFieldData {
  id: string;
  label: string;
  value: string;
}

interface CalendarPostData {
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
  assets: CalendarPostAssetData[];
  videoComments: CalendarVideoCommentData[];
  customFields: CalendarPostCustomFieldData[];
}

const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  INSTAGRAM: { label: "Instagram", color: "#E1306C" },
  TIKTOK: { label: "TikTok", color: "#00F2EA" },
  YOUTUBE: { label: "YouTube", color: "#FF0000" },
  FACEBOOK: { label: "Facebook", color: "#1877F2" },
  X: { label: "X", color: "#FFFFFF" },
  LINKEDIN: { label: "LinkedIn", color: "#0A66C2" },
};

const APPROVAL_META: Record<ApprovalStatus, { text: string; color: string; bg: string }> = {
  PENDING: { text: "Awaiting your review", color: "#FFCC00", bg: "rgba(255,204,0,0.12)" },
  APPROVED: { text: "You approved this", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  NEEDS_REVISION: { text: "You requested changes", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

// Same day-of-week color family as the manager's own view — anchored
// by Showwork's blue (Monday) and gold (Wednesday) — so the calendar
// looks and feels identical on both sides.
const DAY_COLORS = ["#FF6B4A", "#2478FF", "#6C5CE7", "#FFCC00", "#00C2A8", "#FF4D8D", "#9B59F6"];

function PlatformIcon({ platform, className, style }: { platform: Platform; className?: string; style?: React.CSSProperties }) {
  switch (platform) {
    case "INSTAGRAM":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.3a3 3 0 0 0-2.1 2.1C2 8.9 2 12 2 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C6.1 19 12 19 12 19s5.9 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.5.4-4.6.4-4.6Zm-11.9 3V9l5.2 3-5.2 3Z" />
        </svg>
      );
    case "FACEBOOK":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
        </svg>
      );
    case "X":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
        </svg>
      );
    case "LINKEDIN":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
        </svg>
      );
  }
}

function IconPin({ color, className }: { color: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="7" fill={color} />
      <circle cx="9.5" cy="7.5" r="2" fill="rgba(255,255,255,0.55)" />
      <path d="M12 16.5 L12 21" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </svg>
  );
}

function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="metadata"
      className={className}
      onLoadedMetadata={() => {
        const vid = videoRef.current;
        if (vid) vid.currentTime = 0.1;
      }}
    />
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PostTile({ post, index, onClick }: { post: CalendarPostData; index: number; onClick: () => void }) {
  const meta = PLATFORM_META[post.platform];
  const cover = post.assets[0];
  const tiltDeg = index % 2 === 0 ? -3.5 : 3.5;
  const timeLabel = new Date(post.postDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="relative pt-2.5" style={{ transform: `rotate(${tiltDeg}deg)`, transition: "transform 0.25s ease" }}>
      <span
        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }}
      >
        <IconPin color={meta.color} className="h-5 w-5" />
      </span>

      <button
        onClick={onClick}
        className="group relative h-24 w-full flex-shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-[1.03] sm:h-28"
        style={{
          background: cover ? "#000" : `${meta.color}26`,
          border: "3px solid #FBFAF7",
          boxShadow: "0 6px 14px -4px rgba(0,0,0,0.45)",
        }}
      >
        {cover ? (
          cover.mediaType === "VIDEO" ? (
            <VideoThumbnail src={cover.contentUrl} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.contentUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlatformIcon platform={post.platform} className="h-7 w-7" style={{ color: meta.color }} />
          </div>
        )}

        {cover?.mediaType === "VIDEO" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}>
              <IconPlay className="ml-0.5 h-4 w-4 text-white" />
            </span>
          </div>
        )}

        {cover && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />}

        <span
          className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", color: meta.color, backdropFilter: "blur(4px)" }}
        >
          <PlatformIcon platform={post.platform} className="h-3 w-3" />
        </span>

        <span
          className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        >
          {timeLabel}
        </span>

        {post.assets.length > 1 && (
          <span
            className="absolute left-1.5 bottom-6 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          >
            <IconLayers className="h-2.5 w-2.5" />
            {post.assets.length}
          </span>
        )}

        {cover && post.approvalStatus === "PENDING" && (
          <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full" style={{ background: "#FFCC00" }} />
        )}

        {cover && post.approvalStatus === "APPROVED" && (
          <span
            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "#22C55E", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }}
          >
            <IconCheck className="h-3 w-3 text-white" />
          </span>
        )}
      </button>
    </div>
  );
}

function PostDetailPanel({
  slug,
  post,
  onClose,
  onUpdated,
}: {
  slug: string;
  post: CalendarPostData;
  onClose: () => void;
  onUpdated: (post: CalendarPostData) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const meta = PLATFORM_META[post.platform];
  const approvalMeta = APPROVAL_META[post.approvalStatus];
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState(post.videoComments);
  const activeAsset = post.assets[activeAssetIdx] ?? post.assets[0] ?? null;

  const addComment = async (commentNote: string, timestampSeconds: number) => {
    const res = await fetch(`/api/social-calendar/${slug}/posts/${post.id}/video-comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: commentNote, videoTimestampSeconds: timestampSeconds }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, data.comment]);
      router.refresh();
    }
  };

  const respond = async (action: "approve" | "request_revision") => {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/social-calendar/${slug}/posts/${post.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdated(data.post);
      router.refresh();
      setRequestingRevision(false);
      setNote("");
    } else {
      setError(data.error ?? "Something went wrong");
    }
    setSubmitting(false);
  };

  return (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-2 backdrop-blur-md sm:items-center sm:p-4 lg:p-6"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111111] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:max-h-[94dvh] sm:rounded-[28px]"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: meta.color }}
      />

      {/* ─────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────── */}
      <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Platform */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              color: meta.color,
              background: `${meta.color}12`,
              borderColor: `${meta.color}28`,
            }}
          >
            <PlatformIcon platform={post.platform} className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-white sm:text-[15px]">
                {meta.label}
              </span>

              {post.postType && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-white/40">
                    {post.postType}
                  </span>
                </>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-white/35">
                {new Date(post.postDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <span className="text-white/15">•</span>

              <span className="text-[11px] text-white/35">
                {new Date(post.postDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>

              {post.category && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    borderColor: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {post.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/45 transition-all hover:border-white/15 hover:bg-white/[0.07] hover:text-white active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          SCROLLABLE CONTENT
      ───────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6">

          {/* ─────────────────────────────────────────
              CONTENT PREVIEW
          ───────────────────────────────────────── */}
          {post.assets.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                    Content preview
                  </p>
                  <p className="mt-0.5 text-xs text-white/25">
                    Review the final creative before approval
                  </p>
                </div>

                <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[10px] text-white/40">
                  {post.assets.length}{" "}
                  {post.assets.length === 1 ? "asset" : "assets"}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                {activeAsset && (
                  <div className="relative flex min-h-[220px] items-center justify-center bg-black sm:min-h-[340px]">
                    {activeAsset.mediaType === "VIDEO" ? (
                      <video
                        ref={videoRef}
                        src={activeAsset.contentUrl}
                        controls
                        playsInline
                        className="max-h-[48vh] w-full object-contain"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeAsset.contentUrl}
                        alt=""
                        className="max-h-[48vh] w-full object-contain"
                      />
                    )}

                    {/* Asset number */}
                    {post.assets.length > 1 && (
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-md">
                        {activeAssetIdx + 1} / {post.assets.length}
                      </div>
                    )}
                  </div>
                )}

                {/* Asset thumbnails */}
                {post.assets.length > 1 && (
                  <div className="border-t border-white/[0.07] bg-white/[0.02] p-2.5">
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {post.assets.map((asset, i) => {
                        const isActive = i === activeAssetIdx;

                        return (
                          <button
                            key={asset.id}
                            onClick={() => setActiveAssetIdx(i)}
                            aria-label={`View asset ${i + 1}`}
                            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all active:scale-95 sm:h-[72px] sm:w-[72px]"
                            style={{
                              border: isActive
                                ? "2px solid #2478FF"
                                : "1px solid rgba(255,255,255,0.08)",
                              boxShadow: isActive
                                ? "0 0 0 2px rgba(36,120,255,0.18)"
                                : "none",
                            }}
                          >
                            {asset.mediaType === "VIDEO" ? (
                              <video
                                src={asset.contentUrl}
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.contentUrl}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            )}

                            {asset.mediaType === "VIDEO" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                                  <IconPlay className="h-3.5 w-3.5 text-white" />
                                </div>
                              </div>
                            )}

                            {isActive && (
                              <div className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/30" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Approval status */}
              <div
                className="mt-3 flex items-center gap-3 rounded-xl border px-3.5 py-3"
                style={{
                  background: approvalMeta.bg,
                  borderColor: `${approvalMeta.color}25`,
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `${approvalMeta.color}18`,
                    color: approvalMeta.color,
                  }}
                >
                  {post.approvalStatus === "APPROVED" ? (
                    <IconCheck className="h-4 w-4" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: approvalMeta.color }}
                  >
                    {approvalMeta.text}
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/35">
                    {post.approvalStatus === "APPROVED"
                      ? "This content has been approved."
                      : post.approvalStatus === "NEEDS_REVISION"
                        ? "Feedback is required before approval."
                        : "Please review the content and approve or request changes."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────
              COPY / CONTENT
          ───────────────────────────────────────── */}
          {(post.caption || post.contentIdea || post.cta || post.hashtags) && (
            <section className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Post details
                </p>
              </div>

              {post.caption && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/30">
                      Caption
                    </p>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                    {post.caption}
                  </p>
                </div>
              )}

              {post.contentIdea && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                    Content idea
                  </p>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/65">
                    {post.contentIdea}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {post.cta && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                      Call to action
                    </p>

                    <p className="break-words text-sm leading-5 text-white/65">
                      {post.cta}
                    </p>
                  </div>
                )}

                {post.hashtags && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                      Hashtags
                    </p>

                    <p className="break-words text-sm leading-5 text-[#68B2FF]">
                      {post.hashtags}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────
              DISCOVERY
          ───────────────────────────────────────── */}
          {(post.taggedAccounts || post.linkUrl) && (
            <section>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Discovery
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {post.taggedAccounts && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/25">
                      Tagged accounts
                    </p>

                    <p className="break-words text-xs leading-5 text-white/60">
                      {post.taggedAccounts}
                    </p>
                  </div>
                )}

                {post.linkUrl && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/25">
                      Destination link
                    </p>

                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs leading-5 text-[#68B2FF] underline decoration-[#68B2FF]/30 underline-offset-2 transition-colors hover:text-white"
                    >
                      {post.linkUrl}
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────
              CUSTOM FIELDS
          ───────────────────────────────────────── */}
          {post.customFields.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Additional information
              </p>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                {post.customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4 ${
                      index !== 0 ? "border-t border-white/[0.06]" : ""
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/30">
                      {field.label}
                    </span>

                    <span className="break-words text-xs leading-5 text-white/60">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────
              VIDEO COMMENTS
          ───────────────────────────────────────── */}
          {activeAsset?.mediaType === "VIDEO" && (
            <section>
              <CalendarVideoComments
                comments={comments}
                readOnly={false}
                getCurrentTime={() =>
                  videoRef.current?.currentTime ?? 0
                }
                onSeekTo={(seconds) => {
                  const vid = videoRef.current;
                  if (!vid) return;

                  vid.currentTime = seconds;
                  vid.play().catch(() => {});
                }}
                onAddComment={addComment}
              />
            </section>
          )}

          {/* ─────────────────────────────────────────
              APPROVAL ACTIONS
          ───────────────────────────────────────── */}
          {post.assets.length > 0 && (
            <section className="border-t border-white/[0.07] pt-5">
              {requestingRevision ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Request changes
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Tell the creator exactly what needs to be changed.
                    </p>
                  </div>

                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="e.g. Please update the headline, replace the second image and shorten the caption..."
                    style={{ fontSize: "16px" }}
                    className="w-full resize-none rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3.5 text-sm leading-6 text-white outline-none transition-all placeholder:text-white/20 focus:border-[#F97316]/50 focus:bg-white/[0.055] focus:ring-4 focus:ring-[#F97316]/[0.08]"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      onClick={() => respond("request_revision")}
                      disabled={submitting || !note.trim()}
                      className="flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background:
                          "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
                        boxShadow: "0 8px 24px rgba(249,115,22,0.18)",
                      }}
                    >
                      {submitting ? "Sending feedback..." : "Send feedback"}
                    </button>

                    <button
                      onClick={() => setRequestingRevision(false)}
                      className="min-h-11 rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-white/50 transition-all hover:bg-white/[0.05] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">
                      Ready to review?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Approve the content or send feedback to the creator.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      onClick={() => respond("approve")}
                      disabled={submitting}
                      className="group relative flex min-h-12 items-center justify-center overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(36,120,255,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background:
                          "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <IconCheck className="h-4 w-4" />
                        {submitting ? "Approving..." : "Approve content"}
                      </span>

                      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>

                    <button
                      onClick={() => setRequestingRevision(true)}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/65 transition-all hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          d="M12 20h9"
                          strokeLinecap="round"
                        />
                        <path
                          d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Request changes
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.07] px-3.5 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  <p className="text-xs leading-5 text-red-300">
                    {error}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {post.assets.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.02] px-6 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-white/25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                  />
                  <path d="M8 15l2.5-3 2 2 2.5-3 3 4" />
                </svg>
              </div>

              <p className="text-sm font-medium text-white/55">
                No content uploaded yet
              </p>

              <p className="mt-1 max-w-xs text-xs leading-5 text-white/25">
                The creative assets for this post will appear here once they
                have been uploaded.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.07] bg-[#111111]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="hidden text-[10px] text-white/20 sm:block">
          Click outside to close
        </div>

        <button
          onClick={onClose}
          className="ml-auto flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-medium text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/70"
        >
          Close review
        </button>
      </div>
    </div>
  </div>
);
}
export default function ClientCalendarView({
  slug,
  planStatus,
  posts: initialPosts,
  clientName = "Your brand",
}: {
  slug: string;
  planStatus: string;
  posts: CalendarPostData[];
  clientName?: string;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"calendar" | "instagram" | "tiktok">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [posts, setPosts] = useState<CalendarPostData[]>(
    initialPosts.map((p) => ({ ...p, assets: p.assets ?? [], videoComments: p.videoComments ?? [], customFields: p.customFields ?? [] }))
  );
  const [selectedPost, setSelectedPost] = useState<CalendarPostData | null>(null);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [planNote, setPlanNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const postsForDate = (date: Date) =>
    posts.filter((p) => {
      const pd = new Date(p.postDate);
      return pd.getFullYear() === date.getFullYear() && pd.getMonth() === date.getMonth() && pd.getDate() === date.getDate();
    });

  // Only the dates that actually have something planned — grouped and
  // sorted chronologically, rather than rendering every day of the
  // month (most of them empty) the way a literal calendar grid would.
  const postsInMonth = posts.filter((p) => {
    const pd = new Date(p.postDate);
    return pd.getFullYear() === year && pd.getMonth() === month;
  });
  const activeDates = Array.from(
    new Set(postsInMonth.map((p) => new Date(p.postDate).getDate()))
  )
    .sort((a, b) => a - b)
    .map((day) => new Date(year, month, day));

  const respondToPlan = async (action: "approve" | "request_changes") => {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/social-calendar/${slug}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: planNote }),
    });
    if (res.ok) {
      router.refresh();
      setRequestingChanges(false);
      setPlanNote("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* SOCIAL VIEW SWITCHER */}
      <div className="mb-8 overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: "calendar" as const, label: "Calendar", icon: "calendar" },
            { key: "instagram" as const, label: "Instagram Preview", icon: "instagram" },
            { key: "tiktok" as const, label: "TikTok", icon: "tiktok" },
          ].map((tab) => {
            const active = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewMode(tab.key)}
                className="relative flex min-h-11 items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 text-xs font-semibold transition-all duration-300 active:scale-[0.98] sm:text-sm"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))"
                    : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.38)",
                  boxShadow: active ? "0 8px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                }}
              >
                {tab.icon === "calendar" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4" width="18" height="17" rx="3" />
                    <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                  </svg>
                )}
                {tab.icon === "instagram" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                  </svg>
                )}
                {tab.icon === "tiktok" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 1 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
                  </svg>
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "instagram" && (
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#080808] px-3 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:px-6 sm:py-10">
          <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#E1306C]/10 blur-[100px]" />
          <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-[#7C3AED]/10 blur-[100px]" />
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">Social preview</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Instagram Preview</h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/35 sm:text-sm">Present your brand the right way — see how your Instagram content comes together before it goes live.</p>
            </div>
            <InstagramPreview posts={posts} clientName={clientName} />
          </div>
        </section>
      )}

      {viewMode === "tiktok" && (
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#050505] px-3 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:px-6 sm:py-10">
          <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#25F4EE]/10 blur-[100px]" />
          <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-[#FE2C55]/10 blur-[100px]" />
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">Social preview</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">TikTok experience</h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/35 sm:text-sm">Experience the complete vertical sequence exactly as a viewer would scroll through it.</p>
            </div>
            <TikTokPreview posts={posts} clientName={clientName} />
          </div>
        </section>
      )}

      {viewMode === "calendar" && (
        <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            ←
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            →
          </button>
        </div>
      </div>

      {activeDates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-white/50">Nothing planned for this month yet</p>
          <p className="max-w-xs text-xs text-white/30">Try a different month, or check back once your manager adds something here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activeDates.map((date) => {
            const dayColor = DAY_COLORS[date.getDay()];
            const dayPosts = postsForDate(date);
            return (
              <div key={date.toISOString()} className="flex gap-4 sm:gap-5">
                <div className="flex flex-shrink-0 flex-col items-center">
                  <div
                    className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl sm:h-14 sm:w-14"
                    style={{ background: `${dayColor}1f`, border: `1.5px solid ${dayColor}55` }}
                  >
                    <span className="text-base font-black leading-none sm:text-lg" style={{ color: dayColor }}>
                      {date.getDate()}
                    </span>
                    <span className="mt-0.5 text-[9px] font-bold uppercase" style={{ color: dayColor, letterSpacing: "0.04em" }}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                  <div className="mt-2 w-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3 pb-2 sm:grid-cols-3 md:grid-cols-4">
                  {dayPosts.map((post, postIndex) => (
                    <PostTile key={post.id} post={post} index={postIndex} onClick={() => setSelectedPost(post)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

        </>
      )}

      {selectedPost && (
        <PostDetailPanel
          slug={slug}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={(updated) => {
            const safe = { ...updated, assets: updated.assets ?? [], videoComments: updated.videoComments ?? [], customFields: updated.customFields ?? [] };
            setPosts((prev) => prev.map((p) => (p.id === safe.id ? safe : p)));
            setSelectedPost(safe);
          }}
        />
      )}

      {planStatus === "AWAITING_APPROVAL" && (
        <div className="mt-8 rounded-xl p-6" style={{ background: "#1A1A1A" }}>
          <p className="mb-4 text-sm font-semibold text-white">Does this plan work for you?</p>

          {requestingChanges ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={planNote}
                onChange={(e) => setPlanNote(e.target.value)}
                rows={3}
                placeholder="What would you like changed?"
                style={{ fontSize: "16px" }}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => respondToPlan("request_changes")}
                  disabled={submitting || !planNote.trim()}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "#F97316" }}
                >
                  {submitting ? "Sending..." : "Send feedback"}
                </button>
                <button onClick={() => setRequestingChanges(false)} className="text-xs text-white/40 underline">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => respondToPlan("approve")}
                disabled={submitting}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
              >
                {submitting ? "Approving..." : "Approve this plan"}
              </button>
              <button
                onClick={() => setRequestingChanges(true)}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white/70"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                Request changes
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {planStatus === "PLAN_APPROVED" && (
        <div className="mt-8 rounded-xl p-5 text-sm" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
          You&apos;ve approved this plan — click any post below to review its actual content as it gets uploaded.
        </div>
      )}
    </div>
  );
}