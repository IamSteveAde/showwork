type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "X" | "LINKEDIN";

const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  INSTAGRAM: { label: "Instagram", color: "#E1306C" },
  TIKTOK: { label: "TikTok", color: "#00F2EA" },
  YOUTUBE: { label: "YouTube", color: "#FF0000" },
  FACEBOOK: { label: "Facebook", color: "#1877F2" },
  X: { label: "X", color: "#FFFFFF" },
  LINKEDIN: { label: "LinkedIn", color: "#0A66C2" },
};

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  switch (platform) {
    case "INSTAGRAM":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.3a3 3 0 0 0-2.1 2.1C2 8.9 2 12 2 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C6.1 19 12 19 12 19s5.9 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.5.4-4.6.4-4.6Zm-11.9 3V9l5.2 3-5.2 3Z" />
        </svg>
      );
    case "FACEBOOK":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
        </svg>
      );
    case "X":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
        </svg>
      );
    case "LINKEDIN":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
        </svg>
      );
  }
}

export default function CalendarStatsSummary({
  posts,
}: {
  posts: { platform: Platform; postDate: string }[];
}) {
  if (posts.length === 0) return null;

  const dates = posts.map((p) => new Date(p.postDate));
  const uniqueDays = new Set(dates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)).size;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  const rangeLabel = sameMonth
    ? `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { day: "numeric" })}`
    : `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const platformCounts = posts.reduce<Partial<Record<Platform, number>>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] ?? 0) + 1;
    return acc;
  }, {});
  const platformEntries = (Object.entries(platformCounts) as [Platform, number][]).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...platformEntries.map(([, c]) => c));

  return (
    <div
      className="mb-8 overflow-hidden rounded-2xl border"
      style={{
        background: "linear-gradient(135deg, rgba(36,120,255,0.08) 0%, rgba(255,204,0,0.05) 100%)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3 sm:gap-4">
        <div>
          <p className="text-4xl font-black text-white">{posts.length}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
            {posts.length === 1 ? "Post planned" : "Posts planned"}
          </p>
        </div>
        <div>
          <p className="text-4xl font-black text-white">{uniqueDays}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
            {uniqueDays === 1 ? "Day covered" : "Days covered"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-black text-white">{rangeLabel}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
            Date range
          </p>
        </div>
      </div>

      {platformEntries.length > 0 && (
        <div className="border-t px-6 py-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="mb-3 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
            By platform
          </p>
          <div className="flex flex-col gap-2.5">
            {platformEntries.map(([platform, count]) => {
              const meta = PLATFORM_META[platform];
              return (
                <div key={platform} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                  </span>
                  <span className="w-16 flex-shrink-0 text-xs font-medium text-white/60">{meta.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%`, background: meta.color }}
                    />
                  </div>
                  <span className="w-6 flex-shrink-0 text-right text-xs font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}