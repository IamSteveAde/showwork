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

function IconHeart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
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
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M21 11.5a8.4 8.4 0 0 1-8.9 8.5 9 9 0 0 1-3.5-.7L3 21l1.8-5.2A8.4 8.4 0 0 1 3.5 11 8.5 8.5 0 0 1 12 2.6a8.6 8.6 0 0 1 9 8.9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
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

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
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

function IconReels({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="m9 9 6 3-6 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="9.5" y="3" width="6" height="6" rx="1" />
      <rect x="16" y="3" width="5" height="6" rx="1" />
      <rect x="3" y="9.5" width="6" height="6" rx="1" />
      <rect x="9.5" y="9.5" width="6" height="6" rx="1" />
      <rect x="16" y="9.5" width="5" height="6" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="9.5" y="16" width="6" height="5" rx="1" />
      <rect x="16" y="16" width="5" height="5" rx="1" />
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
      strokeWidth="2"
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

function IconBack({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m15 18-6-6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBarIcons() {
  return (
    <div className="flex items-center gap-1">
      <svg
        viewBox="0 0 18 12"
        className="h-2.5 w-4"
        fill="currentColor"
      >
        <rect x="0" y="7" width="3" height="5" rx="0.5" />
        <rect x="5" y="4" width="3" height="8" rx="0.5" />
        <rect x="10" y="1" width="3" height="11" rx="0.5" />
      </svg>

      <svg
        viewBox="0 0 24 12"
        className="h-2.5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="1" y="1.5" width="19" height="9" rx="2.5" />
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
  );
}

function PostMedia({
  assets,
  isReel,
}: {
  assets: PreviewAsset[];
  isReel: boolean;
}) {
  const [index, setIndex] = useState(0);
  const active = assets[index];
  const touchStartX = useRef<number | null>(null);

  if (!active) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-neutral-900">
        <div className="text-center">
          <IconCamera className="mx-auto mb-2 h-6 w-6 text-white/15" />
          <p className="text-xs text-white/30">
            No content uploaded yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden bg-black"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;

        const delta =
          e.changedTouches[0].clientX - touchStartX.current;

        if (delta < -40 && index < assets.length - 1) {
          setIndex(index + 1);
        }

        if (delta > 40 && index > 0) {
          setIndex(index - 1);
        }

        touchStartX.current = null;
      }}
    >
      {active.mediaType === "VIDEO" ? (
        <video
          src={active.contentUrl}
          className="h-full w-full object-cover"
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
          className="h-full w-full object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />

      {isReel && (
        <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
          <IconReels className="h-3 w-3" />
          Reel
        </span>
      )}

      {assets.length > 1 && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            {index + 1}/{assets.length}
          </span>

          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {assets.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full transition-all"
                style={{
                  background:
                    i === index
                      ? "#fff"
                      : "rgba(255,255,255,0.45)",
                  transform:
                    i === index ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FeedCard({
  post,
  clientName,
}: {
  post: PreviewPost;
  clientName: string;
}) {
  const isReel = post.postType === "Reel";

  const timeLabel = new Date(post.postDate).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );

  const handle = clientName
    .toLowerCase()
    .replace(/\s+/g, "");

  return (
    <article className="border-b border-white/[0.08] pb-6">
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, #FEDA75, #D62976 60%, #4F5BD5)",
            }}
          >
            {clientName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">
              {handle}
            </p>

            <p className="text-[9px] text-white/35">
              Scheduled · {timeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: APPROVAL_DOT[post.approvalStatus],
            }}
          />

          <IconMore className="h-4 w-4 text-white/65" />
        </div>
      </div>

      <PostMedia assets={post.assets} isReel={isReel} />

      <div className="px-3.5">
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-4">
            <IconHeart className="h-[22px] w-[22px] text-white" />
            <IconComment className="h-[22px] w-[22px] text-white" />
            <IconShare className="h-[21px] w-[21px] text-white" />
          </div>

          <IconBookmark className="h-[22px] w-[22px] text-white" />
        </div>

        <div className="mt-2.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold"
            style={{
              background: `${APPROVAL_DOT[post.approvalStatus]}15`,
              color: APPROVAL_DOT[post.approvalStatus],
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: APPROVAL_DOT[post.approvalStatus],
              }}
            />

            {post.approvalStatus === "APPROVED"
              ? "Approved"
              : post.approvalStatus === "NEEDS_REVISION"
              ? "Needs revision"
              : "Awaiting review"}
          </span>
        </div>

        {post.caption && (
          <p className="pt-2 text-[11px] leading-[1.55] text-white/85">
            <span className="font-semibold">{handle}</span>{" "}
            {post.caption}
          </p>
        )}

        {post.hashtags && (
          <p
            className="pt-1 text-[11px] leading-[1.55]"
            style={{ color: "#6cb2eb" }}
          >
            {post.hashtags}
          </p>
        )}
      </div>
    </article>
  );
}

function GridCell({
  post,
  onClick,
}: {
  post: PreviewPost;
  onClick: () => void;
}) {
  const cover = post.assets[0];
  const isReel = post.postType === "Reel";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/5] w-full overflow-hidden bg-neutral-900"
    >
      {cover ? (
        cover.mediaType === "VIDEO" ? (
          <video
            src={cover.contentUrl}
            muted
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.contentUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <IconCamera className="h-5 w-5 text-white/15" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

      {(post.assets.length > 1 || isReel) && (
        <span className="pointer-events-none absolute right-2 top-2 text-white drop-shadow-lg">
          {isReel ? (
            <IconReels className="h-4 w-4" />
          ) : (
            <IconLayers className="h-4 w-4" />
          )}
        </span>
      )}

      <span
        className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full shadow"
        style={{
          background: APPROVAL_DOT[post.approvalStatus],
        }}
      />
    </button>
  );
}

export default function InstagramPreview({
  posts,
  clientName,
}: {
  posts: PreviewPost[];
  clientName: string;
}) {
  const instagramPosts = posts
    .filter((p) => p.platform === "INSTAGRAM")
    .sort(
      (a, b) =>
        new Date(a.postDate).getTime() -
        new Date(b.postDate).getTime()
    );

  const storyPosts = instagramPosts.filter(
    (p) => p.postType === "Story"
  );

  const gridPosts = instagramPosts.filter(
    (p) => p.postType !== "Story"
  );

  const [selectedPostId, setSelectedPostId] =
    useState<string | null>(null);

  const selectedIndex = gridPosts.findIndex(
    (p) => p.id === selectedPostId
  );

  const handleOpenPost = (postId: string) => {
    setSelectedPostId(postId);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="mb-4 flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background:
              "linear-gradient(135deg,#FEDA75,#D62976,#4F5BD5)",
          }}
        />

        <p className="text-[11px] font-semibold text-white/50">
          Showwork Preview — not the live Instagram app
        </p>
      </div>

      {/* PHONE FRAME */}
      <div
        className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[2.5rem] border-[6px] shadow-2xl"
        style={{
          borderColor: "#1a1a1a",
          background: "#000",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
        }}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-40 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black" />

        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-white">
          <span>9:41</span>
          <StatusBarIcons />
        </div>

        {selectedPostId ? (
          /* ─────────────────────────
             INSTAGRAM FEED MODE
             ───────────────────────── */
          <>
            <div className="relative z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#080808]/95 px-3.5 py-2.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setSelectedPostId(null)}
                aria-label="Back to Instagram profile"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
              >
                <IconBack className="h-5 w-5 text-white" />
              </button>

              <div className="text-center">
                <p className="text-[12px] font-semibold text-white">
                  Posts
                </p>

                <p className="text-[8px] text-white/35">
                  {selectedIndex + 1} of {gridPosts.length}
                </p>
              </div>

              <div className="h-8 w-8" />
            </div>

            <div
              className="h-[624px] overflow-y-auto overscroll-contain"
              style={{
                background: "#050505",
                scrollbarWidth: "none",
              }}
            >
              {gridPosts.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  clientName={clientName}
                />
              ))}
            </div>
          </>
        ) : (
          /* ─────────────────────────
             PROFILE / GRID MODE
             ───────────────────────── */
          <>
            <div className="flex items-center justify-between px-3.5 py-2">
              <p
                className="font-serif text-xl font-bold italic text-white"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Instagram
              </p>

              <div className="flex items-center gap-4 text-white">
                <IconHeart className="h-5 w-5" />
                <IconComment className="h-5 w-5" />
              </div>
            </div>

            <div
              className="h-[600px] overflow-y-auto"
              style={{
                background: "#0a0a0a",
                scrollbarWidth: "none",
              }}
            >
              {/* PROFILE */}
              <div className="px-4 pb-4 pt-3">
                <div className="flex items-center gap-5">
                  <div
                    className="flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-full p-[2px]"
                    style={{
                      background:
                        "linear-gradient(135deg,#FEDA75,#D62976,#4F5BD5)",
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-black bg-[#181818] text-lg font-bold text-white">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="flex flex-1 justify-between text-center">
                    <div>
                      <p className="text-[13px] font-bold text-white">
                        {gridPosts.length}
                      </p>
                      <p className="mt-0.5 text-[9px] text-white/45">
                        Posts
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-bold text-white">
                        —
                      </p>
                      <p className="mt-0.5 text-[9px] text-white/45">
                        Followers
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-bold text-white">
                        —
                      </p>
                      <p className="mt-0.5 text-[9px] text-white/45">
                        Following
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-white">
                    {clientName
                      .toLowerCase()
                      .replace(/\s+/g, "")}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                    Content calendar, planned by Showwork
                  </p>
                </div>
              </div>

              {/* STORIES */}
              {storyPosts.length > 0 && (
                <div className="border-y border-white/[0.06] px-3.5 py-3">
                  <div className="flex gap-4 overflow-x-auto">
                    {storyPosts.map((post) => {
                      const cover = post.assets[0];

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() =>
                            setSelectedPostId(post.id)
                          }
                          className="flex flex-shrink-0 flex-col items-center gap-1.5"
                        >
                          <div
                            className="flex h-[58px] w-[58px] items-center justify-center rounded-full p-[2px]"
                            style={{
                              background:
                                "linear-gradient(135deg,#FEDA75,#D62976,#4F5BD5)",
                            }}
                          >
                            <div className="h-full w-full overflow-hidden rounded-full border-2 border-black bg-neutral-800">
                              {cover ? (
                                cover.mediaType === "VIDEO" ? (
                                  <video
                                    src={cover.contentUrl}
                                    muted
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={cover.contentUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )
                              ) : null}
                            </div>
                          </div>

                          <span className="max-w-[58px] truncate text-[9px] text-white/55">
                            {new Date(
                              post.postDate
                            ).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GRID HEADER */}
              <div className="flex items-center justify-center border-b border-white/[0.06] py-3">
                <IconGrid className="h-[18px] w-[18px] text-white" />
              </div>

              {gridPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
                  <IconCamera className="h-8 w-8 text-white/15" />

                  <p className="text-xs font-semibold text-white/50">
                    No Instagram posts planned yet
                  </p>

                  <p className="text-[10px] leading-relaxed text-white/25">
                    Content added for Instagram will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {gridPosts.map((post) => (
                    <GridCell
                      key={post.id}
                      post={post}
                      onClick={() => handleOpenPost(post.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* BOTTOM NAV */}
        <div
          className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3"
          style={{ background: "#0a0a0a" }}
        >
          <IconHome className="h-6 w-6 text-white" />
          <IconSearch className="h-6 w-6 text-white/50" />
          <IconReels className="h-6 w-6 text-white/50" />

          <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-white/50">
            <span className="text-[10px] font-bold text-white/50">
              ▾
            </span>
          </div>

          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg,#FEDA75,#D62976,#4F5BD5)",
            }}
          >
            {clientName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-white/30">
        {instagramPosts.length} Instagram post
        {instagramPosts.length === 1 ? "" : "s"} planned for this
        calendar
      </p>
    </div>
  );
}