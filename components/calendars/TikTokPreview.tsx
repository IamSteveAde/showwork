"use client";

import { useState, useRef } from "react";

type ApprovalStatus = "PENDING" | "APPROVED" | "NEEDS_REVISION";

interface PreviewAsset {
  id: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  contentUrl: string;
}

interface PreviewPost {
  id: string;
  postDate: string;
  platform: string;
  postType: string | null;
  caption: string | null;
  hashtags: string | null;
  approvalStatus: ApprovalStatus;
  assets: PreviewAsset[];
}

const APPROVAL_DOT: Record<ApprovalStatus, string> = {
  PENDING: "#FFCC00",
  APPROVED: "#4ade80",
  NEEDS_REVISION: "#F97316",
};

function IconHeart({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 20.5s-7.5-4.6-9.9-9.3C.6 8 2 4.7 5.3 4.1c2-.4 3.9.5 5 2.1a1 1 0 0 0 1.4 0c1.1-1.6 3-2.5 5-2.1 3.3.6 4.7 3.9 3.2 7.1-2.4 4.7-9.9 9.3-9.9 9.3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComment({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 4.9 3.6 6.5-.2 1.2-.8 2.7-1.7 3.7-.2.2 0 .5.3.5 1.9-.2 3.7-1 5-1.9 1 .2 2 .3 2.8.3 5.5 0 10-3.8 10-8.5S17.5 2 12 2Z" />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17 3a4.5 4.5 0 0 0-4.5 4.5c0 .3 0 .6.1.9L8.3 11a4.5 4.5 0 1 0 0 6l4.3 2.6c0 .3-.1.6-.1.9A4.5 4.5 0 1 0 17 16a4.5 4.5 0 0 0-3.7 1.9l-4.4-2.6a4.6 4.6 0 0 0 0-2.6l4.4-2.6A4.5 4.5 0 1 0 17 3Z" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function IconHome({
  className,
  active,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFriends({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path
        d="M2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M12 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconInbox({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 4h16l-1.5 10a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 4Z"
        strokeLinejoin="round"
      />
      <path d="M8 20h8M9 4V2h6v2" strokeLinecap="round" />
    </svg>
  );
}

function IconMusicDisc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#111"
        stroke="rgba(255,255,255,0.2)"
      />
      <circle cx="12" cy="12" r="4" fill="#333" />
      <circle cx="12" cy="12" r="1.4" fill="#888" />
    </svg>
  );
}

function IconCamera({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="6" width="15" height="13" rx="2.5" />
      <path d="M17 9.5 22 7v10l-5-2.5" strokeLinejoin="round" />
    </svg>
  );
}

function TikTokSlide({
  post,
  clientName,
}: {
  post: PreviewPost;
  clientName: string;
}) {
  const [assetIndex, setAssetIndex] = useState(0);
  const active = post.assets[assetIndex];
  const touchStartX = useRef<number | null>(null);

  const handle =
    "@" + clientName.toLowerCase().replace(/\s+/g, "");

  const timeLabel = new Date(post.postDate).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );

  return (
    <div
      className="relative flex h-full w-full flex-shrink-0 snap-start items-center justify-center overflow-hidden bg-black"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (
          touchStartX.current === null ||
          post.assets.length <= 1
        ) {
          return;
        }

        const delta =
          e.changedTouches[0].clientX -
          touchStartX.current;

        if (
          delta < -40 &&
          assetIndex < post.assets.length - 1
        ) {
          setAssetIndex(assetIndex + 1);
        }

        if (delta > 40 && assetIndex > 0) {
          setAssetIndex(assetIndex - 1);
        }

        touchStartX.current = null;
      }}
    >
      {active ? (
        active.mediaType === "VIDEO" ? (
          <video
            src={active.contentUrl}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.contentUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900">
          <div className="text-center">
            <IconCamera className="mx-auto mb-2 h-7 w-7 text-white/15" />
            <p className="text-xs text-white/30">
              No content uploaded yet
            </p>
          </div>
        </div>
      )}

      {/* Cinematic overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {/* Scheduled badge */}
      <span
        className="absolute left-3 top-3 rounded-full px-2.5 py-1.5 text-[9px] font-semibold text-white"
        style={{
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Scheduled · {timeLabel}
      </span>

      {/* Carousel indicator */}
      {post.assets.length > 1 && (
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {post.assets.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === assetIndex ? 18 : 6,
                background:
                  i === assetIndex
                    ? "#fff"
                    : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute bottom-[88px] right-2.5 flex flex-col items-center gap-4">
        <div className="relative mb-1">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-xl"
            style={{
              background:
                "linear-gradient(135deg,#25F4EE,#111,#FE2C55)",
            }}
          >
            {clientName.charAt(0).toUpperCase()}
          </div>

          <span className="absolute -bottom-1.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#FE2C55] text-[10px] font-bold text-white">
            +
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <IconHeart className="h-7 w-7 text-white drop-shadow-lg" />
          <span className="text-[9px] font-semibold text-white drop-shadow-lg">
            Like
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <IconComment className="h-6.5 w-6.5 text-white drop-shadow-lg" />
          <span className="text-[9px] font-semibold text-white drop-shadow-lg">
            0
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <IconShare className="h-6.5 w-6.5 text-white drop-shadow-lg" />
          <span className="text-[9px] font-semibold text-white drop-shadow-lg">
            Share
          </span>
        </div>

        <div
          className="mt-1 h-9 w-9 overflow-hidden rounded-full border border-white/20 shadow-lg"
          style={{
            animation: "spin 3s linear infinite",
          }}
        >
          <IconMusicDisc className="h-full w-full" />
        </div>
      </div>

      {/* Bottom information */}
      <div className="absolute bottom-4 left-3 right-16">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white drop-shadow-lg">
            {handle}
          </p>

          <span
            className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
            style={{
              background: `${APPROVAL_DOT[post.approvalStatus]}22`,
              color: APPROVAL_DOT[post.approvalStatus],
              border: `1px solid ${APPROVAL_DOT[post.approvalStatus]}35`,
            }}
          >
            {post.approvalStatus === "APPROVED"
              ? "Approved"
              : post.approvalStatus === "NEEDS_REVISION"
              ? "Needs revision"
              : "Awaiting review"}
          </span>
        </div>

        {post.caption && (
          <p className="mt-1.5 line-clamp-3 text-[11px] leading-[1.45] text-white/90 drop-shadow-lg">
            {post.caption}
          </p>
        )}

        {post.hashtags && (
          <p className="mt-1 text-[10px] font-medium leading-relaxed text-white/85">
            {post.hashtags}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3 flex-shrink-0 text-white/80"
            fill="currentColor"
          >
            <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>

          <p className="truncate text-[9px] text-white/70">
            Original sound - {clientName}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TikTokPreview({
  posts,
  clientName,
}: {
  posts: PreviewPost[];
  clientName: string;
}) {
  const tiktokPosts = posts
    .filter((p) => p.platform === "TIKTOK")
    .sort(
      (a, b) =>
        new Date(a.postDate).getTime() -
        new Date(b.postDate).getTime()
    );

  return (
    <div className="flex flex-col items-center">
      <div
        className="mb-4 flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background:
              "linear-gradient(135deg,#25F4EE,#FE2C55)",
          }}
        />

        <p className="text-[11px] font-semibold text-white/50">
          Showwork Preview — not the live TikTok app
        </p>
      </div>

      {/* PHONE */}
      <div
        className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[2.5rem] border-[6px] shadow-2xl"
        style={{
          borderColor: "#1a1a1a",
          background: "#000",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.55)",
        }}
      >
        {/* Dynamic Island */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-40 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black" />

        <div className="relative h-[660px] w-full overflow-hidden bg-black">
          {/* Status bar */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-white">
            <span>9:41</span>

            <div className="flex items-center gap-1">
              <svg
                viewBox="0 0 18 12"
                className="h-2.5 w-4"
                fill="currentColor"
              >
                <rect
                  x="0"
                  y="7"
                  width="3"
                  height="5"
                  rx="0.5"
                />
                <rect
                  x="5"
                  y="4"
                  width="3"
                  height="8"
                  rx="0.5"
                />
                <rect
                  x="10"
                  y="1"
                  width="3"
                  height="11"
                  rx="0.5"
                />
              </svg>

              <svg
                viewBox="0 0 24 12"
                className="h-2.5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect
                  x="1"
                  y="1.5"
                  width="19"
                  height="9"
                  rx="2.5"
                />
                <rect
                  x="3"
                  y="3.5"
                  width="14"
                  height="5"
                  rx="1"
                  fill="currentColor"
                  stroke="none"
                />
                <rect
                  x="21.5"
                  y="4"
                  width="1.5"
                  height="4"
                  rx="0.7"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* Top navigation */}
          <div className="pointer-events-none absolute left-0 right-0 top-9 z-30 flex items-center justify-center gap-5 text-sm font-semibold">
            <span className="text-white/45">
              Following
            </span>

            <span className="relative pb-1.5 text-white">
              For You
              <span
                className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg,#25F4EE,#FE2C55)",
                }}
              />
            </span>

            <IconSearch className="absolute right-4 h-5 w-5 text-white" />
          </div>

          {tiktokPosts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <IconCamera className="h-8 w-8 text-white/20" />

              <p className="text-xs font-semibold text-white/50">
                No TikTok posts planned yet
              </p>

              <p className="text-[10px] leading-relaxed text-white/25">
                Content added for TikTok will show up here
                in a real feed layout.
              </p>
            </div>
          ) : (
            <div
              className="h-full snap-y snap-mandatory overflow-y-auto"
              style={{
                scrollbarWidth: "none",
              }}
            >
              {tiktokPosts.map((post) => (
                <TikTokSlide
                  key={post.id}
                  post={post}
                  clientName={clientName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div
          className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3"
          style={{
            background: "#000",
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <IconHome
              className="h-6 w-6 text-white"
              active
            />
            <span className="text-[8px] font-semibold text-white">
              Home
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <IconFriends className="h-6 w-6 text-white/50" />
            <span className="text-[8px] font-semibold text-white/50">
              Friends
            </span>
          </div>

          <div
            className="flex h-7 w-9 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg,#25F4EE,#fff,#FE2C55)",
            }}
          >
            <span className="text-sm font-bold text-black">
              +
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <IconInbox className="h-6 w-6 text-white/50" />
            <span className="text-[8px] font-semibold text-white/50">
              Inbox
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{
                background: "rgba(255,255,255,0.2)",
              }}
            >
              {clientName.charAt(0).toUpperCase()}
            </div>

            <span className="text-[8px] font-semibold text-white/50">
              Profile
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-white/30">
        {tiktokPosts.length} TikTok post
        {tiktokPosts.length === 1 ? "" : "s"} planned for this
        calendar
      </p>
    </div>
  );
}