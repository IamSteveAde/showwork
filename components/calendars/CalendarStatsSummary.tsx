type Platform =
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "X"
  | "LINKEDIN";

type PlatformMeta = {
  label: string;
  color: string;
  softColor: string;
  description: string;
};

const PLATFORM_META: Record<Platform, PlatformMeta> = {
  INSTAGRAM: {
    label: "Instagram",
    color: "#E1306C",
    softColor: "rgba(225, 48, 108, 0.12)",
    description: "Visual content",
  },
  TIKTOK: {
    label: "TikTok",
    color: "#00F2EA",
    softColor: "rgba(0, 242, 234, 0.10)",
    description: "Short-form video",
  },
  YOUTUBE: {
    label: "YouTube",
    color: "#FF4D4D",
    softColor: "rgba(255, 77, 77, 0.10)",
    description: "Video content",
  },
  FACEBOOK: {
    label: "Facebook",
    color: "#4B8BFF",
    softColor: "rgba(75, 139, 255, 0.11)",
    description: "Social content",
  },
  X: {
    label: "X",
    color: "#FFFFFF",
    softColor: "rgba(255, 255, 255, 0.08)",
    description: "Social posts",
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "#4A9EFF",
    softColor: "rgba(74, 158, 255, 0.10)",
    description: "Professional content",
  },
};

/* ─────────────────────────────────────────────────────────────
   PLATFORM ICON
───────────────────────────────────────────────────────────── */

function PlatformIcon({
  platform,
  className = "",
}: {
  platform: Platform;
  className?: string;
}) {
  switch (platform) {
    case "INSTAGRAM":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
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
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
        </svg>
      );

    case "YOUTUBE":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M22 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.3a3 3 0 0 0-2.1 2.1C2 8.9 2 12 2 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C6.1 19 12 19 12 19s5.9 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.5.4-4.6.4-4.6Zm-11.9 3V9l5.2 3-5.2 3Z" />
        </svg>
      );

    case "FACEBOOK":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
        </svg>
      );

    case "X":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
        </svg>
      );

    case "LINKEDIN":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
        </svg>
      );

    default:
      return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────── */

function CalendarIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
      <path d="M3 9.5h18" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LayersIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </svg>
  );
}

function TrendIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 16.5 9 11l4 3 7-7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export default function CalendarStatsSummary({
  posts,
}: {
  posts: {
    platform: Platform;
    postDate: string;
  }[];
}) {
  if (posts.length === 0) {
    return null;
  }

  /*
   * Only use valid dates.
   */
  const dates = posts
    .map((post) => new Date(post.postDate))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) {
    return null;
  }

  /* ─────────────────────────────────────────────────────────
     DATE DATA
  ───────────────────────────────────────────────────────── */

  const uniqueDays = new Set(
    dates.map((date) => {
      return [
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ].join("-");
    })
  ).size;

  const sortedDates = [...dates].sort(
    (a, b) => a.getTime() - b.getTime()
  );

  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  const sameDay =
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth() &&
    firstDate.getDate() === lastDate.getDate();

  const sameMonth =
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth();

  const sameYear =
    firstDate.getFullYear() === lastDate.getFullYear();

  const shortDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const fullDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  let rangeLabel = "";

  if (sameDay) {
    rangeLabel = fullDate(firstDate);
  } else if (sameMonth) {
    rangeLabel =
      `${firstDate.toLocaleDateString("en-US", {
        month: "short",
      })} ${firstDate.getDate()} – ${lastDate.getDate()}`;
  } else if (sameYear) {
    rangeLabel =
      `${shortDate(firstDate)} – ${shortDate(lastDate)}`;
  } else {
    rangeLabel =
      `${fullDate(firstDate)} – ${fullDate(lastDate)}`;
  }

  /* ─────────────────────────────────────────────────────────
     PLATFORM DATA
  ───────────────────────────────────────────────────────── */

  const platformCounts: Partial<Record<Platform, number>> =
    {};

  for (const post of posts) {
    platformCounts[post.platform] =
      (platformCounts[post.platform] ?? 0) + 1;
  }

  const platformEntries = (
    Object.entries(platformCounts) as [Platform, number][]
  ).sort((a, b) => b[1] - a[1]);

  const maxCount =
    platformEntries.length > 0
      ? Math.max(
          ...platformEntries.map(([, count]) => count)
        )
      : 0;

  const leadingPlatform =
    platformEntries.length > 0
      ? platformEntries[0][0]
      : null;

  const leadingPlatformCount =
    platformEntries.length > 0
      ? platformEntries[0][1]
      : 0;

  const leadingPercentage =
    posts.length > 0
      ? Math.round(
          (leadingPlatformCount / posts.length) * 100
        )
      : 0;

  return (
    <section
      aria-label="Calendar overview"
      className="mb-8 overflow-hidden rounded-[26px] border"
      style={{
        background:
          "linear-gradient(145deg, #111419 0%, #0D0F12 58%, #10151C 100%)",
        borderColor: "rgba(255,255,255,0.075)",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.18)",
      }}
    >
      {/* ═════════════════════════════════════════════════════
          HEADER
      ═════════════════════════════════════════════════════ */}

      <div
        className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        style={{
          borderColor: "rgba(255,255,255,0.065)",
        }}
      >
        <div>
          <p
            className="text-[9px] font-semibold uppercase"
            style={{
              color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.16em",
            }}
          >
            Workspace overview
          </p>

          <h3 className="mt-1 text-sm font-semibold tracking-[-0.015em] text-white">
            Publishing activity
          </h3>
        </div>

        {leadingPlatform && (
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              background:
                PLATFORM_META[leadingPlatform].softColor,
              borderColor:
                `${PLATFORM_META[leadingPlatform].color}35`,
            }}
          >
            <PlatformIcon
              platform={leadingPlatform}
              className="h-3 w-3"
            />

            <span
              className="text-[9px] font-semibold"
              style={{
                color:
                  PLATFORM_META[leadingPlatform].color,
              }}
            >
              {PLATFORM_META[leadingPlatform].label} leads
            </span>

            <span className="text-[9px] font-medium text-white/45">
              {leadingPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════
          PRIMARY METRICS
      ═════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 sm:grid-cols-3">
        {/* Posts */}
        <div
          className="p-5 sm:p-6"
          style={{
            borderBottom:
              "1px solid rgba(255,255,255,0.065)",
          }}
        >
          <div className="flex items-start justify-between">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "rgba(36,120,255,0.11)",
                color: "#5C9BFF",
              }}
            >
              <LayersIcon className="h-4 w-4" />
            </div>

            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/30">
              Planned
            </span>
          </div>

          <div className="mt-6">
            <p className="text-[34px] font-semibold leading-none tracking-[-0.055em] text-white">
              {posts.length}
            </p>

            <p className="mt-2 text-[11px] font-medium text-white/55">
              {posts.length === 1
                ? "post planned"
                : "posts planned"}
            </p>
          </div>
        </div>

        {/* Days */}
        <div
          className="p-5 sm:border-l sm:border-r sm:p-6"
          style={{
            borderColor:
              "rgba(255,255,255,0.065)",
            borderBottom:
              "1px solid rgba(255,255,255,0.065)",
          }}
        >
          <div className="flex items-start justify-between">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "rgba(67,224,151,0.10)",
                color: "#43E097",
              }}
            >
              <CalendarIcon className="h-4 w-4" />
            </div>

            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/30">
              Coverage
            </span>
          </div>

          <div className="mt-6">
            <p className="text-[34px] font-semibold leading-none tracking-[-0.055em] text-white">
              {uniqueDays}
            </p>

            <p className="mt-2 text-[11px] font-medium text-white/55">
              {uniqueDays === 1
                ? "active day"
                : "active days"}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background:
                  "rgba(255,255,255,0.065)",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <TrendIcon className="h-4 w-4" />
            </div>

            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/30">
              Timeline
            </span>
          </div>

          <div className="mt-6 min-w-0">
            <p className="truncate text-[22px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[24px]">
              {rangeLabel}
            </p>

            <p className="mt-2 text-[11px] font-medium text-white/55">
              Publishing window
            </p>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════
          PLATFORM DISTRIBUTION
      ═════════════════════════════════════════════════════ */}

      {platformEntries.length > 0 && (
        <div
          className="border-t px-5 py-6 sm:px-6"
          style={{
            borderColor:
              "rgba(255,255,255,0.065)",
            background:
              "rgba(255,255,255,0.012)",
          }}
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p
                className="text-[9px] font-semibold uppercase"
                style={{
                  color: "rgba(255,255,255,0.34)",
                  letterSpacing: "0.15em",
                }}
              >
                Distribution
              </p>

              <p className="mt-1 text-sm font-semibold tracking-[-0.015em] text-white">
                Content by platform
              </p>
            </div>

            <span className="text-[9px] font-medium text-white/35">
              {platformEntries.length}{" "}
              {platformEntries.length === 1
                ? "platform"
                : "platforms"}
            </span>
          </div>

          <div className="space-y-2.5">
            {platformEntries.map(
              ([platform, count], index) => {
                const meta = PLATFORM_META[platform];

                const percentage =
                  posts.length > 0
                    ? Math.round(
                        (count / posts.length) * 100
                      )
                    : 0;

                const barWidth =
                  maxCount > 0
                    ? (count / maxCount) * 100
                    : 0;

                const isLeading = index === 0;

                return (
                  <div
                    key={platform}
                    className="rounded-2xl border p-3.5 transition-colors"
                    style={{
                      background: isLeading
                        ? "rgba(255,255,255,0.035)"
                        : "rgba(255,255,255,0.018)",
                      borderColor: isLeading
                        ? "rgba(255,255,255,0.075)"
                        : "rgba(255,255,255,0.045)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background:
                            meta.softColor,
                          color: meta.color,
                        }}
                      >
                        <PlatformIcon
                          platform={platform}
                          className="h-4 w-4"
                        />
                      </span>

                      {/* Name */}
                      <div className="w-[90px] shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-semibold text-white/85">
                            {meta.label}
                          </span>

                          {isLeading && (
                            <span
                              className="hidden rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase sm:inline-flex"
                              style={{
                                background:
                                  meta.softColor,
                                color:
                                  meta.color,
                              }}
                            >
                              Lead
                            </span>
                          )}
                        </div>

                        <span className="mt-0.5 block truncate text-[9px] text-white/30">
                          {meta.description}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full"
                          style={{
                            background:
                              "rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              background: meta.color,
                              boxShadow: isLeading
                                ? `0 0 14px ${meta.color}35`
                                : "none",
                            }}
                          />
                        </div>
                      </div>

                      {/* Numbers */}
                      <div className="flex w-[48px] shrink-0 flex-col items-end">
                        <span className="text-xs font-semibold text-white">
                          {count}
                        </span>

                        <span className="mt-0.5 text-[9px] font-medium text-white/35">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          INSIGHT
      ═════════════════════════════════════════════════════ */}

      {leadingPlatform &&
        platformEntries.length > 1 && (
          <div
            className="border-t px-5 py-4 sm:px-6"
            style={{
              borderColor:
                "rgba(255,255,255,0.055)",
              background:
                "rgba(36,120,255,0.025)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background:
                    PLATFORM_META[
                      leadingPlatform
                    ].softColor,
                  color:
                    PLATFORM_META[
                      leadingPlatform
                    ].color,
                }}
              >
                <PlatformIcon
                  platform={leadingPlatform}
                  className="h-3 w-3"
                />
              </span>

              <p className="text-[10px] leading-5 text-white/45">
                <span className="font-semibold text-white/70">
                  {
                    PLATFORM_META[
                      leadingPlatform
                    ].label
                  }
                </span>{" "}
                is your most active platform with{" "}
                <span className="font-semibold text-white/70">
                  {leadingPlatformCount}{" "}
                  {leadingPlatformCount === 1
                    ? "planned post"
                    : "planned posts"}
                </span>
                .
              </p>
            </div>
          </div>
        )}
    </section>
  );
}