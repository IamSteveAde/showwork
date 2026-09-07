"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarVideoComments, { type CalendarVideoCommentData } from "@/components/calendars/CalendarVideoComments";

type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "X" | "LINKEDIN";
type ApprovalStatus = "PENDING" | "APPROVED" | "NEEDS_REVISION";
type Theme = "dark" | "light";

interface CalendarPostAssetData {
  id: string;
  fileKey: string;
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

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "INSTAGRAM", label: "Instagram", color: "#E1306C" },
  { value: "TIKTOK", label: "TikTok", color: "#00F2EA" },
  { value: "YOUTUBE", label: "YouTube", color: "#FF0000" },
  { value: "FACEBOOK", label: "Facebook", color: "#1877F2" },
  { value: "X", label: "X", color: "#FFFFFF" },
  { value: "LINKEDIN", label: "LinkedIn", color: "#0A66C2" },
];

const POST_TYPES = ["Single Image", "Carousel", "Reel", "Video", "Story"];
const DEFAULT_CATEGORIES = ["Educational", "Lifestyle", "Promotional", "Behind the Scenes", "Testimonial", "Announcement"];
const DEFAULT_CTAS = ["Link in bio", "Comment below", "Shop now", "Swipe up", "DM us", "Tag a friend", "Save this post"];

// One color per weekday, anchored by Showwork's own brand colors —
// blue on Monday, gold on Wednesday — with the rest of the week
// filled in with hues that read as one cohesive family rather than a
// random rainbow. Index 0 = Sunday, matching Date.getDay().
const DAY_COLORS = ["#FF6B4A", "#2478FF", "#6C5CE7", "#FFCC00", "#00C2A8", "#FF4D8D", "#9B59F6"];

const APPROVAL_META: Record<ApprovalStatus, { text: string; color: string; bg: string }> = {
  PENDING: { text: "Awaiting client review", color: "#FFCC00", bg: "rgba(255,204,0,0.15)" },
  APPROVED: { text: "Approved", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  NEEDS_REVISION: { text: "Needs revision", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

const THEMES: Record<Theme, {
  pageBg: string; cardBg: string; cardBorder: string; cardBorderActive: string;
  modalBg: string; text: string; textMuted: string; textFaint: string;
  inputBg: string; inputBorder: string; pillBg: string; pillText: string;
}> = {
  dark: {
    pageBg: "#0A0A0A",
    cardBg: "rgba(255,255,255,0.025)",
    cardBorder: "rgba(255,255,255,0.06)",
    cardBorderActive: "#2478FF",
    modalBg: "#1A1A1A",
    text: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.5)",
    textFaint: "rgba(255,255,255,0.3)",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.1)",
    pillBg: "rgba(255,255,255,0.06)",
    pillText: "rgba(255,255,255,0.6)",
  },
  light: {
    pageBg: "#FFFFFF",
    cardBg: "rgba(0,0,0,0.025)",
    cardBorder: "rgba(0,0,0,0.09)",
    cardBorderActive: "#2478FF",
    modalBg: "#FFFFFF",
    text: "#0A0A0A",
    textMuted: "rgba(0,0,0,0.5)",
    textFaint: "rgba(0,0,0,0.35)",
    inputBg: "rgba(0,0,0,0.03)",
    inputBorder: "rgba(0,0,0,0.14)",
    pillBg: "rgba(0,0,0,0.05)",
    pillText: "rgba(0,0,0,0.6)",
  },
};

const THEME_STORAGE_KEY = "showwork-calendar-theme";

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

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.4 14.7A8.5 8.5 0 0 1 9.3 3.6a.6.6 0 0 0-.7-.85A10 10 0 1 0 21.25 15.4a.6.6 0 0 0-.85-.7Z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" strokeLinecap="round" />
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
      style={{ background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", color: theme === "dark" ? "#F5C842" : "#F59E0B" }}
    >
      {theme === "dark" ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4.5 w-4.5" />}
    </button>
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
  const meta = PLATFORMS.find((p) => p.value === post.platform)!;
  const cover = post.assets[0];
  const approvalMeta = APPROVAL_META[post.approvalStatus];
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

        {cover && post.approvalStatus === "APPROVED" && (
          <span
            className="absolute bottom-6 right-1.5 flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "#22C55E", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }}
          >
            <IconCheck className="h-3 w-3 text-white" />
          </span>
        )}

        {cover && (
          <span
            className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded px-1.5 py-0.5 text-left text-[9px] font-semibold"
            style={{ color: approvalMeta.color, background: "rgba(0,0,0,0.5)" }}
          >
            {approvalMeta.text}
          </span>
        )}
      </button>
    </div>
  );
}

function AddPostPanel({
  calendarId,
  date,
  theme,
  onClose,
  onCreated,
}: {
  calendarId: string;
  date: Date;
  theme: Theme;
  onClose: () => void;
  onCreated: (posts: CalendarPostData[]) => void;
}) {
  const t = THEMES[theme];
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [postTime, setPostTime] = useState("09:00");
  const [postType, setPostType] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [addingCustomCategory, setAddingCustomCategory] = useState(false);
  const [caption, setCaption] = useState("");
  const [contentIdea, setContentIdea] = useState("");
  const [cta, setCta] = useState("");
  const [customCta, setCustomCta] = useState("");
  const [addingCustomCta, setAddingCustomCta] = useState(false);
  const [hashtags, setHashtags] = useState("");
  const [taggedAccounts, setTaggedAccounts] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const addCustomField = () => setCustomFields((prev) => [...prev, { label: "", value: "" }]);
  const updateCustomField = (index: number, key: "label" | "value", val: string) =>
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: val } : f)));
  const removeCustomField = (index: number) => setCustomFields((prev) => prev.filter((_, i) => i !== index));

  const addFiles = (files: FileList) => setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  const removePendingFile = (index: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  // Uploads every pending file onto one already-created post — same
  // presign → PUT → complete flow used everywhere else content gets
  // attached to a post.
  const uploadFilesToPost = async (postId: string) => {
    for (const file of pendingFiles) {
      const presignRes = await fetch(`/api/calendars/${calendarId}/posts/${postId}/upload-presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "PHOTO";
      const completeRes = await fetch(`/api/calendars/${calendarId}/posts/${postId}/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: presignData.fileKey, mediaType }),
      });
      if (!completeRes.ok) {
        const completeData = await completeRes.json();
        throw new Error(completeData.error ?? "Failed to save content");
      }
    }
  };

  const submit = async () => {
    if (platforms.length === 0) {
      setError("Pick at least one platform");
      return;
    }
    setSaving(true);
    setError(null);
    setUploadingStage(null);

    const finalCategory = addingCustomCategory ? customCategory.trim() : category;
    const finalCta = addingCustomCta ? customCta.trim() : cta;

    // Combine the day that was clicked with the chosen time of day —
    // without this, every post would default to midnight regardless
    // of when it's actually meant to go out.
    const [hours, minutes] = postTime.split(":").map(Number);
    const fullDate = new Date(date);
    fullDate.setHours(hours || 0, minutes || 0, 0, 0);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postDate: fullDate.toISOString(),
          platforms,
          postType,
          category: finalCategory,
          caption,
          contentIdea,
          cta: finalCta,
          hashtags,
          taggedAccounts,
          linkUrl,
          customFields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add post");

      const createdPosts: CalendarPostData[] = data.posts ?? [data.post];

      // Uploading is entirely optional here — if the manager attached
      // files, every platform's post gets the same content; if not,
      // the posts are simply created empty, ready to have content
      // added later from their own tile, exactly as before.
      if (pendingFiles.length > 0) {
        for (let i = 0; i < createdPosts.length; i++) {
          setUploadingStage(`Uploading content (${i + 1}/${createdPosts.length})...`);
          await uploadFilesToPost(createdPosts[i].id);
        }
      }

      onCreated(createdPosts);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
      setUploadingStage(null);
    }
  };

  const inputStyle = { background: t.inputBg, borderColor: t.inputBorder, color: t.text };

  return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
      style={{
        background: t.modalBg,
        borderColor: t.cardBorder,
        boxShadow:
          theme === "dark"
            ? "0 30px 100px rgba(0,0,0,0.55)"
            : "0 30px 100px rgba(0,0,0,0.15)",
      }}
    >
      {/* ───────────────── HEADER ───────────────── */}
      <div
        className="relative flex-shrink-0 border-b px-5 py-5 sm:px-7 sm:py-6"
        style={{ borderColor: t.cardBorder }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full blur-3xl"
          style={{
            background:
              theme === "dark"
                ? "rgba(36,120,255,0.12)"
                : "rgba(36,120,255,0.07)",
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(36,120,255,0.10)",
                color: "#2478FF",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                <path d="M12 12v6M9 15h6" strokeLinecap="round" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className="text-base font-semibold tracking-tight sm:text-lg"
                  style={{ color: t.text }}
                >
                  Plan a post
                </h2>

                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                  style={{ background: t.pillBg, color: t.textFaint, letterSpacing: "0.08em" }}
                >
                  New post
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed" style={{ color: t.textMuted }}>
                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg transition-all hover:scale-105"
            style={{ background: t.pillBg, color: t.textMuted }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ───────────────── SCROLLABLE CONTENT ───────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">

          {/* ───────────────── DATE & TIME ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>
                When should this go out?
              </h3>
              <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>
                Pick the time of day this post is scheduled for.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="flex items-center gap-2 rounded-xl border px-4 py-3"
                style={{ background: t.inputBg, borderColor: t.inputBorder }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke={t.textFaint} strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="17" rx="3" />
                  <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                </svg>
                <span className="truncate text-xs font-medium" style={{ color: t.textMuted }}>
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              <div
                className="flex items-center gap-2 rounded-xl border px-4 py-2.5"
                style={{ background: t.inputBg, borderColor: t.inputBorder }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke={t.textFaint} strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="time"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                  style={{ fontSize: "16px", color: t.text }}
                  className="w-full min-w-0 bg-transparent text-xs font-medium outline-none"
                />
              </div>
            </div>
          </section>

          {/* ───────────────── PLATFORM ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>
                Where are you posting?
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: t.textFaint }}>
                Select every platform this exact same content is going to. One post gets created per platform you pick — all sharing this same caption, content and details — so you don't have to fill this form out again for each one.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => {
                const selected = platforms.includes(p.value);

                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className="group relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      borderColor: selected ? p.color : t.inputBorder,
                      background: selected ? `${p.color}12` : t.inputBg,
                      boxShadow: selected ? `0 8px 24px ${p.color}18` : "none",
                    }}
                  >
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: selected ? `${p.color}18` : t.pillBg, color: p.color }}
                    >
                      <PlatformIcon platform={p.value} className="h-4.5 w-4.5" />
                    </span>

                    <span className="min-w-0">
                      <span
                        className="block truncate text-xs font-semibold"
                        style={{ color: selected ? t.text : t.textMuted }}
                      >
                        {p.label}
                      </span>

                      {selected && (
                        <span className="mt-0.5 block text-[9px] font-medium" style={{ color: p.color }}>
                          Selected
                        </span>
                      )}
                    </span>

                    {selected && (
                      <span
                        className="absolute right-2.5 top-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full"
                        style={{ background: p.color, color: "#fff" }}
                      >
                        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m3.5 8 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {platforms.length > 1 && (
              <div
                className="mt-3 flex items-start gap-2.5 rounded-xl border p-3"
                style={{ background: "rgba(36,120,255,0.05)", borderColor: "rgba(36,120,255,0.10)" }}
              >
                <span className="mt-0.5 text-xs" style={{ color: "#2478FF" }}>✦</span>
                <p className="text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
                  This will create {platforms.length} separate posts — one for each platform selected — all with the same content below.
                </p>
              </div>
            )}
          </section>

          {/* ───────────────── POST TYPE ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>
                What are you publishing?
              </h3>
              <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>
                This helps organize the content in your calendar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POST_TYPES.map((type) => {
                const selected = postType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPostType(type)}
                    className="rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all"
                    style={{
                      borderColor: selected ? "#2478FF" : t.inputBorder,
                      background: selected ? "rgba(36,120,255,0.10)" : t.inputBg,
                      color: selected ? t.text : t.pillText,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{type}</span>
                      {selected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#2478FF" }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {postType === "Carousel" && (
              <div
                className="mt-3 flex items-start gap-2.5 rounded-xl border p-3"
                style={{ background: "rgba(36,120,255,0.05)", borderColor: "rgba(36,120,255,0.10)" }}
              >
                <span className="mt-0.5 text-xs" style={{ color: "#2478FF" }}>✦</span>
                <p className="text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
                  Carousels can contain multiple images or videos. You can add all of them together when uploading your content.
                </p>
              </div>
            )}
          </section>

          {/* ───────────────── CATEGORY ───────────────── */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: t.text }}>Content category</h3>
                <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>Optional — helps keep your calendar organized.</p>
              </div>
              {category && !addingCustomCategory && (
                <button type="button" onClick={() => setCategory("")} className="text-[10px] font-medium" style={{ color: t.textFaint }}>
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const selected = category === cat && !addingCustomCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setAddingCustomCategory(false);
                    }}
                    className="rounded-full border px-3 py-2 text-[11px] font-semibold transition-all"
                    style={{
                      borderColor: selected ? "#2478FF" : t.inputBorder,
                      background: selected ? "rgba(36,120,255,0.11)" : t.pillBg,
                      color: selected ? "#2478FF" : t.pillText,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAddingCustomCategory(true)}
                className="rounded-full border px-3 py-2 text-[11px] font-semibold transition-all"
                style={{
                  borderColor: addingCustomCategory ? "#2478FF" : t.inputBorder,
                  background: addingCustomCategory ? "rgba(36,120,255,0.11)" : t.pillBg,
                  color: addingCustomCategory ? "#2478FF" : t.pillText,
                }}
              >
                + Custom
              </button>
            </div>

            {addingCustomCategory && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter your own category"
                autoFocus
                style={{ fontSize: "16px", ...inputStyle }}
                className="mt-3 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
              />
            )}
          </section>

          {/* ───────────────── CONTENT ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>Content details</h3>
              <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>Give your team enough context to create the post correctly.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Caption</label>
                  <span className="text-[9px]" style={{ color: t.textFaint }}>Optional</span>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write the caption you want published..."
                  style={{ fontSize: "16px", ...inputStyle }}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Creative direction</label>
                  <span className="text-[9px]" style={{ color: t.textFaint }}>Optional</span>
                </div>
                <textarea
                  value={contentIdea}
                  onChange={(e) => setContentIdea(e.target.value)}
                  rows={3}
                  placeholder="Describe the idea, mood, angle or direction..."
                  style={{ fontSize: "16px", ...inputStyle }}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>
          </section>

          {/* ───────────────── CTA ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>Call to action</h3>
              <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>What should the audience do next?</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_CTAS.map((c) => {
                const selected = cta === c && !addingCustomCta;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCta(c);
                      setAddingCustomCta(false);
                    }}
                    className="rounded-full border px-3 py-2 text-[11px] font-semibold transition-all"
                    style={{
                      borderColor: selected ? "#2478FF" : t.inputBorder,
                      background: selected ? "rgba(36,120,255,0.11)" : t.pillBg,
                      color: selected ? "#2478FF" : t.pillText,
                    }}
                  >
                    {c}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAddingCustomCta(true)}
                className="rounded-full border px-3 py-2 text-[11px] font-semibold transition-all"
                style={{
                  borderColor: addingCustomCta ? "#2478FF" : t.inputBorder,
                  background: addingCustomCta ? "rgba(36,120,255,0.11)" : t.pillBg,
                  color: addingCustomCta ? "#2478FF" : t.pillText,
                }}
              >
                + Custom
              </button>
            </div>

            {addingCustomCta && (
              <input
                type="text"
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                placeholder="Write your own call to action"
                autoFocus
                style={{ fontSize: "16px", ...inputStyle }}
                className="mt-3 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
              />
            )}
          </section>

          {/* ───────────────── DISCOVERY ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>Discovery & reach</h3>
              <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>Add hashtags, mentions or a destination link.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Hashtags</label>
                <textarea
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  rows={2}
                  placeholder="#yourbrand #contentcreator"
                  style={{ fontSize: "16px", ...inputStyle }}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Tagged accounts</label>
                  <input
                    type="text"
                    value={taggedAccounts}
                    onChange={(e) => setTaggedAccounts(e.target.value)}
                    placeholder="@someone"
                    style={{ fontSize: "16px", ...inputStyle }}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Link</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://"
                    style={{ fontSize: "16px", ...inputStyle }}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────── UPLOAD NOW (OPTIONAL) ───────────────── */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>Content files</h3>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: t.textFaint }}>
                Optional — if you already have the image or video ready, attach it now. If not, that's fine too: you can come back and upload it later from this post's own tile.
              </p>
            </div>

            {pendingFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                    style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.textMuted }}
                  >
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removePendingFile(i)} className="text-red-400 hover:text-red-300">×</button>
                  </div>
                ))}
              </div>
            )}

            <label
              className="group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-center transition-all hover:border-blue-500/40"
              style={{ borderColor: t.inputBorder, background: t.inputBg }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{ background: "rgba(36,120,255,0.10)", color: "#2478FF" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold" style={{ color: "#2478FF" }}>
                  {pendingFiles.length > 0 ? "Add another file" : "Attach content now"}
                </span>
                <span className="mt-0.5 block text-[9px]" style={{ color: t.textFaint }}>
                  JPG, PNG, WebP, MP4, MOV or WebM — optional
                </span>
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
                }}
              />
            </label>
          </section>

          {/* ───────────────── CUSTOM FIELDS ───────────────── */}
          <section>
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: t.text }}>Additional details</h3>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed" style={{ color: t.textFaint }}>
                  Add anything specific to this post — music, filter, location, reference, instructions, etc.
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold transition-all"
                style={{ background: "rgba(36,120,255,0.10)", color: "#2478FF" }}
              >
                <span className="text-sm leading-none">+</span>
                Add detail
              </button>
            </div>

            {customFields.length === 0 ? (
              <button
                type="button"
                onClick={addCustomField}
                className="group w-full rounded-2xl border border-dashed p-5 text-center transition-all hover:border-blue-500/40"
                style={{ borderColor: t.inputBorder, background: t.inputBg }}
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: t.pillBg, color: t.textFaint }}>
                  +
                </div>
                <p className="text-xs font-semibold" style={{ color: t.textMuted }}>Add a custom detail</p>
                <p className="mt-1 text-[10px]" style={{ color: t.textFaint }}>Keep anything important that doesn't fit above.</p>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {customFields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border p-2" style={{ background: t.inputBg, borderColor: t.inputBorder }}>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateCustomField(i, "label", e.target.value)}
                      placeholder="Detail name"
                      style={{ fontSize: "16px", ...inputStyle }}
                      className="w-1/3 rounded-lg border px-3 py-2.5 text-xs outline-none"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(i, "value", e.target.value)}
                      placeholder="Enter detail"
                      style={{ fontSize: "16px", ...inputStyle }}
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(i)}
                      aria-label="Remove detail"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm transition-colors hover:bg-red-500/10"
                      style={{ color: t.textFaint }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addCustomField} className="mt-1 self-start text-[10px] font-semibold" style={{ color: "#2478FF" }}>
                  + Add another detail
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border p-3.5" style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.15)" }}>
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-400">!</span>
              <p className="text-xs leading-relaxed text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────── FOOTER ───────────────── */}
      <div
        className="flex flex-shrink-0 items-center justify-between gap-3 border-t px-5 py-4 sm:px-7"
        style={{
          borderColor: t.cardBorder,
          background: theme === "dark" ? "rgba(20,20,20,0.96)" : "rgba(255,255,255,0.96)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-[10px] font-medium" style={{ color: t.textMuted }}>
            {platforms.length > 0
              ? `${platforms.length} platform${platforms.length > 1 ? "s" : ""} selected`
              : "Choose at least one platform to continue"}
          </p>
          <p className="mt-0.5 text-[9px]" style={{ color: t.textFaint }}>You can edit this later.</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ color: t.textMuted }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving || platforms.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
              boxShadow: platforms.length > 0 ? "0 8px 24px rgba(36,120,255,0.22)" : "none",
            }}
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {uploadingStage ?? "Adding..."}
              </>
            ) : (
              <>
                Add to calendar
                <span className="text-white/70">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

function PostDetailPanel({
  calendarId,
  post,
  theme,
  userRole,
  onClose,
  onUpdated,
  onDeleted,
}: {
  calendarId: string;
  post: CalendarPostData;
  theme: Theme;
  userRole: "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";
  onClose: () => void;
  onUpdated: (post: CalendarPostData) => void;
  onDeleted: (postId: string) => void;
}) {
  const t = THEMES[theme];
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);
  const canUpload = userRole === "ADD_CONTENT" || userRole === "EDIT_CALENDAR";
  const canEditOrDelete = userRole === "EDIT_CALENDAR";

  const [editing, setEditing] = useState(false);
  const [editPlatform, setEditPlatform] = useState(post.platform);
  const [editPostType, setEditPostType] = useState(post.postType ?? "");
  const [editCategory, setEditCategory] = useState(post.category ?? "");
  const [editCaption, setEditCaption] = useState(post.caption ?? "");
  const [editContentIdea, setEditContentIdea] = useState(post.contentIdea ?? "");
  const [editCta, setEditCta] = useState(post.cta ?? "");
  const [editHashtags, setEditHashtags] = useState(post.hashtags ?? "");
  const [editTaggedAccounts, setEditTaggedAccounts] = useState(post.taggedAccounts ?? "");
  const [editLinkUrl, setEditLinkUrl] = useState(post.linkUrl ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveEdit = async () => {
    setSavingEdit(true);
    setEditError(null);
    const res = await fetch(`/api/calendars/${calendarId}/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: editPlatform,
        postType: editPostType,
        category: editCategory,
        caption: editCaption,
        contentIdea: editContentIdea,
        cta: editCta,
        hashtags: editHashtags,
        taggedAccounts: editTaggedAccounts,
        linkUrl: editLinkUrl,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdated(data.post);
      setEditing(false);
      router.refresh();
    } else {
      setEditError(data.error ?? "Failed to save changes");
    }
    setSavingEdit(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/calendars/${calendarId}/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(post.id);
      onClose();
      router.refresh();
    } else {
      const data = await res.json();
      setEditError(data.error ?? "Failed to delete post");
      setDeleting(false);
    }
  };
  const platformMeta = PLATFORMS.find((p) => p.value === post.platform)!;
  const approvalMeta = APPROVAL_META[post.approvalStatus];
  const activeAsset = post.assets[activeAssetIdx] ?? post.assets[0] ?? null;

  const uploadOne = async (file: File) => {
    const presignRes = await fetch(`/api/calendars/${calendarId}/posts/${post.id}/upload-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

    await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

    const mediaType = file.type.startsWith("video/") ? "VIDEO" : "PHOTO";
    const completeRes = await fetch(`/api/calendars/${calendarId}/posts/${post.id}/upload-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: presignData.fileKey, mediaType }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to save content");
    return completeData.post;
  };

  const uploadMany = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      let latest = post;
      for (const file of Array.from(files)) {
        latest = await uploadOne(file);
      }
      onUpdated(latest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = async (assetId: string) => {
    await fetch(`/api/calendars/${calendarId}/posts/${post.id}/assets/${assetId}`, { method: "DELETE" });
    const updatedAssets = post.assets.filter((a) => a.id !== assetId);
    onUpdated({ ...post, assets: updatedAssets });
    setActiveAssetIdx(0);
    router.refresh();
  };

  
return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
      style={{
        background: t.modalBg,
        borderColor: t.cardBorder,
        boxShadow:
          theme === "dark"
            ? "0 35px 120px rgba(0,0,0,0.6)"
            : "0 35px 120px rgba(0,0,0,0.16)",
      }}
    >
      {/* ───────────────── HEADER ───────────────── */}
      <div
        className="relative flex-shrink-0 border-b px-5 py-5 sm:px-7 sm:py-6"
        style={{ borderColor: t.cardBorder }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full blur-3xl"
          style={{
            background: `${platformMeta.color}16`,
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: `${platformMeta.color}18`,
                color: platformMeta.color,
              }}
            >
              <PlatformIcon
                platform={post.platform}
                className="h-5 w-5"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className="text-base font-semibold tracking-tight sm:text-lg"
                  style={{ color: t.text }}
                >
                  {platformMeta.label} post
                </h2>

                {post.postType && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase"
                    style={{
                      background: t.pillBg,
                      color: t.pillText,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {post.postType}
                  </span>
                )}

                {post.category && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
                    style={{
                      background: `${platformMeta.color}12`,
                      color: platformMeta.color,
                    }}
                  >
                    {post.category}
                  </span>
                )}
              </div>

              <p
                className="mt-1.5 text-xs"
                style={{ color: t.textMuted }}
              >
                {new Date(post.postDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {new Date(post.postDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {canEditOrDelete && (
              <button
                type="button"
                onClick={() => setEditing((prev) => !prev)}
                aria-label={editing ? "Cancel editing" : "Edit post"}
                className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all hover:scale-105"
                style={editing ? { background: t.pillBg, color: t.textMuted } : { background: "rgba(36,120,255,0.12)", color: "#2478FF" }}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {editing ? "Cancel" : "Edit"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all hover:scale-105"
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────── SCROLLABLE BODY ───────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">
          {/* ───────────────── STATUS ───────────────── */}
          {post.assets.length > 0 && (
            <section>
              <div
                className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  background: approvalMeta.bg,
                  borderColor: `${approvalMeta.color}26`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: `${approvalMeta.color}18`,
                      color: approvalMeta.color,
                    }}
                  >
                    {post.approvalStatus === "APPROVED" ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="m5 12 4 4 10-10"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : post.approvalStatus === "NEEDS_REVISION" ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          d="M12 9v4M12 17h.01"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path
                          d="M12 7v5l3 2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: approvalMeta.color }}
                    >
                      {approvalMeta.text}
                    </p>

                    <p
                      className="mt-0.5 text-[10px]"
                      style={{ color: t.textMuted }}
                    >
                      {post.approvalStatus === "APPROVED"
                        ? "This content has been approved."
                        : post.approvalStatus === "NEEDS_REVISION"
                        ? "Changes have been requested before approval."
                        : "Waiting for client review."}
                    </p>
                  </div>
                </div>
              </div>

              {post.approvalStatus === "NEEDS_REVISION" &&
                post.approvalNote && (
                  <div
                    className="mt-3 rounded-2xl border p-4"
                    style={{
                      background: "rgba(249,115,22,0.06)",
                      borderColor: "rgba(249,115,22,0.14)",
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs text-orange-400">✦</span>

                      <p
                        className="text-[10px] font-bold uppercase"
                        style={{
                          color: "#F97316",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Client feedback
                      </p>
                    </div>

                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: t.textMuted }}
                    >
                      &ldquo;{post.approvalNote}&rdquo;
                    </p>
                  </div>
                )}
            </section>
          )}

          {/* ───────────────── MEDIA ───────────────── */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Content
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Review the media attached to this post.
                </p>
              </div>

              {post.assets.length > 0 && (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    background: t.pillBg,
                    color: t.textMuted,
                  }}
                >
                  {post.assets.length}{" "}
                  {post.assets.length === 1 ? "file" : "files"}
                </span>
              )}
            </div>

            {activeAsset ? (
              <div>
                <div
                  className="group relative overflow-hidden rounded-2xl border"
                  style={{
                    background: "#090909",
                    borderColor: t.cardBorder,
                  }}
                >
                  {activeAsset.mediaType === "VIDEO" ? (
                    <video
                      ref={videoRef}
                      src={activeAsset.contentUrl}
                      controls
                      className="max-h-[520px] w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeAsset.contentUrl}
                      alt=""
                      className="max-h-[520px] w-full object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => removeAsset(activeAsset.id)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/65 text-sm text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500"
                    aria-label="Remove this file"
                  >
                    ×
                  </button>

                  {post.assets.length > 1 && (
                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-md">
                      {activeAssetIdx + 1} / {post.assets.length}
                    </div>
                  )}
                </div>

                {post.assets.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {post.assets.map((asset, i) => {
                      const selected = i === activeAssetIdx;

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setActiveAssetIdx(i)}
                          className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl transition-all hover:opacity-100"
                          style={{
                            border: selected
                              ? "2px solid #2478FF"
                              : `2px solid ${t.inputBorder}`,
                            opacity: selected ? 1 : 0.7,
                          }}
                        >
                          {asset.mediaType === "VIDEO" ? (
                            <>
                              <video
                                src={asset.contentUrl}
                                muted
                                className="h-full w-full object-cover"
                              />

                              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[9px] text-white">
                                  ▶
                                </span>
                              </span>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.contentUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeAsset?.mediaType === "VIDEO" && (
                  <div className="mt-4">
                    <CalendarVideoComments
                      comments={post.videoComments}
                      readOnly
                      onSeekTo={(seconds) => {
                        const vid = videoRef.current;
                        if (!vid) return;

                        vid.currentTime = seconds;
                        vid.play().catch(() => {});
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-2xl border border-dashed px-5 py-9 text-center"
                style={{
                  background: t.inputBg,
                  borderColor: t.inputBorder,
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: t.pillBg,
                    color: t.textFaint,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      d="M12 16V4M7.5 8.5 12 4l4.5 4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <p
                  className="text-xs font-semibold"
                  style={{ color: t.textMuted }}
                >
                  No content uploaded yet
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{ color: t.textFaint }}
                >
                  Add an image or video to prepare this post for review.
                </p>
              </div>
            )}

            {/* UPLOAD ACTION */}
            {canUpload && (
            <label
              className="group mt-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-center transition-all hover:border-blue-500/40"
              style={{
                borderColor: t.inputBorder,
                background: t.inputBg,
              }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{
                  background: "rgba(36,120,255,0.10)",
                  color: "#2478FF",
                }}
              >
                {uploading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M12 16V4M7.5 8.5 12 4l4.5 4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>

              <span className="text-left">
                <span
                  className="block text-xs font-semibold"
                  style={{ color: uploading ? t.textFaint : "#2478FF" }}
                >
                  {uploading
                    ? "Uploading files..."
                    : post.assets.length > 0
                    ? post.postType === "Carousel"
                      ? "Add more files"
                      : "Replace content"
                    : "Upload content"}
                </span>

                {!uploading && (
                  <span
                    className="mt-0.5 block text-[9px]"
                    style={{ color: t.textFaint }}
                  >
                    {post.postType === "Carousel"
                      ? "Add more images or videos to this carousel"
                      : "JPG, PNG, WebP, MP4, MOV or WebM"}
                  </span>
                )}
              </span>

              <input
                type="file"
                multiple={post.postType === "Carousel"}
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (
                    e.target.files &&
                    e.target.files.length > 0
                  ) {
                    uploadMany(e.target.files);
                  }
                }}
              />
            </label>
            )}

            {error && (
              <div
                className="mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  borderColor: "rgba(239,68,68,0.14)",
                }}
              >
                <span className="mt-0.5 text-xs text-red-400">!</span>

                <p className="text-xs leading-relaxed text-red-300">
                  {error}
                </p>
              </div>
            )}
          </section>

          {/* ───────────────── EDIT FORM ───────────────── */}
          {editing && (
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-semibold" style={{ color: t.text }}>Edit this post</h3>
                <p className="mt-1 text-[11px]" style={{ color: t.textFaint }}>Changes save to this post only.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Platform</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditPlatform(p.value)}
                        className="flex flex-col items-center gap-1 rounded-lg border-2 py-2.5 transition-colors"
                        style={{
                          borderColor: editPlatform === p.value ? p.color : t.inputBorder,
                          background: editPlatform === p.value ? `${p.color}1a` : t.inputBg,
                        }}
                      >
                        <PlatformIcon platform={p.value} className="h-4 w-4" style={{ color: p.color }} />
                        <span className="text-[9px] font-medium" style={{ color: t.textMuted }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Post type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {POST_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditPostType(type)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={editPostType === type ? { background: "#2478FF", color: "white" } : { background: t.pillBg, color: t.pillText }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditCategory(cat)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={editCategory === cat ? { background: "#2478FF", color: "white" } : { background: t.pillBg, color: t.pillText }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Caption</label>
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={4}
                    style={{ fontSize: "16px", background: t.inputBg, borderColor: t.inputBorder, color: t.text }}
                    className="w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Creative direction</label>
                  <textarea
                    value={editContentIdea}
                    onChange={(e) => setEditContentIdea(e.target.value)}
                    rows={3}
                    style={{ fontSize: "16px", background: t.inputBg, borderColor: t.inputBorder, color: t.text }}
                    className="w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Call to action</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_CTAS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditCta(c)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={editCta === c ? { background: "#2478FF", color: "white" } : { background: t.pillBg, color: t.pillText }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Hashtags</label>
                  <textarea
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    rows={2}
                    style={{ fontSize: "16px", background: t.inputBg, borderColor: t.inputBorder, color: t.text }}
                    className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Tagged accounts</label>
                    <input
                      type="text"
                      value={editTaggedAccounts}
                      onChange={(e) => setEditTaggedAccounts(e.target.value)}
                      style={{ fontSize: "16px", background: t.inputBg, borderColor: t.inputBorder, color: t.text }}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: t.textFaint, letterSpacing: "0.09em" }}>Link</label>
                    <input
                      type="url"
                      value={editLinkUrl}
                      onChange={(e) => setEditLinkUrl(e.target.value)}
                      style={{ fontSize: "16px", background: t.inputBg, borderColor: t.inputBorder, color: t.text }}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>

                {editError && <p className="text-xs text-red-400">{editError}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={savingEdit}
                    className="rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
                  >
                    {savingEdit ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold" style={{ color: t.textFaint }}>
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ───────────────── POST DETAILS ───────────────── */}
          {!editing && (post.caption ||
            post.contentIdea ||
            post.cta ||
            post.hashtags) && (
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Post details
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Everything planned for this piece of content.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {post.caption && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase"
                        style={{
                          color: t.textFaint,
                          letterSpacing: "0.08em",
                        }}
                      >
                        Caption
                      </span>
                    </div>

                    <p
                      className="whitespace-pre-wrap text-sm leading-relaxed"
                      style={{ color: t.textMuted }}
                    >
                      {post.caption}
                    </p>
                  </div>
                )}

                {post.contentIdea && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <p
                      className="mb-2 text-[10px] font-bold uppercase"
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Creative direction
                    </p>

                    <p
                      className="whitespace-pre-wrap text-sm leading-relaxed"
                      style={{ color: t.textMuted }}
                    >
                      {post.contentIdea}
                    </p>
                  </div>
                )}

                {post.cta && (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <div>
                      <p
                        className="text-[10px] font-bold uppercase"
                        style={{
                          color: t.textFaint,
                          letterSpacing: "0.08em",
                        }}
                      >
                        Call to action
                      </p>

                      <p
                        className="mt-1.5 text-sm font-medium"
                        style={{ color: t.textMuted }}
                      >
                        {post.cta}
                      </p>
                    </div>

                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(36,120,255,0.10)",
                        color: "#2478FF",
                      }}
                    >
                      →
                    </span>
                  </div>
                )}

                {post.hashtags && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <p
                      className="mb-2 text-[10px] font-bold uppercase"
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Hashtags
                    </p>

                    <p
                      className="break-words text-sm leading-relaxed"
                      style={{ color: "#2478FF" }}
                    >
                      {post.hashtags}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ───────────────── REACH / LINKS ───────────────── */}
          {(post.taggedAccounts || post.linkUrl) && (
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Discovery & reach
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Accounts and destinations connected to this post.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {post.taggedAccounts && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase"
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Tagged accounts
                    </p>

                    <p
                      className="mt-2 break-words text-xs"
                      style={{ color: t.textMuted }}
                    >
                      {post.taggedAccounts}
                    </p>
                  </div>
                )}

                {post.linkUrl && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase"
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Destination link
                    </p>

                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1.5 truncate text-xs font-medium"
                      style={{ color: "#2478FF" }}
                    >
                      <span className="truncate">{post.linkUrl}</span>
                      <span className="flex-shrink-0">↗</span>
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ───────────────── CUSTOM FIELDS ───────────────── */}
          {post.customFields.length > 0 && (
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Additional details
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Extra information attached to this post.
                </p>
              </div>

              <div
                className="divide-y overflow-hidden rounded-2xl border"
                style={{
                  borderColor: t.inputBorder,
                  background: t.inputBg,
                }}
              >
                {post.customFields.map((f) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3 text-xs"
                    style={{
                      borderColor: t.inputBorder,
                    }}
                  >
                    <span
                      className="font-semibold"
                      style={{ color: t.textFaint }}
                    >
                      {f.label}
                    </span>

                    <span
                      className="break-words"
                      style={{ color: t.textMuted }}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ───────────────── FOOTER ───────────────── */}
      <div
        className="flex flex-shrink-0 items-center justify-between gap-4 border-t px-5 py-4 sm:px-7"
        style={{
          borderColor: t.cardBorder,
          background:
            theme === "dark"
              ? "rgba(20,20,20,0.96)"
              : "rgba(255,255,255,0.96)",
          backdropFilter: "blur(18px)",
        }}
      >
        {confirmingDelete ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-red-400">Delete this post permanently? This can't be undone.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold"
                style={{ background: t.pillBg, color: t.textMuted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete it"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden sm:block">
              <p
                className="text-[10px] font-medium"
                style={{ color: t.textMuted }}
              >
                {platformMeta.label}
                {post.postType ? ` · ${post.postType}` : ""}
              </p>

              <p
                className="mt-0.5 text-[9px]"
                style={{ color: t.textFaint }}
              >
                {post.assets.length > 0
                  ? `${post.assets.length} ${
                      post.assets.length === 1 ? "file" : "files"
                    } attached`
                  : "No content attached yet"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {canEditOrDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Delete post
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: t.pillBg,
                  color: t.textMuted,
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
}

export default function CalendarGrid({
  calendarId,
  planStatus,
  initialPosts,
  userRole,
}: {
  calendarId: string;
  planStatus: string;
  initialPosts: CalendarPostData[];
  userRole: "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  };
  const t = THEMES[theme];

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const normalize = (p: CalendarPostData): CalendarPostData => ({
    ...p,
    assets: p.assets ?? [],
    videoComments: p.videoComments ?? [],
    customFields: p.customFields ?? [],
  });
  const [posts, setPosts] = useState<CalendarPostData[]>(initialPosts.map(normalize));
  const [addingDate, setAddingDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<CalendarPostData | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const postsForDate = (date: Date) =>
    posts
      .filter((p) => {
        const pd = new Date(p.postDate);
        return pd.getFullYear() === date.getFullYear() && pd.getMonth() === date.getMonth() && pd.getDate() === date.getDate();
      })
      .sort((a, b) => new Date(a.postDate).getTime() - new Date(b.postDate).getTime());

  const goToMonth = (delta: number) => setCurrentMonth(new Date(year, month + delta, 1));

  const today = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

  return (
    <div
      className="min-h-full rounded-2xl p-3 transition-colors duration-300 sm:p-4"
      style={{ background: t.pageBg, color: t.text }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: t.text }}>
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{ background: t.pillBg, color: t.textMuted }}
          >
            ←
          </button>
          <button
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{ background: t.pillBg, color: t.textMuted }}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, dayIdx) => (
          <div key={d} className="pb-2 text-center text-xs font-bold uppercase" style={{ color: DAY_COLORS[dayIdx] }}>
            {d}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dayPosts = postsForDate(date);
          const dayColor = DAY_COLORS[date.getDay()];

          return (
            <div
              key={i}
              className="flex min-h-[140px] flex-col gap-1.5 rounded-xl p-2 pt-1 sm:min-h-[170px]"
              style={{
                background: theme === "dark" ? `${dayColor}14` : `${dayColor}0d`,
                border: isToday(date) ? `1.5px solid ${dayColor}` : `1px solid ${dayColor}30`,
              }}
            >
              <span className="text-xs font-bold" style={{ color: dayColor }}>
                {date.getDate()}
              </span>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto pt-1">
                {dayPosts.map((post, postIndex) => (
                  <PostTile key={post.id} post={post} index={postIndex} onClick={() => setSelectedPost(post)} />
                ))}
                {userRole === "EDIT_CALENDAR" && (
                  <button
                    onClick={() => setAddingDate(date)}
                    className="flex w-full flex-shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[10px] font-semibold transition-colors hover:opacity-80"
                    style={{ borderColor: `${dayColor}55`, color: dayColor }}
                  >
                    <span className="text-sm leading-none">+</span> Add more files
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addingDate && (
        <AddPostPanel
          calendarId={calendarId}
          date={addingDate}
          theme={theme}
          onClose={() => setAddingDate(null)}
          onCreated={(newPosts) => setPosts((prev) => [...prev, ...newPosts.map(normalize)])}
        />
      )}

      {selectedPost && (
        <PostDetailPanel
          calendarId={calendarId}
          post={selectedPost}
          theme={theme}
          userRole={userRole}
          onClose={() => setSelectedPost(null)}
          onUpdated={(updated) => {
            const safe = normalize(updated);
            setPosts((prev) => prev.map((p) => (p.id === safe.id ? safe : p)));
            setSelectedPost(safe);
          }}
          onDeleted={(deletedId) => {
            setPosts((prev) => prev.filter((p) => p.id !== deletedId));
          }}
        />
      )}
    </div>
  );
}