"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarVideoComments, {
  type CalendarVideoCommentData,
} from "@/components/calendars/CalendarVideoComments";
import InstagramPreview from "@/components/calendars/InstagramPreview";
import TikTokPreview from "@/components/calendars/TikTokPreview";

type Platform =
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "X"
  | "LINKEDIN";

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

type InstagramPublishStatus = "NOT_SCHEDULED" | "SCHEDULED" | "PUBLISHED" | "FAILED";
type TikTokPublishStatus = "NOT_SCHEDULED" | "SCHEDULED" | "PUBLISHED" | "FAILED";
type TikTokPrivacyLevel = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

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
  instagramPublishStatus: InstagramPublishStatus;
  instagramPermalink: string | null;
  instagramPublishError: string | null;
  tikTokPublishStatus: TikTokPublishStatus;
  tikTokPrivacyLevel: TikTokPrivacyLevel | null;
  tikTokPublishError: string | null;
  assets: CalendarPostAssetData[];
  videoComments: CalendarVideoCommentData[];
  customFields: CalendarPostCustomFieldData[];
}
const PLATFORMS: {
  value: Platform;
  label: string;
  color: string;
}[] = [
  { value: "INSTAGRAM", label: "Instagram", color: "#E1306C" },
  { value: "TIKTOK", label: "TikTok", color: "#00F2EA" },
  { value: "YOUTUBE", label: "YouTube", color: "#FF0000" },
  { value: "FACEBOOK", label: "Facebook", color: "#1877F2" },
  { value: "X", label: "X", color: "#FFFFFF" },
  { value: "LINKEDIN", label: "LinkedIn", color: "#0A66C2" },
];

const POST_TYPES = [
  "Single Image",
  "Carousel",
  "Reel",
  "Video",
  "Story",
];

const DEFAULT_CATEGORIES = [
  "Educational",
  "Lifestyle",
  "Promotional",
  "Behind the Scenes",
  "Testimonial",
  "Announcement",
];

const DEFAULT_CTAS = [
  "Link in bio",
  "Comment below",
  "Shop now",
  "Swipe up",
  "DM us",
  "Tag a friend",
  "Save this post",
];

const DAY_COLORS = [
  "#FF6B4A",
  "#2478FF",
  "#6C5CE7",
  "#FFCC00",
  "#00C2A8",
  "#FF4D8D",
  "#9B59F6",
];

const APPROVAL_META: Record<
  ApprovalStatus,
  {
    text: string;
    color: string;
    bg: string;
  }
> = {
  PENDING: {
    text: "Awaiting client review",
    color: "#FFCC00",
    bg: "rgba(255,204,0,0.15)",
  },
  APPROVED: {
    text: "Approved",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.15)",
  },
  NEEDS_REVISION: {
    text: "Needs revision",
    color: "#F97316",
    bg: "rgba(249,115,22,0.15)",
  },
};

const THEMES: Record<
  Theme,
  {
    pageBg: string;
    cardBg: string;
    cardBorder: string;
    cardBorderActive: string;
    modalBg: string;
    text: string;
    textMuted: string;
    textFaint: string;
    inputBg: string;
    inputBorder: string;
    pillBg: string;
    pillText: string;
  }
> = {
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

/* =========================================================
   PLATFORM ICON
   ========================================================= */

function PlatformIcon({
  platform,
  className,
  style,
}: {
  platform: Platform;
  className?: string;
  style?: React.CSSProperties;
}) {
  switch (platform) {
    case "INSTAGRAM":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.2"
            cy="6.8"
            r="1"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );

    case "TIKTOK":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
        </svg>
      );

    case "YOUTUBE":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M22 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.3a3 3 0 0 0-2.1 2.1C2 8.9 2 12 2 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C6.1 19 12 19 12 19s5.9 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.5.4-4.6.4-4.6Zm-11.9 3V9l5.2 3-5.2 3Z" />
        </svg>
      );

    case "FACEBOOK":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
        </svg>
      );

    case "X":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
        </svg>
      );

    case "LINKEDIN":
      return (
        <svg
          className={className}
          style={style}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
        </svg>
      );
  }
}

/* =========================================================
   ICONS
   ========================================================= */

function IconPin({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="7" fill={color} />
      <circle
        cx="9.5"
        cy="7.5"
        r="2"
        fill="rgba(255,255,255,0.55)"
      />
      <path
        d="M12 16.5 L12 21"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLayers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 2 2 7l10 5 10-5-10-5Z"
        strokeLinejoin="round"
      />
      <path
        d="M2 17l10 5 10-5M2 12l10 5 10-5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.4 14.7A8.5 8.5 0 0 1 9.3 3.6a.6.6 0 0 0-.7-.85A10 10 0 1 0 21.25 15.4a.6.6 0 0 0-.85-.7Z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path
        d="m5 12.5 4.5 4.5L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   THEME TOGGLE
   ========================================================= */

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        theme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      className="
        flex h-9 w-9
        items-center justify-center
        rounded-full
        transition-all
        active:scale-95
        sm:h-10 sm:w-10
      "
      style={{
        background:
          theme === "dark"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
        color:
          theme === "dark"
            ? "#F5C842"
            : "#F59E0B",
      }}
    >
      {theme === "dark" ? (
        <IconMoon className="h-4 w-4" />
      ) : (
        <IconSun className="h-4 w-4" />
      )}
    </button>
  );
}

/* =========================================================
   VIDEO THUMBNAIL
   ========================================================= */

function VideoThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
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

        if (vid) {
          try {
            vid.currentTime = 0.1;
          } catch {}
        }
      }}
    />
  );
}

/* =========================================================
   POST TILE
   ========================================================= */

function PostTile({
  post,
  index,
  onClick,
  canDelete,
  onDelete,
}: {
  post: CalendarPostData;
  index: number;
  onClick: () => void;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  const meta = PLATFORMS.find(
    (p) => p.value === post.platform
  )!;

  const cover = post.assets[0];

  const approvalMeta =
    APPROVAL_META[post.approvalStatus];

  const tiltDeg = index % 2 === 0 ? -2 : 2;

  // Once an Instagram post has actually been scheduled, published,
  // or failed, that's more actionable information than the plain
  // approval status underneath it — this overrides the bottom badge
  // text/color in that case, rather than showing both at once on a
  // tile this small.
    const instagramStatusMeta =
    post.platform === "INSTAGRAM" && post.instagramPublishStatus !== "NOT_SCHEDULED"
      ? post.instagramPublishStatus === "PUBLISHED"
        ? { text: "Live on Instagram", color: "#E1306C" }
        : post.instagramPublishStatus === "SCHEDULED"
        ? { text: "Scheduled to publish", color: "#2478FF" }
        : { text: "Publish failed", color: "#EF4444" }
      : null;
  // A post is only ever one platform, so at most one of these two
  // is ever non-null at the same time — safe to just combine them.
  const tikTokStatusMeta =
    post.platform === "TIKTOK" && post.tikTokPublishStatus !== "NOT_SCHEDULED"
      ? post.tikTokPublishStatus === "PUBLISHED"
        ? { text: "Published to TikTok", color: "#00F2EA" }
        : post.tikTokPublishStatus === "SCHEDULED"
        ? { text: "Scheduled to publish", color: "#2478FF" }
        : { text: "Publish failed", color: "#EF4444" }
      : null;
  const bottomStatusMeta = instagramStatusMeta ?? tikTokStatusMeta ?? approvalMeta;

  const [confirmingDelete, setConfirmingDelete] =
    useState(false);
  const [deleting, setDeleting] = useState(false);

  const timeLabel = new Date(
    post.postDate
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="relative pt-2"
      style={{
        transform: `rotate(${tiltDeg}deg)`,
        transition: "transform 0.25s ease",
      }}
    >
      {/* Pin */}
      <span
        className="
          pointer-events-none
          absolute left-1/2 top-0
          z-10
          -translate-x-1/2
        "
        style={{
          filter:
            "drop-shadow(0 2px 2px rgba(0,0,0,0.35))",
        }}
      >
        <IconPin
          color={meta.color}
          className="h-4.5 w-4.5 sm:h-5 sm:w-5"
        />
      </span>

      <button
        type="button"
        onClick={onClick}
        className="
          group relative
          h-24 w-full
          flex-shrink-0
          overflow-hidden
          rounded-lg
          transition-all duration-200
          active:scale-[0.99]
          sm:h-[104px]
          md:h-[112px]
          lg:h-28
          lg:hover:scale-[1.03]
        "
        style={{
          background: cover
            ? "#000"
            : `${meta.color}26`,
          border: "3px solid #FBFAF7",
          boxShadow:
            "0 6px 14px -4px rgba(0,0,0,0.45)",
        }}
      >
        {cover ? (
          cover.mediaType === "VIDEO" ? (
            <VideoThumbnail
              src={cover.contentUrl}
              className="
                absolute inset-0
                h-full w-full
                object-cover
              "
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.contentUrl}
              alt=""
              className="
                absolute inset-0
                h-full w-full
                object-cover
              "
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlatformIcon
              platform={post.platform}
              className="h-7 w-7"
              style={{ color: meta.color }}
            />
          </div>
        )}

        {cover?.mediaType === "VIDEO" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="
                flex h-8 w-8
                items-center justify-center
                rounded-full
              "
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(2px)",
              }}
            >
              <IconPlay className="ml-0.5 h-4 w-4 text-white" />
            </span>
          </div>
        )}

        {cover && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        )}

        {/* Platform */}
        <span
          className="
            absolute left-1.5 top-1.5
            flex h-5 w-5
            items-center justify-center
            rounded-full
          "
          style={{
            background: "rgba(0,0,0,0.55)",
            color: meta.color,
            backdropFilter: "blur(4px)",
          }}
        >
          <PlatformIcon
            platform={post.platform}
            className="h-3 w-3"
          />
        </span>

        {/* Time */}
        <span
          className="
            absolute right-1.5 top-1.5
            flex items-center
            gap-1
            rounded-full
            px-1.5 py-0.5
            text-[8px]
            font-bold
            text-white
          "
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          {timeLabel}
        </span>

        {/* Carousel count */}
        {post.assets.length > 1 && (
          <span
            className="
              absolute left-1.5 bottom-6
              flex items-center gap-0.5
              rounded-full
              px-1.5 py-0.5
              text-[9px]
              font-bold
              text-white
            "
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
            }}
          >
            <IconLayers className="h-2.5 w-2.5" />
            {post.assets.length}
          </span>
        )}

        {/* Approved */}
        {cover &&
          post.approvalStatus === "APPROVED" && (
            <span
              className="
                absolute bottom-6 right-1.5
                flex h-5 w-5
                items-center justify-center
                rounded-full
              "
              style={{
                background: "#22C55E",
                boxShadow:
                  "0 0 0 2px rgba(0,0,0,0.4)",
              }}
            >
              <IconCheck className="h-3 w-3 text-white" />
            </span>
          )}

           {/* Status — Instagram publish status when relevant, plain
            approval status otherwise. */}
        {cover && (
          <span
            className="
              absolute
              bottom-1.5 left-1.5 right-1.5
              truncate
              rounded
              px-1.5 py-0.5
              text-left
              text-[9px]
              font-semibold
            "
            style={{
              color: bottomStatusMeta.color,
              background: "rgba(0,0,0,0.55)",
            }}
          >
            {bottomStatusMeta.text}
          </span>
        )}
      </button>

      {/* Quick delete — a sibling of the tile's own button, since a
          button can't be nested inside another one. Confirms inline
          on the tile itself first, rather than deleting on the very
          first tap, which would be too easy to trigger by accident
          on a tile this small. */}
      {canDelete && !confirmingDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
          aria-label="Delete this post"
          className="
            absolute right-1 top-1
            z-20
            flex h-5 w-5
            items-center justify-center
            rounded-full
            text-xs
            font-bold
            text-white
            transition-all
            active:scale-90
          "
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          ×
        </button>
      )}

      {canDelete && confirmingDelete && (
        <div
          className="
            absolute inset-x-0 top-2 bottom-0
            z-20
            flex flex-col
            items-center justify-center
            gap-1.5
            rounded-lg
            p-2
            text-center
          "
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          {deleting ? (
            <>
              <span
                className="
                  h-4 w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/30
                  border-t-white
                "
              />
              <p className="text-[10px] font-semibold text-white/70">
                Deleting...
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-white">
                Delete this post?
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setDeleting(true);
                    await onDelete();
                    // No need to reset deleting/confirmingDelete on
                    // success — the tile itself is removed from the
                    // calendar the moment the parent's state updates.
                    // Only reset here if something went wrong and
                    // this tile is still around to show it.
                    setDeleting(false);
                  }}
                  className="
                    rounded-full
                    bg-red-500
                    px-2.5 py-1
                    text-[10px]
                    font-semibold
                    text-white
                    transition-colors
                    hover:bg-red-600
                  "
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(false);
                  }}
                  className="
                    rounded-full
                    bg-white/15
                    px-2.5 py-1
                    text-[10px]
                    font-semibold
                    text-white
                  "
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ADD POST PANEL
   ========================================================= */

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

  // Multiple platforms can be selected at once — if it's the exact
  // same content going out everywhere, one post gets created per
  // platform chosen here, instead of repeating this whole form once
  // per platform.
  const [platforms, setPlatforms] =
    useState<Platform[]>([]);

  const [tikTokPrivacyLevel, setTikTokPrivacyLevel] =
    useState<"PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY">("SELF_ONLY");

  // Time of day this post is scheduled for — combined with the
  // clicked calendar day before sending to the server, since the day
  // alone would otherwise default to midnight.
  const [postTime, setPostTime] = useState("09:00");

  const [postType, setPostType] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] =
    useState("");
  const [addingCustomCategory, setAddingCustomCategory] =
    useState(false);

  const [caption, setCaption] = useState("");
  const [contentIdea, setContentIdea] =
    useState("");

  const [cta, setCta] = useState("");
  const [customCta, setCustomCta] = useState("");
  const [addingCustomCta, setAddingCustomCta] =
    useState(false);

  const [hashtags, setHashtags] = useState("");
  const [taggedAccounts, setTaggedAccounts] =
    useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [customFields, setCustomFields] =
    useState<
      { label: string; value: string }[]
    >([]);

  // Optional — if the content is already ready, it can be attached
  // right here at creation time instead of only afterward from the
  // post's own tile.
  const [pendingFiles, setPendingFiles] =
    useState<{ file: File; previewUrl: string }[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploadingStage, setUploadingStage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) =>
      prev.includes(p)
        ? prev.filter((x) => x !== p)
        : [...prev, p]
    );

  const addCustomField = () =>
    setCustomFields((prev) => [
      ...prev,
      { label: "", value: "" },
    ]);

  const updateCustomField = (
    index: number,
    key: "label" | "value",
    val: string
  ) =>
    setCustomFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, [key]: val }
          : f
      )
    );

  const removeCustomField = (index: number) =>
    setCustomFields((prev) =>
      prev.filter((_, i) => i !== index)
    );

  // Mirrors pendingFiles at all times. Async functions below read
  // from this ref instead of the state variable directly — refs
  // always hold the current value no matter when the enclosing
  // function was created, which rules out any possibility of an
  // upload silently running against an outdated, stale list of
  // files depending on what order things were clicked in.
  const pendingFilesRef = useRef<
    { file: File; previewUrl: string }[]
  >([]);
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  // The preview URL is created exactly once per file, right here —
  // not during render — so the browser gets a stable src that
  // actually finishes loading, instead of a brand new blob URL every
  // time the form re-renders (which happens on every keystroke
  // elsewhere in the form).
  const addFiles = (files: FileList) => {
    // Converted to real, independent objects right here, synchronously,
    // the instant this runs — not deferred into the setState updater
    // below. React doesn't guarantee that updater function runs
    // immediately; if it runs after the input's value gets cleared,
    // reading the browser's live FileList at that point could see it
    // already emptied out.
    const newEntries = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingFiles((prev) => [...prev, ...newEntries]);
  };

  const removePendingFile = (index: number) =>
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });

  // Clean up every remaining object URL when the panel closes. Reads
  // from the ref (not the pendingFiles variable) so this always sees
  // whatever was actually selected most recently, not just whatever
  // existed the one time this effect was first set up.
  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((pf) =>
        URL.revokeObjectURL(pf.previewUrl)
      );
    };
  }, []);

  // Uploads every pending file onto one already-created post — same
  // presign → PUT → complete flow used from the post's own detail
  // panel.
  const uploadFilesToPost = async (
    postId: string
  ): Promise<CalendarPostData | null> => {
    let latestPost: CalendarPostData | null = null;

    for (const { file } of pendingFilesRef.current) {
      const presignRes = await fetch(
        `/api/calendars/${calendarId}/posts/${postId}/upload-presign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        }
      );
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(
          presignData.error ?? "Failed to start upload"
        );
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      const mediaType = file.type.startsWith("video/")
        ? "VIDEO"
        : "PHOTO";

      const completeRes = await fetch(
        `/api/calendars/${calendarId}/posts/${postId}/upload-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileKey: presignData.fileKey,
            mediaType,
          }),
        }
      );
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(
          completeData.error ?? "Failed to save content"
        );
      }

      // Each successive upload's response already includes every
      // asset attached so far — capturing it here is what actually
      // lets the calendar show the real image immediately, instead
      // of discarding the result of every upload.
      latestPost = completeData.post;
    }

    return latestPost;
  };

  const submit = async () => {
    if (platforms.length === 0) {
      setError("Pick at least one platform");
      return;
    }

    setSaving(true);
    setError(null);
    setUploadingStage(null);

    const finalCategory = addingCustomCategory
      ? customCategory.trim()
      : category;

    const finalCta = addingCustomCta
      ? customCta.trim()
      : cta;

    // Combine the day that was clicked with the chosen time of day —
    // without this, every post would default to midnight regardless
    // of when it's actually meant to go out.
    const [hours, minutes] = postTime.split(":").map(Number);
    const fullDate = new Date(date);
    fullDate.setHours(hours || 0, minutes || 0, 0, 0);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
            tikTokPrivacyLevel: platforms.includes("TIKTOK") ? tikTokPrivacyLevel : undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "Failed to add post"
        );
      }

      const createdPosts: CalendarPostData[] = (
        data.posts ?? [data.post]
      ).map((p: CalendarPostData) => ({
        ...p,
        assets: p.assets ?? [],
        videoComments: p.videoComments ?? [],
        customFields: p.customFields ?? [],
      }));

      // Uploading is entirely optional — if files were attached,
      // every platform's post gets the same content; if not, the
      // posts are simply created empty, ready to have content added
      // later from their own tile, exactly as before.
      if (pendingFilesRef.current.length > 0) {
        for (let i = 0; i < createdPosts.length; i++) {
          setUploadingStage(
            `Uploading content (${i + 1}/${createdPosts.length})...`
          );
          const updated = await uploadFilesToPost(createdPosts[i].id);
          if (updated) {
            createdPosts[i] = {
              ...updated,
              assets: updated.assets ?? [],
              videoComments: updated.videoComments ?? [],
              customFields: updated.customFields ?? [],
            };
          }
        }
      }

      onCreated(createdPosts);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
      setUploadingStage(null);
    }
  };

  const inputStyle = {
    background: t.inputBg,
    borderColor: t.inputBorder,
    color: t.text,
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-end justify-center
        bg-black/75
        p-0
        sm:items-center sm:p-4
        md:p-6
      "
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative
          flex
          h-[96dvh]
          max-h-[96dvh]
          w-full
          flex-col
          overflow-hidden
          rounded-t-3xl
          border
          shadow-2xl
          sm:h-auto
          sm:max-h-[94vh]
          sm:max-w-xl
          sm:rounded-3xl
        "
        style={{
          background: t.modalBg,
          borderColor: t.cardBorder,
          boxShadow:
            theme === "dark"
              ? "0 35px 120px rgba(0,0,0,0.6)"
              : "0 35px 120px rgba(0,0,0,0.16)",
        }}
      >
        {/* HEADER */}
        <div
          className="
            flex-shrink-0
            border-b
            px-4 py-4
            sm:px-7 sm:py-6
          "
          style={{
            borderColor: t.cardBorder,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex h-10 w-10
                  flex-shrink-0
                  items-center justify-center
                  rounded-2xl
                "
                style={{
                  background:
                    "rgba(36,120,255,0.1)",
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
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="3"
                  />
                  <path
                    d="M8 2.5v4M16 2.5v4M3 9h18"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 12v6M9 15h6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="
                      text-base
                      font-semibold
                      tracking-tight
                      sm:text-lg
                    "
                    style={{ color: t.text }}
                  >
                    Plan a post
                  </h2>

                  <span
                    className="
                      rounded-full
                      px-2 py-0.5
                      text-[8px]
                      font-bold
                      uppercase
                    "
                    style={{
                      background: t.pillBg,
                      color: t.textFaint,
                      letterSpacing: "0.08em",
                    }}
                  >
                    New post
                  </span>
                </div>

                <p
                  className="mt-1 text-[10px] sm:text-xs"
                  style={{
                    color: t.textMuted,
                  }}
                >
                  {date.toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="
                flex h-9 w-9
                flex-shrink-0
                items-center justify-center
                rounded-full
                text-lg
                transition-all
                active:scale-95
              "
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className="
              flex flex-col gap-7
              px-4 py-5
              sm:px-7 sm:py-6
            "
          >
            {/* DATE & TIME */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  When is this going out?
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  The calendar date is already set — pick the time
                  of day this post is scheduled for.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className="
                    flex items-center gap-3
                    rounded-xl
                    border
                    px-4 py-3
                  "
                  style={{
                    background: t.inputBg,
                    borderColor: t.inputBorder,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 flex-shrink-0"
                    fill="none"
                    stroke={t.textFaint}
                    strokeWidth="1.8"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="17"
                      rx="3"
                    />
                    <path
                      d="M8 2.5v4M16 2.5v4M3 9h18"
                      strokeLinecap="round"
                    />
                  </svg>

                  <span
                    className="truncate text-xs font-medium"
                    style={{
                      color: t.textMuted,
                    }}
                  >
                    {date.toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>

                <div
                  className="
                    flex items-center gap-3
                    rounded-xl
                    border
                    px-4 py-2.5
                  "
                  style={{
                    background: t.inputBg,
                    borderColor: t.inputBorder,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 flex-shrink-0"
                    fill="none"
                    stroke={t.textFaint}
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      d="M12 7v5l3 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <input
                    type="time"
                    value={postTime}
                    onChange={(e) =>
                      setPostTime(e.target.value)
                    }
                    style={{
                      fontSize: "16px",
                      color: t.text,
                    }}
                    className="
                      w-full
                      min-w-0
                      bg-transparent
                      text-xs
                      font-medium
                      outline-none
                    "
                  />
                </div>
              </div>
            </section>

            {/* PLATFORM */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Where are you posting?
                </h3>

                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: t.textFaint }}
                >
                  Select every platform this exact same content is
                  going to — one post gets created per platform you
                  pick, all sharing everything below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PLATFORMS.map((p) => {
                  const selected =
                    platforms.includes(p.value);

                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        togglePlatform(p.value)
                      }
                      className="
                        group
                        relative
                        flex
                        min-h-[60px]
                        items-center
                        gap-2.5
                        rounded-2xl
                        border
                        p-3
                        text-left
                        transition-all
                        active:scale-[0.98]
                      "
                      style={{
                        borderColor: selected
                          ? p.color
                          : t.inputBorder,
                        background: selected
                          ? `${p.color}12`
                          : t.inputBg,
                        boxShadow: selected
                          ? `0 8px 24px ${p.color}18`
                          : "none",
                      }}
                    >
                      <span
                        className="
                          flex h-9 w-9
                          flex-shrink-0
                          items-center justify-center
                          rounded-xl
                        "
                        style={{
                          background: selected
                            ? `${p.color}18`
                            : t.pillBg,
                          color: p.color,
                        }}
                      >
                        <PlatformIcon
                          platform={p.value}
                          className="h-4 w-4"
                        />
                      </span>

                      <span className="min-w-0">
                        <span
                          className="
                            block
                            truncate
                            text-xs
                            font-semibold
                          "
                          style={{
                            color: selected
                              ? t.text
                              : t.textMuted,
                          }}
                        >
                          {p.label}
                        </span>

                        {selected && (
                          <span
                            className="
                              mt-0.5
                              block
                              text-[9px]
                              font-medium
                            "
                            style={{
                              color: p.color,
                            }}
                          >
                            Selected
                          </span>
                        )}
                      </span>

                      {selected && (
                        <span
                          className="
                            absolute
                            right-2
                            top-2
                            flex h-4 w-4
                            items-center justify-center
                            rounded-full
                          "
                          style={{
                            background: p.color,
                            color: "#fff",
                          }}
                        >
                          <IconCheck className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

                            {platforms.length > 1 && (
                <div
                  className="
                    mt-3
                    rounded-xl
                    border
                    p-3
                  "
                  style={{
                    background:
                      "rgba(36,120,255,0.05)",
                    borderColor:
                      "rgba(36,120,255,0.1)",
                  }}
                >
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: t.textMuted }}
                  >
                    This will create {platforms.length} separate
                    posts — one for each platform selected — all
                    with the same content below.
                  </p>
                </div>
              )}

              {/* TikTok requires a real, active privacy choice —
                  it can never be silently decided by this app, and
                  which levels are even available differs per
                  account (checked for real right before publish). */}
              {platforms.includes("TIKTOK") && (
                <div
                  className="mt-3 rounded-xl border p-3"
                  style={{ background: "rgba(0,242,234,0.05)", borderColor: "rgba(0,242,234,0.18)" }}
                >
                  <p className="mb-2 text-[11px] font-semibold" style={{ color: t.text }}>
                    TikTok privacy level
                  </p>
                  <p className="mb-3 text-[10px] leading-relaxed" style={{ color: t.textFaint }}>
                    TikTok requires this to be chosen up front — whichever level isn&apos;t actually available on the connected account will be flagged when it publishes.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "PUBLIC_TO_EVERYONE", label: "Public" },
                        { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
                        { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
                        { value: "SELF_ONLY", label: "Only me" },
                      ] as const
                    ).map((option) => {
                      const selected = tikTokPrivacyLevel === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTikTokPrivacyLevel(option.value)}
                          className="rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all"
                          style={{
                            borderColor: selected ? "#00C2B8" : t.inputBorder,
                            background: selected ? "rgba(0,242,234,0.12)" : t.inputBg,
                            color: selected ? "#00C2B8" : t.pillText,
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* POST TYPE */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  What are you publishing?
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Choose the format of your content.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {POST_TYPES.map((type) => {
                  const selected =
                    postType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setPostType(type)
                      }
                      className="
                        rounded-xl
                        border
                        px-3 py-3
                        text-left
                        text-xs
                        font-semibold
                        transition-all
                        active:scale-[0.98]
                      "
                      style={{
                        borderColor: selected
                          ? "#2478FF"
                          : t.inputBorder,
                        background: selected
                          ? "rgba(36,120,255,0.1)"
                          : t.inputBg,
                        color: selected
                          ? t.text
                          : t.pillText,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{type}</span>

                        {selected && (
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background:
                                "#2478FF",
                            }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {postType === "Carousel" && (
                <div
                  className="
                    mt-3
                    rounded-xl
                    border
                    p-3
                  "
                  style={{
                    background:
                      "rgba(36,120,255,0.05)",
                    borderColor:
                      "rgba(36,120,255,0.1)",
                  }}
                >
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{
                      color: t.textMuted,
                    }}
                  >
                    A carousel can contain several
                    images or videos uploaded together.
                  </p>
                </div>
              )}
            </section>

            {/* CATEGORY */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Content category
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Optional — useful for organizing your calendar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const selected =
                    category === cat &&
                    !addingCustomCategory;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setAddingCustomCategory(
                          false
                        );
                      }}
                      className="
                        rounded-full
                        border
                        px-3 py-2
                        text-[11px]
                        font-semibold
                        transition-all
                        active:scale-[0.98]
                      "
                      style={{
                        borderColor: selected
                          ? "#2478FF"
                          : t.inputBorder,
                        background: selected
                          ? "rgba(36,120,255,0.11)"
                          : t.pillBg,
                        color: selected
                          ? "#2478FF"
                          : t.pillText,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setAddingCustomCategory(
                      true
                    )
                  }
                  className="
                    rounded-full
                    border
                    px-3 py-2
                    text-[11px]
                    font-semibold
                    transition-all
                  "
                  style={{
                    borderColor:
                      addingCustomCategory
                        ? "#2478FF"
                        : t.inputBorder,
                    background:
                      addingCustomCategory
                        ? "rgba(36,120,255,0.11)"
                        : t.pillBg,
                    color:
                      addingCustomCategory
                        ? "#2478FF"
                        : t.pillText,
                  }}
                >
                  + Custom
                </button>
              </div>

              {addingCustomCategory && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) =>
                    setCustomCategory(
                      e.target.value
                    )
                  }
                  placeholder="Enter your own category"
                  autoFocus
                  style={{
                    fontSize: "16px",
                    ...inputStyle,
                  }}
                  className="
                    mt-3
                    w-full
                    rounded-xl
                    border
                    px-4 py-3
                    text-sm
                    outline-none
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              )}
            </section>

            {/* CONTENT */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Content details
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  Give your team enough context to create
                  the post correctly.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-[10px]
                      font-bold
                      uppercase
                    "
                    style={{
                      color: t.textFaint,
                      letterSpacing: "0.09em",
                    }}
                  >
                    Caption
                  </label>

                  <textarea
                    value={caption}
                    onChange={(e) =>
                      setCaption(e.target.value)
                    }
                    rows={4}
                    placeholder="Write the caption..."
                    style={{
                      fontSize: "16px",
                      ...inputStyle,
                    }}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      px-4 py-3
                      text-sm
                      leading-relaxed
                      outline-none
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-[10px]
                      font-bold
                      uppercase
                    "
                    style={{
                      color: t.textFaint,
                      letterSpacing: "0.09em",
                    }}
                  >
                    Creative direction
                  </label>

                  <textarea
                    value={contentIdea}
                    onChange={(e) =>
                      setContentIdea(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Describe the idea, mood or direction..."
                    style={{
                      fontSize: "16px",
                      ...inputStyle,
                    }}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      px-4 py-3
                      text-sm
                      leading-relaxed
                      outline-none
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  />
                </div>
              </div>
            </section>

            {/* CTA */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Call to action
                </h3>

                <p
                  className="mt-1 text-[11px]"
                  style={{ color: t.textFaint }}
                >
                  What should the audience do next?
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_CTAS.map((c) => {
                  const selected =
                    cta === c && !addingCustomCta;

                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCta(c);
                        setAddingCustomCta(
                          false
                        );
                      }}
                      className="
                        rounded-full
                        border
                        px-3 py-2
                        text-[11px]
                        font-semibold
                        transition-all
                      "
                      style={{
                        borderColor: selected
                          ? "#2478FF"
                          : t.inputBorder,
                        background: selected
                          ? "rgba(36,120,255,0.11)"
                          : t.pillBg,
                        color: selected
                          ? "#2478FF"
                          : t.pillText,
                      }}
                    >
                      {c}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setAddingCustomCta(true)
                  }
                  className="
                    rounded-full
                    border
                    px-3 py-2
                    text-[11px]
                    font-semibold
                  "
                  style={{
                    borderColor:
                      addingCustomCta
                        ? "#2478FF"
                        : t.inputBorder,
                    background:
                      addingCustomCta
                        ? "rgba(36,120,255,0.11)"
                        : t.pillBg,
                    color:
                      addingCustomCta
                        ? "#2478FF"
                        : t.pillText,
                  }}
                >
                  + Custom
                </button>
              </div>

              {addingCustomCta && (
                <input
                  type="text"
                  value={customCta}
                  onChange={(e) =>
                    setCustomCta(e.target.value)
                  }
                  placeholder="Write your own call to action"
                  autoFocus
                  style={{
                    fontSize: "16px",
                    ...inputStyle,
                  }}
                  className="
                    mt-3
                    w-full
                    rounded-xl
                    border
                    px-4 py-3
                    text-sm
                    outline-none
                  "
                />
              )}
            </section>

            {/* DISCOVERY */}
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
                  Add hashtags, mentions or a destination link.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-[10px]
                      font-bold
                      uppercase
                    "
                    style={{
                      color: t.textFaint,
                      letterSpacing: "0.09em",
                    }}
                  >
                    Hashtags
                  </label>

                  <textarea
                    value={hashtags}
                    onChange={(e) =>
                      setHashtags(e.target.value)
                    }
                    rows={2}
                    placeholder="#yourbrand #contentcreator"
                    style={{
                      fontSize: "16px",
                      ...inputStyle,
                    }}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      px-4 py-3
                      text-sm
                      outline-none
                    "
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      className="
                        mb-2 block
                        text-[10px]
                        font-bold
                        uppercase
                      "
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.09em",
                      }}
                    >
                      Tagged accounts
                    </label>

                    <input
                      type="text"
                      value={taggedAccounts}
                      onChange={(e) =>
                        setTaggedAccounts(
                          e.target.value
                        )
                      }
                      placeholder="@someone"
                      style={{
                        fontSize: "16px",
                        ...inputStyle,
                      }}
                      className="
                        w-full
                        rounded-xl
                        border
                        px-4 py-3
                        text-sm
                        outline-none
                      "
                    />
                  </div>

                  <div>
                    <label
                      className="
                        mb-2 block
                        text-[10px]
                        font-bold
                        uppercase
                      "
                      style={{
                        color: t.textFaint,
                        letterSpacing: "0.09em",
                      }}
                    >
                      Link
                    </label>

                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) =>
                        setLinkUrl(e.target.value)
                      }
                      placeholder="https://"
                      style={{
                        fontSize: "16px",
                        ...inputStyle,
                      }}
                      className="
                        w-full
                        rounded-xl
                        border
                        px-4 py-3
                        text-sm
                        outline-none
                      "
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* CONTENT FILES (OPTIONAL, UPLOAD NOW) */}
            <section>
              <div className="mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: t.text }}
                >
                  Content files
                </h3>

                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: t.textFaint }}
                >
                  Optional — if you already have the image or video
                  ready, attach it now. If not, that&apos;s fine too:
                  you can come back and upload it later from this
                  post&apos;s own tile.
                </p>
              </div>

              {pendingFiles.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {pendingFiles.map(({ file, previewUrl }, i) => {
                    const isVideo = file.type.startsWith("video/");
                    return (
                      <div
                        key={i}
                        className="
                          relative
                          aspect-square
                          overflow-hidden
                          rounded-xl
                          border
                        "
                        style={{
                          background: t.inputBg,
                          borderColor: t.inputBorder,
                        }}
                      >
                        {isVideo ? (
                          <video
                            src={previewUrl}
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}

                        {isVideo && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[10px] text-white">
                              ▶
                            </span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            removePendingFile(i)
                          }
                          className="
                            absolute right-1 top-1
                            flex h-6 w-6
                            items-center justify-center
                            rounded-full
                            bg-black/65
                            text-xs
                            text-white
                            backdrop-blur-md
                            transition-all
                            hover:bg-red-500
                            active:scale-95
                          "
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <label
                className="
                  group
                  flex
                  min-h-[60px]
                  cursor-pointer
                  items-center
                  justify-center
                  gap-3
                  rounded-2xl
                  border
                  border-dashed
                  px-4 py-3
                  text-center
                  transition-all
                  hover:border-blue-500/40
                  active:scale-[0.99]
                "
                style={{
                  borderColor: t.inputBorder,
                  background: t.inputBg,
                }}
              >
                <span
                  className="
                    flex h-9 w-9
                    flex-shrink-0
                    items-center justify-center
                    rounded-xl
                  "
                  style={{
                    background: "rgba(36,120,255,0.1)",
                    color: "#2478FF",
                  }}
                >
                  +
                </span>

                <span className="min-w-0 text-left">
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: "#2478FF" }}
                  >
                    {pendingFiles.length > 0
                      ? "Add another file"
                      : "Attach content now"}
                  </span>

                  <span
                    className="mt-0.5 block text-[9px]"
                    style={{ color: t.textFaint }}
                  >
                    JPG, PNG, WebP, MP4, MOV or WebM — optional
                  </span>
                </span>

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    if (
                      e.target.files &&
                      e.target.files.length > 0
                    ) {
                      addFiles(e.target.files);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </label>
            </section>

            {/* CUSTOM FIELDS */}
            <section>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: t.text }}
                  >
                    Additional details
                  </h3>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      leading-relaxed
                    "
                    style={{ color: t.textFaint }}
                  >
                    Music, location, filter, reference or
                    anything else your team needs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCustomField}
                  className="
                    flex
                    flex-shrink-0
                    items-center
                    gap-1.5
                    rounded-lg
                    px-3 py-2
                    text-[10px]
                    font-bold
                  "
                  style={{
                    background:
                      "rgba(36,120,255,0.1)",
                    color: "#2478FF",
                  }}
                >
                  <span className="text-sm">+</span>
                  <span className="hidden xs:inline">
                    Add detail
                  </span>
                  <span className="xs:hidden">
                    Add
                  </span>
                </button>
              </div>

              {customFields.length === 0 ? (
                <button
                  type="button"
                  onClick={addCustomField}
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-dashed
                    p-5
                    text-center
                    transition-all
                    hover:border-blue-500/40
                  "
                  style={{
                    borderColor: t.inputBorder,
                    background: t.inputBg,
                  }}
                >
                  <div
                    className="
                      mx-auto mb-2
                      flex h-8 w-8
                      items-center justify-center
                      rounded-full
                    "
                    style={{
                      background: t.pillBg,
                      color: t.textFaint,
                    }}
                  >
                    +
                  </div>

                  <p
                    className="text-xs font-semibold"
                    style={{ color: t.textMuted }}
                  >
                    Add a custom detail
                  </p>

                  <p
                    className="mt-1 text-[10px]"
                    style={{ color: t.textFaint }}
                  >
                    Keep important information that doesn't fit above.
                  </p>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {customFields.map((field, i) => (
                    <div
                      key={i}
                      className="
                        flex flex-col gap-2
                        rounded-xl
                        border
                        p-2
                        sm:flex-row
                        sm:items-center
                      "
                      style={{
                        background: t.inputBg,
                        borderColor: t.inputBorder,
                      }}
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateCustomField(
                            i,
                            "label",
                            e.target.value
                          )
                        }
                        placeholder="Detail name"
                        style={{
                          fontSize: "16px",
                          ...inputStyle,
                        }}
                        className="
                          w-full
                          rounded-lg
                          border
                          px-3 py-2.5
                          text-xs
                          outline-none
                          sm:w-1/3
                        "
                      />

                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          updateCustomField(
                            i,
                            "value",
                            e.target.value
                          )
                        }
                        placeholder="Enter detail"
                        style={{
                          fontSize: "16px",
                          ...inputStyle,
                        }}
                        className="
                          min-w-0
                          w-full
                          rounded-lg
                          border
                          px-3 py-2.5
                          text-xs
                          outline-none
                          sm:flex-1
                        "
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeCustomField(i)
                        }
                        className="
                          flex
                          h-9
                          w-full
                          items-center
                          justify-center
                          rounded-lg
                          text-xs
                          font-medium
                          text-red-400
                          transition-colors
                          hover:bg-red-500/10
                          sm:h-8 sm:w-8
                        "
                        aria-label="Remove detail"
                      >
                        <span className="sm:hidden">
                          Remove detail
                        </span>

                        <span className="hidden sm:block">
                          ×
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ERROR */}
            {error && (
              <div
                className="
                  flex items-start gap-3
                  rounded-xl
                  border
                  p-3.5
                "
                style={{
                  background:
                    "rgba(239,68,68,0.07)",
                  borderColor:
                    "rgba(239,68,68,0.15)",
                }}
              >
                <span
                  className="
                    flex h-5 w-5
                    flex-shrink-0
                    items-center justify-center
                    rounded-full
                    bg-red-500/10
                    text-[10px]
                    font-bold
                    text-red-400
                  "
                >
                  !
                </span>

                <p className="text-xs leading-relaxed text-red-300">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            flex
            flex-shrink-0
            items-center
            justify-between
            gap-2
            border-t
            px-4 py-3
            sm:px-7 sm:py-4
          "
          style={{
            borderColor: t.cardBorder,
            background:
              theme === "dark"
                ? "rgba(20,20,20,0.96)"
                : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="
              min-h-11
              rounded-xl
              px-3
              text-xs
              font-semibold
              transition-colors
              hover:bg-black/5
              dark:hover:bg-white/5
            "
            style={{ color: t.textMuted }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={
              saving || platforms.length === 0
            }
            className="
              flex
              min-h-11
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              px-4 py-2.5
              text-xs
              font-semibold
              text-white
              transition-all
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-40
              sm:flex-none
              sm:px-5
            "
            style={{
              background:
                "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
              boxShadow: platforms.length > 0
                ? "0 8px 24px rgba(36,120,255,0.22)"
                : "none",
            }}
          >
            {saving ? (
              <>
                <span className="
                  h-3.5 w-3.5
                  animate-spin
                  rounded-full
                  border-2
                  border-white/30
                  border-t-white
                " />
                {uploadingStage ?? "Adding..."}
              </>
            ) : (
              <>
                Add to calendar
                <span className="text-white/70">
                  →
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   POST DETAIL PANEL
   ========================================================= */

function PostDetailPanel({
  calendarId,
  post,
  theme,
  onClose,
  onUpdated,
}: {
  calendarId: string;
  post: CalendarPostData;
  theme: Theme;
  onClose: () => void;
  onUpdated: (post: CalendarPostData) => void;
}) {
  const t = THEMES[theme];
  const router = useRouter();

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [activeAssetIdx, setActiveAssetIdx] =
    useState(0);

  const platformMeta =
    PLATFORMS.find(
      (p) => p.value === post.platform
    )!;

  const approvalMeta =
    APPROVAL_META[post.approvalStatus];

  const activeAsset =
    post.assets[activeAssetIdx] ??
    post.assets[0] ??
    null;

  const uploadOne = async (file: File) => {
    const presignRes = await fetch(
      `/api/calendars/${calendarId}/posts/${post.id}/upload-presign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      }
    );

    const presignData =
      await presignRes.json();

    if (!presignRes.ok) {
      throw new Error(
        presignData.error ??
          "Failed to start upload"
      );
    }

    const uploadRes = await fetch(
      presignData.uploadUrl,
      {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      }
    );

    if (!uploadRes.ok) {
      throw new Error(
        "Failed to upload file"
      );
    }

    const mediaType =
      file.type.startsWith("video/")
        ? "VIDEO"
        : "PHOTO";

    const completeRes = await fetch(
      `/api/calendars/${calendarId}/posts/${post.id}/upload-complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey: presignData.fileKey,
          mediaType,
        }),
      }
    );

    const completeData =
      await completeRes.json();

    if (!completeRes.ok) {
      throw new Error(
        completeData.error ??
          "Failed to save content"
      );
    }

    return completeData.post;
  };

  const uploadMany = async (
    files: FileList
  ) => {
    setUploading(true);
    setError(null);

    try {
      let latest = post;

      for (const file of Array.from(
        files
      )) {
        latest = await uploadOne(file);
      }

      onUpdated({
        ...latest,
        assets: latest.assets ?? [],
        videoComments:
          latest.videoComments ?? [],
        customFields:
          latest.customFields ?? [],
      });

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = async (
    assetId: string
  ) => {
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/posts/${post.id}/assets/${assetId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to remove content"
        );
      }

      const updatedAssets =
        post.assets.filter(
          (a) => a.id !== assetId
        );

      onUpdated({
        ...post,
        assets: updatedAssets,
      });

      setActiveAssetIdx(0);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove content"
      );
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-end justify-center
        bg-black/75
        p-0
        sm:items-center sm:p-4
        md:p-6
      "
      onClick={onClose}
    >
      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        className="
          relative
          flex
          h-[96dvh]
          max-h-[96dvh]
          w-full
          flex-col
          overflow-hidden
          rounded-t-3xl
          border
          shadow-2xl
          sm:h-auto
          sm:max-h-[94vh]
          sm:max-w-2xl
          sm:rounded-3xl
        "
        style={{
          background: t.modalBg,
          borderColor: t.cardBorder,
          boxShadow:
            theme === "dark"
              ? "0 35px 120px rgba(0,0,0,0.6)"
              : "0 35px 120px rgba(0,0,0,0.16)",
        }}
      >
        {/* HEADER */}
        <div
          className="
            flex-shrink-0
            border-b
            px-4 py-4
            sm:px-7 sm:py-6
          "
          style={{
            borderColor: t.cardBorder,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex h-10 w-10
                  flex-shrink-0
                  items-center justify-center
                  rounded-2xl
                "
                style={{
                  background:
                    `${platformMeta.color}18`,
                  color:
                    platformMeta.color,
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
                    className="
                      text-base
                      font-semibold
                      tracking-tight
                      sm:text-lg
                    "
                    style={{
                      color: t.text,
                    }}
                  >
                    {platformMeta.label}
                  </h2>

                  {post.postType && (
                    <span
                      className="
                        rounded-full
                        px-2 py-1
                        text-[8px]
                        font-bold
                        uppercase
                      "
                      style={{
                        background: t.pillBg,
                        color: t.pillText,
                        letterSpacing:
                          "0.08em",
                      }}
                    >
                      {post.postType}
                    </span>
                  )}

                  {post.category && (
                    <span
                      className="
                        max-w-[130px]
                        truncate
                        rounded-full
                        px-2 py-1
                        text-[8px]
                        font-semibold
                      "
                      style={{
                        background:
                          `${platformMeta.color}12`,
                        color:
                          platformMeta.color,
                      }}
                    >
                      {post.category}
                    </span>
                  )}
                </div>

                <p
                  className="mt-1 text-[10px] sm:text-xs"
                  style={{
                    color: t.textMuted,
                  }}
                >
                  {new Date(
                    post.postDate
                  ).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                  {" · "}
                  {new Date(
                    post.postDate
                  ).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="
                flex h-9 w-9
                flex-shrink-0
                items-center justify-center
                rounded-full
                text-lg
                transition-all
                active:scale-95
              "
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className="
              flex flex-col gap-7
              px-4 py-5
              sm:px-7 sm:py-6
            "
          >
            {/* STATUS */}
            {post.assets.length > 0 && (
              <section>
                <div
                  className="
                    flex flex-col gap-3
                    rounded-2xl
                    border
                    p-4
                    sm:flex-row
                    sm:items-center
                  "
                  style={{
                    background:
                      approvalMeta.bg,
                    borderColor:
                      `${approvalMeta.color}26`,
                  }}
                >
                  <span
                    className="
                      flex h-9 w-9
                      flex-shrink-0
                      items-center justify-center
                      rounded-full
                    "
                    style={{
                      background:
                        `${approvalMeta.color}18`,
                      color:
                        approvalMeta.color,
                    }}
                  >
                    {post.approvalStatus ===
                    "APPROVED" ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <span className="text-sm">
                        !
                      </span>
                    )}
                  </span>

                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{
                        color:
                          approvalMeta.color,
                      }}
                    >
                      {approvalMeta.text}
                    </p>

                    <p
                      className="mt-0.5 text-[10px]"
                      style={{
                        color: t.textMuted,
                      }}
                    >
                      {post.approvalStatus ===
                      "APPROVED"
                        ? "This content has been approved."
                        : post.approvalStatus ===
                          "NEEDS_REVISION"
                        ? "Changes have been requested before approval."
                        : "Waiting for client review."}
                    </p>
                  </div>
                </div>

                                {post.approvalStatus ===
                  "NEEDS_REVISION" &&
                  post.approvalNote && (
                    <div
                      className="
                        mt-3
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background:
                          "rgba(249,115,22,0.06)",
                        borderColor:
                          "rgba(249,115,22,0.14)",
                      }}
                    >
                      <p
                        className="
                          mb-2
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color: "#F97316",
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Client feedback
                      </p>

                      <p
                        className="
                          text-sm
                          leading-relaxed
                        "
                        style={{
                          color: t.textMuted,
                        }}
                      >
                        &ldquo;{post.approvalNote}&rdquo;
                      </p>
                    </div>
                  )}
              </section>
            )}

            {/* INSTAGRAM PUBLISH STATUS — only ever shown once this
                post has actually been scheduled, published, or
                failed; a post that's never been through that at all
                shows nothing here. */}
            {post.platform === "INSTAGRAM" &&
              post.instagramPublishStatus !== "NOT_SCHEDULED" && (
                <section>
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        post.instagramPublishStatus === "PUBLISHED"
                          ? "rgba(225,48,108,0.06)"
                          : post.instagramPublishStatus === "FAILED"
                          ? "rgba(239,68,68,0.06)"
                          : "rgba(36,120,255,0.06)",
                      borderColor:
                        post.instagramPublishStatus === "PUBLISHED"
                          ? "rgba(225,48,108,0.16)"
                          : post.instagramPublishStatus === "FAILED"
                          ? "rgba(239,68,68,0.16)"
                          : "rgba(36,120,255,0.16)",
                    }}
                  >
                    <p
                      className="mb-1.5 text-[10px] font-bold uppercase"
                      style={{
                        letterSpacing: "0.08em",
                        color:
                          post.instagramPublishStatus === "PUBLISHED"
                            ? "#E1306C"
                            : post.instagramPublishStatus === "FAILED"
                            ? "#EF4444"
                            : "#2478FF",
                      }}
                    >
                      Instagram
                    </p>

                    {post.instagramPublishStatus === "SCHEDULED" && (
                      <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
                        This will publish to Instagram automatically once its scheduled time arrives — no manual posting needed.
                      </p>
                    )}

                    {post.instagramPublishStatus === "PUBLISHED" && (
                      <>
                        <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
                          This post is live on Instagram.
                        </p>
                        {post.instagramPermalink && (
                          
                          <a href={post.instagramPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold"
                            style={{ color: "#E1306C" }}
                          >
                            View on Instagram
                            <span aria-hidden>↗</span>
                          </a>
                        )}
                      </>
                    )}

                                       {post.instagramPublishStatus === "FAILED" && (
                      <p className="text-sm leading-relaxed text-red-400">
                        {post.instagramPublishError ?? "Something went wrong publishing this post to Instagram."}
                      </p>
                    )}
                  </div>
                </section>
              )}

            {/* TIKTOK PUBLISH STATUS — same pattern as Instagram's,
                but TikTok's API has no public permalink to link to
                the way Instagram's does, so nothing to link even
                once published. */}
            {post.platform === "TIKTOK" &&
              post.tikTokPublishStatus !== "NOT_SCHEDULED" && (
                <section>
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        post.tikTokPublishStatus === "PUBLISHED"
                          ? "rgba(0,242,234,0.06)"
                          : post.tikTokPublishStatus === "FAILED"
                          ? "rgba(239,68,68,0.06)"
                          : "rgba(36,120,255,0.06)",
                      borderColor:
                        post.tikTokPublishStatus === "PUBLISHED"
                          ? "rgba(0,242,234,0.18)"
                          : post.tikTokPublishStatus === "FAILED"
                          ? "rgba(239,68,68,0.16)"
                          : "rgba(36,120,255,0.16)",
                    }}
                  >
                    <p
                      className="mb-1.5 text-[10px] font-bold uppercase"
                      style={{
                        letterSpacing: "0.08em",
                        color:
                          post.tikTokPublishStatus === "PUBLISHED"
                            ? "#00C2B8"
                            : post.tikTokPublishStatus === "FAILED"
                            ? "#EF4444"
                            : "#2478FF",
                      }}
                    >
                      TikTok
                    </p>

                    {post.tikTokPublishStatus === "SCHEDULED" && (
                      <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
                        This will publish to TikTok automatically once its scheduled time arrives — until this app clears TikTok&apos;s content audit, it will publish as private (visible only to the connected account).
                      </p>
                    )}

                    {post.tikTokPublishStatus === "PUBLISHED" && (
                      <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
                        Published to TikTok. TikTok doesn&apos;t provide a direct link back to the post, and it&apos;s currently private-only pending this app&apos;s content audit — check the TikTok app directly to view it.
                      </p>
                    )}

                    {post.tikTokPublishStatus === "FAILED" && (
                      <p className="text-sm leading-relaxed text-red-400">
                        {post.tikTokPublishError ?? "Something went wrong publishing this post to TikTok."}
                      </p>
                    )}
                  </div>
                </section>
              )}

            {/* MEDIA */}
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: t.text,
                    }}
                  >
                    Content
                  </h3>

                  <p
                    className="mt-1 text-[11px]"
                    style={{
                      color: t.textFaint,
                    }}
                  >
                    Review the media attached to this post.
                  </p>
                </div>

                {post.assets.length > 0 && (
                  <span
                    className="
                      flex-shrink-0
                      rounded-full
                      px-2.5 py-1
                      text-[10px]
                      font-semibold
                    "
                    style={{
                      background: t.pillBg,
                      color: t.textMuted,
                    }}
                  >
                    {post.assets.length}{" "}
                    {post.assets.length === 1
                      ? "file"
                      : "files"}
                  </span>
                )}
              </div>

              {activeAsset ? (
                <div>
                  <div
                    className="
                      group
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                    "
                    style={{
                      background: "#090909",
                      borderColor:
                        t.cardBorder,
                    }}
                  >
                    {activeAsset.mediaType ===
                    "VIDEO" ? (
                      <video
                        ref={videoRef}
                        src={
                          activeAsset.contentUrl
                        }
                        controls
                        playsInline
                        className="
                          max-h-[42vh]
                          w-full
                          object-contain
                          sm:max-h-[520px]
                        "
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          activeAsset.contentUrl
                        }
                        alt=""
                        className="
                          max-h-[42vh]
                          w-full
                          object-contain
                          sm:max-h-[520px]
                        "
                      />
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        removeAsset(
                          activeAsset.id
                        )
                      }
                      className="
                        absolute right-2.5 top-2.5
                        flex h-9 w-9
                        items-center justify-center
                        rounded-full
                        border border-white/10
                        bg-black/65
                        text-sm
                        text-white
                        backdrop-blur-md
                        transition-all
                        active:scale-95
                        hover:bg-red-500
                      "
                      aria-label="Remove this file"
                    >
                      ×
                    </button>

                    {post.assets.length > 1 && (
                      <div
                        className="
                          absolute bottom-2.5 right-2.5
                          rounded-full
                          bg-black/65
                          px-2.5 py-1
                          text-[10px]
                          font-semibold
                          text-white/80
                          backdrop-blur-md
                        "
                      >
                        {activeAssetIdx + 1} /{" "}
                        {post.assets.length}
                      </div>
                    )}
                  </div>

                  {post.assets.length > 1 && (
                    <div
                      className="
                        mt-3
                        flex gap-2
                        overflow-x-auto
                        pb-1
                        scrollbar-thin
                      "
                    >
                      {post.assets.map(
                        (asset, i) => {
                          const selected =
                            i ===
                            activeAssetIdx;

                          return (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() =>
                                setActiveAssetIdx(
                                  i
                                )
                              }
                              className="
                                relative
                                h-16 w-16
                                flex-shrink-0
                                overflow-hidden
                                rounded-xl
                                transition-all
                                active:scale-95
                                sm:h-[68px]
                                sm:w-[68px]
                              "
                              style={{
                                border: selected
                                  ? "2px solid #2478FF"
                                  : `2px solid ${t.inputBorder}`,
                                opacity:
                                  selected
                                    ? 1
                                    : 0.7,
                              }}
                            >
                              {asset.mediaType ===
                              "VIDEO" ? (
                                <>
                                  <video
                                    src={
                                      asset.contentUrl
                                    }
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="
                                      h-full
                                      w-full
                                      object-cover
                                    "
                                  />

                                  <span className="
                                    absolute inset-0
                                    flex items-center
                                    justify-center
                                    bg-black/20
                                  ">
                                    <span className="
                                      flex h-6 w-6
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-black/60
                                      text-[9px]
                                      text-white
                                    ">
                                      ▶
                                    </span>
                                  </span>
                                </>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={
                                    asset.contentUrl
                                  }
                                  alt=""
                                  className="
                                    h-full
                                    w-full
                                    object-cover
                                  "
                                />
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {activeAsset.mediaType ===
                    "VIDEO" && (
                    <div className="mt-4">
                      <CalendarVideoComments
                        comments={
                          post.videoComments
                        }
                        readOnly
                        onSeekTo={(seconds) => {
                          const vid =
                            videoRef.current;

                          if (!vid) return;

                          vid.currentTime =
                            seconds;

                          vid
                            .play()
                            .catch(() => {});
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    px-5 py-10
                    text-center
                  "
                  style={{
                    background: t.inputBg,
                    borderColor:
                      t.inputBorder,
                  }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{
                      color: t.textMuted,
                    }}
                  >
                    No content uploaded yet
                  </p>

                  <p
                    className="mt-1 text-[10px]"
                    style={{
                      color: t.textFaint,
                    }}
                  >
                    Add an image or video to prepare this post.
                  </p>
                </div>
              )}

              {/* UPLOAD */}
              <label
                className="
                  group
                  mt-3
                  flex
                  min-h-[60px]
                  cursor-pointer
                  items-center
                  justify-center
                  gap-3
                  rounded-2xl
                  border
                  border-dashed
                  px-4 py-3
                  text-center
                  transition-all
                  hover:border-blue-500/40
                  active:scale-[0.99]
                "
                style={{
                  borderColor: t.inputBorder,
                  background: t.inputBg,
                }}
              >
                <span
                  className="
                    flex h-9 w-9
                    flex-shrink-0
                    items-center justify-center
                    rounded-xl
                  "
                  style={{
                    background:
                      "rgba(36,120,255,0.1)",
                    color: "#2478FF",
                  }}
                >
                  {uploading ? (
                    <span className="
                      h-3.5 w-3.5
                      animate-spin
                      rounded-full
                      border-2
                      border-blue-500/30
                      border-t-blue-500
                    " />
                  ) : (
                    "+"
                  )}
                </span>

                <span className="min-w-0 text-left">
                  <span
                    className="block text-xs font-semibold"
                    style={{
                      color: uploading
                        ? t.textFaint
                        : "#2478FF",
                    }}
                  >
                    {uploading
                      ? "Uploading files..."
                      : post.assets.length > 0
                      ? post.postType ===
                        "Carousel"
                        ? "Add more files"
                        : "Replace content"
                      : "Upload content"}
                  </span>

                  {!uploading && (
                    <span
                      className="
                        mt-0.5
                        block
                        text-[9px]
                      "
                      style={{
                        color: t.textFaint,
                      }}
                    >
                      {post.postType ===
                      "Carousel"
                        ? "Add more images or videos to this carousel"
                        : "JPG, PNG, WebP, MP4, MOV or WebM"}
                    </span>
                  )}
                </span>

                <input
                  type="file"
                  multiple={
                    post.postType ===
                    "Carousel"
                  }
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (
                      e.target.files &&
                      e.target.files.length >
                        0
                    ) {
                      uploadMany(
                        e.target.files
                      );

                      e.currentTarget.value =
                        "";
                    }
                  }}
                />
              </label>

              {error && (
                <div
                  className="
                    mt-3
                    flex items-start gap-2.5
                    rounded-xl
                    border
                    px-3.5 py-3
                  "
                  style={{
                    background:
                      "rgba(239,68,68,0.07)",
                    borderColor:
                      "rgba(239,68,68,0.14)",
                  }}
                >
                  <span className="text-xs text-red-400">
                    !
                  </span>

                  <p className="
                    text-xs
                    leading-relaxed
                    text-red-300
                  ">
                    {error}
                  </p>
                </div>
              )}
            </section>

            {/* POST DETAILS */}
            {(post.caption ||
              post.contentIdea ||
              post.cta ||
              post.hashtags) && (
              <section>
                <div className="mb-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: t.text,
                    }}
                  >
                    Post details
                  </h3>

                  <p
                    className="mt-1 text-[11px]"
                    style={{
                      color: t.textFaint,
                    }}
                  >
                    Everything planned for this piece of content.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {post.caption && (
                    <div
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <p
                        className="
                          mb-2
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color:
                            t.textFaint,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Caption
                      </p>

                      <p
                        className="
                          whitespace-pre-wrap
                          break-words
                          text-sm
                          leading-relaxed
                        "
                        style={{
                          color:
                            t.textMuted,
                        }}
                      >
                        {post.caption}
                      </p>
                    </div>
                  )}

                  {post.contentIdea && (
                    <div
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <p
                        className="
                          mb-2
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color:
                            t.textFaint,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Creative direction
                      </p>

                      <p
                        className="
                          whitespace-pre-wrap
                          break-words
                          text-sm
                          leading-relaxed
                        "
                        style={{
                          color:
                            t.textMuted,
                        }}
                      >
                        {post.contentIdea}
                      </p>
                    </div>
                  )}

                  {post.cta && (
                    <div
                      className="
                        flex items-center
                        justify-between
                        gap-4
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                          "
                          style={{
                            color:
                              t.textFaint,
                            letterSpacing:
                              "0.08em",
                          }}
                        >
                          Call to action
                        </p>

                        <p
                          className="
                            mt-1.5
                            break-words
                            text-sm
                            font-medium
                          "
                          style={{
                            color:
                              t.textMuted,
                          }}
                        >
                          {post.cta}
                        </p>
                      </div>

                      <span
                        className="
                          flex h-8 w-8
                          flex-shrink-0
                          items-center
                          justify-center
                          rounded-xl
                        "
                        style={{
                          background:
                            "rgba(36,120,255,0.1)",
                          color: "#2478FF",
                        }}
                      >
                        →
                      </span>
                    </div>
                  )}

                  {post.hashtags && (
                    <div
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <p
                        className="
                          mb-2
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color:
                            t.textFaint,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Hashtags
                      </p>

                      <p
                        className="
                          break-words
                          text-sm
                          leading-relaxed
                        "
                        style={{
                          color: "#2478FF",
                        }}
                      >
                        {post.hashtags}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* DISCOVERY */}
            {(post.taggedAccounts ||
              post.linkUrl) && (
              <section>
                <div className="mb-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: t.text,
                    }}
                  >
                    Discovery & reach
                  </h3>

                  <p
                    className="mt-1 text-[11px]"
                    style={{
                      color: t.textFaint,
                    }}
                  >
                    Accounts and destinations connected to this post.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {post.taggedAccounts && (
                    <div
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <p
                        className="
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color:
                            t.textFaint,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Tagged accounts
                      </p>

                      <p
                        className="
                          mt-2
                          break-words
                          text-xs
                        "
                        style={{
                          color:
                            t.textMuted,
                        }}
                      >
                        {post.taggedAccounts}
                      </p>
                    </div>
                  )}

                  {post.linkUrl && (
                    <div
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                      style={{
                        background: t.inputBg,
                        borderColor:
                          t.inputBorder,
                      }}
                    >
                      <p
                        className="
                          text-[10px]
                          font-bold
                          uppercase
                        "
                        style={{
                          color:
                            t.textFaint,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        Destination link
                      </p>

                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          mt-2
                          flex items-center gap-1.5
                          text-xs
                          font-medium
                        "
                        style={{
                          color: "#2478FF",
                        }}
                      >
                        <span className="
                          min-w-0
                          truncate
                        ">
                          {post.linkUrl}
                        </span>

                        <span className="flex-shrink-0">
                          ↗
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* CUSTOM FIELDS */}
            {post.customFields.length >
              0 && (
              <section>
                <div className="mb-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: t.text,
                    }}
                  >
                    Additional details
                  </h3>

                  <p
                    className="mt-1 text-[11px]"
                    style={{
                      color: t.textFaint,
                    }}
                  >
                    Extra information attached to this post.
                  </p>
                </div>

                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                  "
                  style={{
                    borderColor:
                      t.inputBorder,
                    background:
                      t.inputBg,
                  }}
                >
                  {post.customFields.map(
                    (field, index) => (
                      <div
                        key={field.id}
                        className="
                          flex
                          flex-col
                          gap-1.5
                          px-4 py-3
                          sm:grid
                          sm:grid-cols-[120px_1fr]
                          sm:gap-4
                        "
                        style={{
                          borderTop:
                            index > 0
                              ? `1px solid ${t.inputBorder}`
                              : undefined,
                        }}
                      >
                        <span
                          className="
                            text-[10px]
                            font-semibold
                            uppercase
                            sm:text-xs
                            sm:normal-case
                          "
                          style={{
                            color:
                              t.textFaint,
                          }}
                        >
                          {field.label}
                        </span>

                        <span
                          className="
                            break-words
                            text-xs
                          "
                          style={{
                            color:
                              t.textMuted,
                          }}
                        >
                          {field.value}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            flex
            flex-shrink-0
            flex-col
            gap-3
            border-t
            px-4 py-3
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-7 sm:py-4
          "
          style={{
            borderColor: t.cardBorder,
            background:
              theme === "dark"
                ? "rgba(20,20,20,0.96)"
                : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div className="hidden sm:block">
            <p
              className="text-[10px] font-medium"
              style={{
                color: t.textMuted,
              }}
            >
              {platformMeta.label}
              {post.postType
                ? ` · ${post.postType}`
                : ""}
            </p>

            <p
              className="mt-0.5 text-[9px]"
              style={{
                color: t.textFaint,
              }}
            >
              {post.assets.length > 0
                ? `${post.assets.length} ${
                    post.assets.length === 1
                      ? "file"
                      : "files"
                  } attached`
                : "No content attached yet"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              min-h-11
              w-full
              rounded-xl
              px-5 py-2.5
              text-xs
              font-semibold
              transition-all
              active:scale-[0.98]
              sm:w-auto
            "
            style={{
              background: t.pillBg,
              color: t.textMuted,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CALENDAR GRID
   ========================================================= */

export default function CalendarGrid({
  calendarId,
  planStatus,
  initialPosts,
  userRole,
  clientName,
}: {
  calendarId: string;
  planStatus: string;
  initialPosts: CalendarPostData[];
  userRole: "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";
  clientName: string;
}) {
  const [theme, setTheme] =
    useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(
      THEME_STORAGE_KEY
    );

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next =
        prev === "dark"
          ? "light"
          : "dark";

      localStorage.setItem(
        THEME_STORAGE_KEY,
        next
      );

      return next;
    });
  };

  const t = THEMES[theme];

  // Which of the three tabs is showing — the existing calendar grid
  // stays completely untouched when this is "calendar"; the other
  // two swap in an entirely different, phone-mockup view instead.
  const [viewMode, setViewMode] = useState<
    "calendar" | "instagram" | "tiktok"
  >("calendar");

  const [currentMonth, setCurrentMonth] =
    useState(() => {
      const now = new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    });

  const normalize = (
    p: CalendarPostData
  ): CalendarPostData => ({
    ...p,
    assets: p.assets ?? [],
    videoComments:
      p.videoComments ?? [],
    customFields:
      p.customFields ?? [],
  });

  const [posts, setPosts] =
    useState<CalendarPostData[]>(
      initialPosts.map(normalize)
    );

  const [addingDate, setAddingDate] =
    useState<Date | null>(null);

  const [selectedPost, setSelectedPost] =
    useState<CalendarPostData | null>(
      null
    );

  // =========================================================
  // SMART FILTERS
  // =========================================================
  // Filters live inside CalendarGrid so they stay in sync with the
  // calendar, Instagram preview and TikTok preview without creating
  // a second control layer in the parent page.
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [contentFilter, setContentFilter] = useState<"ALL" | "ATTACHED" | "EMPTY">("ALL");

  const availableTypes = Array.from(
    new Set(
      posts
        .map((post) => post.postType)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const availableCategories = Array.from(
    new Set(
      posts
        .map((post) => post.category)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.trim().toLowerCase();

    const searchable = [
      post.caption,
      post.contentIdea,
      post.category,
      post.postType,
      post.cta,
      post.hashtags,
      post.taggedAccounts,
      ...post.customFields.map((field) => `${field.label} ${field.value}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (platformFilter !== "ALL" && post.platform !== platformFilter) return false;
    if (statusFilter !== "ALL" && post.approvalStatus !== statusFilter) return false;
    if (typeFilter !== "ALL" && post.postType !== typeFilter) return false;
    if (categoryFilter !== "ALL" && post.category !== categoryFilter) return false;
    if (contentFilter === "ATTACHED" && post.assets.length === 0) return false;
    if (contentFilter === "EMPTY" && post.assets.length > 0) return false;

    return true;
  });

  const activeFilterCount = [
    platformFilter !== "ALL",
    statusFilter !== "ALL",
    typeFilter !== "ALL",
    categoryFilter !== "ALL",
    contentFilter !== "ALL",
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const filtersActive = activeFilterCount > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setPlatformFilter("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setCategoryFilter("ALL");
    setContentFilter("ALL");
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
  };

  const monthInputValue =
    `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}`;

  // Same delete route the full detail panel already uses — this just
  // gives a second, faster way to trigger it, right from the tile
  // itself.
  const handleDeletePost = async (
    postId: string
  ) => {
    const res = await fetch(
      `/api/calendars/${calendarId}/posts/${postId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setPosts((prev) =>
        prev.filter((p) => p.id !== postId)
      );
    }
  };

  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth();

  const firstWeekday = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const cells: (
    | Date
    | null
  )[] = [];

  for (
    let i = 0;
    i < firstWeekday;
    i++
  ) {
    cells.push(null);
  }

  for (
    let d = 1;
    d <= daysInMonth;
    d++
  ) {
    cells.push(
      new Date(year, month, d)
    );
  }

  while (
    cells.length % 7 !== 0
  ) {
    cells.push(null);
  }

  const postsForDate = (
    date: Date
  ) =>
    filteredPosts
      .filter((p) => {
        const pd = new Date(
          p.postDate
        );

        return (
          pd.getFullYear() ===
            date.getFullYear() &&
          pd.getMonth() ===
            date.getMonth() &&
          pd.getDate() ===
            date.getDate()
        );
      })
      .sort(
        (a, b) =>
          new Date(
            a.postDate
          ).getTime() -
          new Date(
            b.postDate
          ).getTime()
      );

  const goToMonth = (
    delta: number
  ) => {
    setCurrentMonth(
      new Date(
        year,
        month + delta,
        1
      )
    );
  };

  const today = new Date();

  const isToday = (
    date: Date
  ) =>
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate();

  const visibleDays =
    cells.filter(
      (date): date is Date =>
        date !== null
    );

  return (
    <div
      className="
        min-h-full
        w-full
        rounded-none
        p-3
        transition-colors
        duration-300
        sm:rounded-2xl
        sm:p-4
        lg:p-5
      "
      style={{
        background: t.pageBg,
        color: t.text,
      }}
    >
      {/* =====================================================
          CALENDAR HEADER
          ===================================================== */}

      <div className="
        mb-5
        flex
        items-center
        justify-between
        gap-3
        sm:mb-6
      ">
        <div className="min-w-0">
          <p
            className="
              mb-0.5
              text-[8px]
              font-bold
              uppercase
              tracking-[0.14em]
              sm:text-[9px]
            "
            style={{
              color: t.textFaint,
            }}
          >
            Content calendar
          </p>

          <h2
            className="
              truncate
              text-lg
              font-bold
              tracking-tight
              sm:text-xl
              lg:text-2xl
          "
            style={{
              color: t.text,
            }}
          >
            {viewMode === "calendar"
              ? currentMonth.toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )
              : viewMode === "instagram"
              ? "Instagram Preview"
              : "TikTok Preview"}
          </h2>
        </div>

        <div className="
          flex
          flex-shrink-0
          items-center
          gap-1.5
          sm:gap-2
        ">
          <ThemeToggle
            theme={theme}
            onToggle={toggleTheme}
          />

          {viewMode === "calendar" && (
            <>
              <button
                type="button"
                onClick={() =>
                  goToMonth(-1)
                }
                aria-label="Previous month"
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  active:scale-95
                  sm:h-10 sm:w-10
                "
                style={{
                  background: t.pillBg,
                  color: t.textMuted,
                }}
              >
                ←
              </button>

              <button
                type="button"
                onClick={() =>
                  goToMonth(1)
                }
                aria-label="Next month"
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  active:scale-95
                  sm:h-10 sm:w-10
                "
                style={{
                  background: t.pillBg,
                  color: t.textMuted,
                }}
              >
                →
              </button>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          SMART FILTER / SEARCH BAR
          ===================================================== */}
      <div
        className="
          mb-4 overflow-hidden rounded-2xl border
          sm:mb-5
        "
        style={{
          background:
            theme === "dark"
              ? "rgba(255,255,255,0.028)"
              : "rgba(0,0,0,0.018)",
          borderColor: t.cardBorder,
          boxShadow:
            theme === "dark"
              ? "0 12px 40px rgba(0,0,0,0.12)"
              : "0 12px 40px rgba(0,0,0,0.045)",
        }}
      >
        <div className="
          flex flex-col gap-2 p-2
          sm:flex-row sm:items-center
        ">
          <div
            className="
              flex min-w-0 flex-1 items-center gap-2.5
              rounded-xl border px-3.5 py-2.5
            "
            style={{
              background: t.inputBg,
              borderColor: t.inputBorder,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" strokeLinecap="round" />
            </svg>

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions, ideas, categories, hashtags..."
              aria-label="Search content"
              className="
                min-w-0 flex-1 bg-transparent text-xs
                outline-none placeholder:opacity-40
              "
              style={{ color: t.text }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="
                  flex h-6 w-6 items-center justify-center
                  rounded-full text-sm
                "
                style={{
                  background: t.pillBg,
                  color: t.textMuted,
                }}
              >
                ×
              </button>
            )}
          </div>

          {viewMode === "calendar" && (
            <>
              <label
                className="
                  flex h-11 w-full flex-shrink-0 items-center gap-2.5 rounded-xl border
                  px-3.5 sm:w-[220px] lg:w-[240px]
                "
                style={{
                  background: t.inputBg,
                  borderColor: t.inputBorder,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="17" rx="3" />
                  <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                </svg>
                <input
                  type="month"
                  value={monthInputValue}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m] = e.target.value.split("-").map(Number);
                    setCurrentMonth(new Date(y, m - 1, 1));
                  }}
                  aria-label="Choose month"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                  style={{ color: t.text }}
                />
              </label>

              <button
                type="button"
                onClick={jumpToToday}
                className="
                  h-10 rounded-xl border px-3 text-[11px]
                  font-semibold transition-all active:scale-[0.98]
                "
                style={{
                  background: t.pillBg,
                  borderColor: t.inputBorder,
                  color: t.textMuted,
                }}
              >
                Today
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
            className="
              flex h-10 items-center justify-center gap-2
              rounded-xl border px-3.5 text-xs font-semibold
              transition-all active:scale-[0.98]
            "
            style={{
              background: filterOpen || filtersActive
                ? "rgba(36,120,255,0.10)"
                : t.pillBg,
              borderColor: filterOpen || filtersActive
                ? "rgba(36,120,255,0.35)"
                : t.inputBorder,
              color: filterOpen || filtersActive
                ? "#2478FF"
                : t.textMuted,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span
                className="
                  flex h-5 min-w-5 items-center justify-center
                  rounded-full px-1.5 text-[9px] font-bold text-white
                "
                style={{ background: "#2478FF" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filterOpen && (
          <div
            className="border-t px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
            style={{ borderColor: t.cardBorder }}
          >
            <div className="
              grid grid-cols-1 gap-2
              sm:grid-cols-2 lg:grid-cols-4
            ">
              {[
                {
                  label: "Platform",
                  value: platformFilter,
                  onChange: (value: string) =>
                    setPlatformFilter(value as Platform | "ALL"),
                  options: [
                    { value: "ALL", label: "All platforms" },
                    ...PLATFORMS.map((platform) => ({
                      value: platform.value,
                      label: platform.label,
                    })),
                  ],
                },
                {
                  label: "Approval",
                  value: statusFilter,
                  onChange: (value: string) =>
                    setStatusFilter(value as ApprovalStatus | "ALL"),
                  options: [
                    { value: "ALL", label: "All statuses" },
                    { value: "PENDING", label: "Awaiting review" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "NEEDS_REVISION", label: "Needs revision" },
                  ],
                },
                {
                  label: "Format",
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: [
                    { value: "ALL", label: "All formats" },
                    ...availableTypes.map((type) => ({
                      value: type,
                      label: type,
                    })),
                  ],
                },
                {
                  label: "Category",
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                  options: [
                    { value: "ALL", label: "All categories" },
                    ...availableCategories.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ],
                },
              ].map((filter) => (
                <label key={filter.label} className="block">
                  <span
                    className="
                      mb-1.5 block text-[9px] font-bold uppercase
                      tracking-[0.12em]
                    "
                    style={{ color: t.textFaint }}
                  >
                    {filter.label}
                  </span>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="
                      h-10 w-full rounded-xl border px-3 text-xs
                      font-semibold outline-none
                    "
                    style={{
                      background: t.inputBg,
                      borderColor: t.inputBorder,
                      color: t.text,
                    }}
                  >
                    {filter.options.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        style={{
                          background: theme === "dark" ? "#1A1A1A" : "#FFFFFF",
                          color: theme === "dark" ? "#FFFFFF" : "#0A0A0A",
                        }}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="
              mt-3 flex flex-col gap-2
              sm:flex-row sm:items-center sm:justify-between
            ">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: t.textMuted }}
                >
                  Content
                </span>

                {(
                  [
                    { value: "ALL", label: "Everything" },
                    { value: "ATTACHED", label: "Has files" },
                    { value: "EMPTY", label: "Needs content" },
                  ] as const
                ).map((option) => {
                  const active = contentFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContentFilter(option.value)}
                      className="
                        rounded-full border px-2.5 py-1.5
                        text-[10px] font-semibold transition-all
                      "
                      style={{
                        background: active
                          ? "rgba(36,120,255,0.10)"
                          : t.pillBg,
                        borderColor: active
                          ? "rgba(36,120,255,0.35)"
                          : t.inputBorder,
                        color: active ? "#2478FF" : t.textMuted,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    self-start rounded-full px-3 py-1.5
                    text-[10px] font-semibold sm:self-auto
                  "
                  style={{
                    background: t.pillBg,
                    color: t.textMuted,
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {filtersActive && (
        <div className="
          mb-4 flex flex-wrap items-center gap-2
          sm:mb-5
        ">
          <span
            className="text-[10px] font-semibold"
            style={{ color: t.textFaint }}
          >
            Showing {filteredPosts.length} of {posts.length}
          </span>

          {platformFilter !== "ALL" && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
              style={{
                background: "rgba(36,120,255,0.10)",
                color: "#2478FF",
              }}
            >
              {PLATFORMS.find((p) => p.value === platformFilter)?.label}
            </span>
          )}

          {statusFilter !== "ALL" && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
              style={{
                background: `${APPROVAL_META[statusFilter].color}18`,
                color: APPROVAL_META[statusFilter].color,
              }}
            >
              {APPROVAL_META[statusFilter].text}
            </span>
          )}

          {typeFilter !== "ALL" && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              {typeFilter}
            </span>
          )}

          {categoryFilter !== "ALL" && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              {categoryFilter}
            </span>
          )}

          {contentFilter !== "ALL" && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
              style={{
                background: t.pillBg,
                color: t.textMuted,
              }}
            >
              {contentFilter === "ATTACHED" ? "Has files" : "Needs content"}
            </span>
          )}
        </div>
      )}

      {/* =====================================================
          VIEW MODE TABS — Calendar | Instagram | TikTok
          ===================================================== */}

      <div
        className="
          mb-5
          flex
          gap-1.5
          rounded-2xl
          p-1.5
          sm:mb-6
        "
        style={{
          background:
            theme === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.035)",
        }}
      >
        {(
          [
            { key: "calendar", label: "Calendar" },
            { key: "instagram", label: "Instagram" },
            { key: "tiktok", label: "TikTok" },
          ] as const
        ).map((tab) => {
          const active = viewMode === tab.key;
          const accentColor =
            tab.key === "instagram"
              ? "#D62976"
              : tab.key === "tiktok"
              ? "#FE2C55"
              : "#2478FF";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setViewMode(tab.key)
              }
              className="
                flex-1
                rounded-xl
                px-3 py-2
                text-xs
                font-semibold
                transition-all
                active:scale-[0.98]
              "
              style={{
                background: active
                  ? t.modalBg
                  : "transparent",
                color: active
                  ? accentColor
                  : t.textMuted,
                boxShadow: active
                  ? theme === "dark"
                    ? "0 4px 14px rgba(0,0,0,0.35)"
                    : "0 4px 14px rgba(0,0,0,0.08)"
                  : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewMode === "instagram" && (
        <InstagramPreview
          posts={filteredPosts}
          clientName={clientName}
        />
      )}

      {viewMode === "tiktok" && (
        <TikTokPreview
          posts={filteredPosts}
          clientName={clientName}
        />
      )}

      {viewMode === "calendar" && (
        <>
      {/* =====================================================
          DESKTOP / TABLET CALENDAR
          ===================================================== */}

      <div className="
        hidden
        sm:grid
        sm:grid-cols-7
        sm:gap-1.5
        lg:gap-2
      ">
        {[
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
        ].map((day, dayIdx) => (
          <div
            key={day}
            className="
              pb-1.5
              text-center
              text-[9px]
              font-bold
              uppercase
              tracking-[0.1em]
              md:text-[10px]
              lg:pb-2
              lg:text-xs
            "
            style={{
              color:
                DAY_COLORS[dayIdx],
            }}
          >
            {day}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) {
            return (
              <div
                key={i}
                className="
                  min-h-[125px]
                  rounded-xl
                  md:min-h-[145px]
                  lg:min-h-[170px]
                "
                aria-hidden="true"
              />
            );
          }

          const dayPosts =
            postsForDate(date);

          const dayColor =
            DAY_COLORS[
              date.getDay()
            ];

          const todayDate =
            isToday(date);

          return (
            <div
              key={i}
              className="
                flex
                min-h-[125px]
                flex-col
                gap-1
                overflow-hidden
                rounded-xl
                p-1.5
                pt-1
                transition-all
                md:min-h-[145px]
                md:p-2
                lg:min-h-[170px]
              "
              style={{
                background:
                  theme === "dark"
                    ? `${dayColor}14`
                    : `${dayColor}0d`,
                border: todayDate
                  ? `1.5px solid ${dayColor}`
                  : `1px solid ${dayColor}30`,
              }}
            >
              {/* DAY HEADER */}
              <div className="
                flex
                items-center
                justify-between
                gap-1
              ">
                <span
                  className="
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    px-1
                    text-[9px]
                    font-bold
                    md:h-6
                    md:min-w-6
                    md:text-[10px]
                    lg:text-xs
                  "
                  style={{
                    color: todayDate
                      ? "#FFFFFF"
                      : dayColor,
                    background:
                      todayDate
                        ? dayColor
                        : "transparent",
                  }}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* POSTS */}
              <div className="
                flex
                min-h-0
                flex-1
                flex-col
                gap-1.5
                overflow-y-auto
                pt-0.5
                md:gap-2
                md:pt-1
              ">
                {dayPosts.map(
                  (
                    post,
                    postIndex
                  ) => (
                    <PostTile
                      key={post.id}
                      post={post}
                      index={
                        postIndex
                      }
                      onClick={() =>
                        setSelectedPost(
                          post
                        )
                      }
                      canDelete={
                        userRole ===
                        "EDIT_CALENDAR"
                      }
                      onDelete={() =>
                        handleDeletePost(
                          post.id
                        )
                      }
                    />
                  )
                )}

                {userRole ===
                  "EDIT_CALENDAR" && (
                  <button
                    type="button"
                    onClick={() =>
                      setAddingDate(
                        date
                      )
                    }
                    className="
                      flex
                      w-full
                      min-h-8
                      flex-shrink-0
                      items-center
                      justify-center
                      gap-1
                      rounded-lg
                      border
                      border-dashed
                      px-1.5
                      py-1.5
                      text-[8px]
                      font-semibold
                      transition-all
                      hover:opacity-80
                      active:scale-[0.98]
                      md:min-h-9
                      md:px-2
                      md:py-2
                      md:text-[9px]
                      lg:text-[10px]
                    "
                    style={{
                      borderColor:
                        `${dayColor}55`,
                      color:
                        dayColor,
                    }}
                  >
                    <span className="
                      text-xs
                      leading-none
                      md:text-sm
                    ">
                      +
                    </span>

                    <span>
                      Add post
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================
          MOBILE AGENDA
          ===================================================== */}

      <div className="
        flex
        flex-col
        gap-3
        sm:hidden
      ">
        {visibleDays.map((date) => {
          const dayPosts =
            postsForDate(date);

          const dayColor =
            DAY_COLORS[
              date.getDay()
            ];

          const todayDate =
            isToday(date);

          return (
            <section
              key={date.toISOString()}
              className="
                overflow-hidden
                rounded-2xl
                border
              "
              style={{
                background:
                  theme === "dark"
                    ? `${dayColor}0c`
                    : `${dayColor}08`,
                borderColor: todayDate
                  ? dayColor
                  : `${dayColor}28`,
                boxShadow: todayDate
                  ? `0 0 0 1px ${dayColor}18`
                  : "none",
              }}
            >
              {/* DAY HEADER */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  border-b
                  px-3.5
                  py-3
                "
                style={{
                  borderColor:
                    `${dayColor}22`,
                  background:
                    theme === "dark"
                      ? "rgba(255,255,255,0.025)"
                      : "rgba(0,0,0,0.018)",
                }}
              >
                <div className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                ">
                  <div
                    className="
                      flex h-10 w-10
                      flex-shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      text-sm
                      font-bold
                    "
                    style={{
                      background:
                        todayDate
                          ? dayColor
                          : `${dayColor}16`,
                      color: todayDate
                        ? "#FFFFFF"
                        : dayColor,
                    }}
                  >
                    {date.getDate()}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="
                        truncate
                        text-xs
                        font-bold
                      "
                      style={{
                        color: t.text,
                      }}
                    >
                      {date.toLocaleDateString(
                        "en-US",
                        {
                          weekday:
                            "long",
                        }
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[10px]
                      "
                      style={{
                        color:
                          t.textFaint,
                      }}
                    >
                      {date.toLocaleDateString(
                        "en-US",
                        {
                          month:
                            "long",
                        }
                      )}
                    </p>
                  </div>

                  {todayDate && (
                    <span
                      className="
                        hidden
                        rounded-full
                        px-2
                        py-1
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-wider
                        min-[360px]:inline-flex
                      "
                      style={{
                        background:
                          `${dayColor}18`,
                        color:
                          dayColor,
                      }}
                    >
                      Today
                    </span>
                  )}
                </div>

                <span
                  className="
                    flex-shrink-0
                    rounded-full
                    px-2.5
                    py-1
                    text-[9px]
                    font-semibold
                  "
                  style={{
                    background:
                      theme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                    color:
                      t.textMuted,
                  }}
                >
                  {dayPosts.length}{" "}
                  {dayPosts.length ===
                  1
                    ? "post"
                    : "posts"}
                </span>
              </div>

              {/* DAY CONTENT */}
              <div className="flex flex-col gap-2 p-3">
                {dayPosts.length >
                0 ? (
                  dayPosts.map(
                    (
                      post,
                      postIndex
                    ) => (
                      <PostTile
                        key={post.id}
                        post={post}
                        index={
                          postIndex
                        }
                        onClick={() =>
                          setSelectedPost(
                            post
                          )
                        }
                        canDelete={
                          userRole ===
                          "EDIT_CALENDAR"
                        }
                        onDelete={() =>
                          handleDeletePost(
                            post.id
                          )
                        }
                      />
                    )
                  )
                ) : (
                  <div
                    className="
                      rounded-xl
                      border
                      border-dashed
                      px-4
                      py-5
                      text-center
                    "
                    style={{
                      borderColor:
                        `${dayColor}25`,
                      background:
                        theme ===
                        "dark"
                          ? "rgba(255,255,255,0.018)"
                          : "rgba(0,0,0,0.015)",
                    }}
                  >
                    <p
                      className="
                        text-[10px]
                        font-medium
                      "
                      style={{
                        color:
                          t.textFaint,
                      }}
                    >
                      {filtersActive
                        ? "No posts match your filters"
                        : "Nothing scheduled"}
                    </p>
                  </div>
                )}

                {userRole ===
                  "EDIT_CALENDAR" && (
                  <button
                    type="button"
                    onClick={() =>
                      setAddingDate(
                        date
                      )
                    }
                    className="
                      flex
                      min-h-11
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-dashed
                      px-4
                      py-3
                      text-xs
                      font-semibold
                      transition-all
                      active:scale-[0.98]
                    "
                    style={{
                      borderColor:
                        `${dayColor}55`,
                      background:
                        theme ===
                        "dark"
                          ? `${dayColor}08`
                          : `${dayColor}06`,
                      color:
                        dayColor,
                    }}
                  >
                    <span className="
                      text-base
                      leading-none
                    ">
                      +
                    </span>

                    <span>
                      Add post to{" "}
                      {date.toLocaleDateString(
                        "en-US",
                        {
                          weekday:
                            "short",
                        }
                      )}
                    </span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
        </>
      )}

      {/* =====================================================
          ADD POST
          ===================================================== */}

      {addingDate && (
        <AddPostPanel
          calendarId={calendarId}
          date={addingDate}
          theme={theme}
          onClose={() =>
            setAddingDate(null)
          }
          onCreated={(newPosts) =>
            setPosts((prev) => [
              ...prev,
              ...newPosts.map(normalize),
            ])
          }
        />
      )}

      {/* =====================================================
          POST DETAIL
          ===================================================== */}

      {selectedPost && (
        <PostDetailPanel
          calendarId={calendarId}
          post={selectedPost}
          theme={theme}
          onClose={() =>
            setSelectedPost(null)
          }
          onUpdated={(updated) => {
            const safe =
              normalize(updated);

            setPosts((prev) =>
              prev.map((p) =>
                p.id === safe.id
                  ? safe
                  : p
              )
            );

            setSelectedPost(safe);
          }}
        />
      )}
    </div>
  );
}