const COLOR_MAP: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Approved", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  NEEDS_REVISION: { label: "Needs revision", color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  PENDING: { label: "Awaiting review", color: "#888786", bg: "rgba(136,135,134,0.1)" },
};

export default function CalendarReport({
  posts,
}: {
  posts: { approvalStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION"; hasContent: boolean }[];
}) {
  // Only posts that actually have content uploaded count toward the
  // report — a purely planned post with nothing uploaded yet was
  // never sent for review in the first place, so counting it as
  // "pending" would overstate how much is genuinely awaiting anyone.
  const withContent = posts.filter((p) => p.hasContent);
  const counts = {
    APPROVED: withContent.filter((p) => p.approvalStatus === "APPROVED").length,
    NEEDS_REVISION: withContent.filter((p) => p.approvalStatus === "NEEDS_REVISION").length,
    PENDING: withContent.filter((p) => p.approvalStatus === "PENDING").length,
  };

  if (withContent.length === 0) return null;

  return (
    <div className="mb-8 grid grid-cols-3 gap-3">
      {(["APPROVED", "NEEDS_REVISION", "PENDING"] as const).map((key) => {
        const meta = COLOR_MAP[key];
        return (
          <div key={key} className="rounded-xl p-4" style={{ background: meta.bg }}>
            <p className="text-2xl font-bold" style={{ color: meta.color }}>
              {counts[key]}
            </p>
            <p className="text-xs font-semibold text-white/50">{meta.label}</p>
          </div>
        );
      })}
    </div>
  );
}