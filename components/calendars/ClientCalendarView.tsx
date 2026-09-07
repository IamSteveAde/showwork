"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import CalendarVideoComments, { type CalendarVideoCommentData } from "@/components/calendars/CalendarVideoComments";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${meta.color}22`, color: meta.color }}>
            <PlatformIcon platform={post.platform} className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-white">{meta.label}</span>
          {post.postType && <span className="text-xs text-white/40">· {post.postType}</span>}
          {post.category && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              {post.category}
            </span>
          )}
        </div>
        <p className="text-sm text-white/70">
          {new Date(post.postDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {" · "}
          {new Date(post.postDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>

        {post.caption && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Caption</p>
            <p className="rounded-lg p-3 text-sm text-white/60" style={{ background: "rgba(255,255,255,0.04)" }}>
              {post.caption}
            </p>
          </div>
        )}

        {post.contentIdea && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Content idea</p>
            <p className="rounded-lg p-3 text-sm text-white/60" style={{ background: "rgba(255,255,255,0.04)" }}>
              {post.contentIdea}
            </p>
          </div>
        )}

        {post.cta && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Call to action</p>
            <p className="rounded-lg p-3 text-sm text-white/60" style={{ background: "rgba(255,255,255,0.04)" }}>
              {post.cta}
            </p>
          </div>
        )}

        {post.hashtags && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Hashtags</p>
            <p className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "#68B2FF" }}>
              {post.hashtags}
            </p>
          </div>
        )}

        {(post.taggedAccounts || post.linkUrl) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {post.taggedAccounts && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Tagged</p>
                <p className="truncate text-xs text-white/60">{post.taggedAccounts}</p>
              </div>
            )}
            {post.linkUrl && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-white/30">Link</p>
                <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs underline" style={{ color: "#68B2FF" }}>
                  {post.linkUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {post.customFields.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {post.customFields.map((f) => (
              <div key={f.id} className="flex items-start gap-2 text-xs">
                <span className="font-semibold text-white/40">{f.label}:</span>
                <span className="text-white/60">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {post.assets.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <span className="w-fit rounded-full px-3 py-1 text-xs font-semibold" style={{ color: approvalMeta.color, background: approvalMeta.bg }}>
              {approvalMeta.text}
            </span>

            {activeAsset && (
              activeAsset.mediaType === "VIDEO" ? (
                <video ref={videoRef} src={activeAsset.contentUrl} controls className="w-full rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeAsset.contentUrl} alt="" className="w-full rounded-lg object-cover" />
              )
            )}

            {post.assets.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {post.assets.map((asset, i) => (
                  <button
                    key={asset.id}
                    onClick={() => setActiveAssetIdx(i)}
                    className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg"
                    style={{ border: i === activeAssetIdx ? "2px solid #2478FF" : "2px solid transparent" }}
                  >
                    {asset.mediaType === "VIDEO" ? (
                      <video src={asset.contentUrl} muted className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.contentUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeAsset?.mediaType === "VIDEO" && (
              <CalendarVideoComments
                comments={comments}
                readOnly={false}
                getCurrentTime={() => videoRef.current?.currentTime ?? 0}
                onSeekTo={(seconds) => {
                  const vid = videoRef.current;
                  if (!vid) return;
                  vid.currentTime = seconds;
                  vid.play().catch(() => {});
                }}
                onAddComment={addComment}
              />
            )}

            {requestingRevision ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="What would you like changed?"
                  style={{ fontSize: "16px" }}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => respond("request_revision")}
                    disabled={submitting || !note.trim()}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "#F97316" }}
                  >
                    {submitting ? "Sending..." : "Send feedback"}
                  </button>
                  <button onClick={() => setRequestingRevision(false)} className="text-xs text-white/40 underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => respond("approve")}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
                >
                  {submitting ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => setRequestingRevision(true)}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/70"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  Request changes
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        ) : (
          <p className="text-xs text-white/30">Nothing has been uploaded for this post yet.</p>
        )}

        <button onClick={onClose} className="mt-1 self-start text-xs text-white/40 underline">
          Close
        </button>
      </div>
    </div>
  );
}

export default function ClientCalendarView({
  slug,
  planStatus,
  posts: initialPosts,
}: {
  slug: string;
  planStatus: string;
  posts: CalendarPostData[];
}) {
  const router = useRouter();
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