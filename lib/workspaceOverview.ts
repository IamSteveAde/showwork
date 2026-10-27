export type OverviewPost = {
  id: string; postDate: string; platform: string; approvalStatus: string; internalReviewStatus: string;
  isAiDraft?: boolean; publishStatus?: string | null; instagramPublishStatus?: string | null; tikTokPublishStatus?: string | null;
  contentIdea?: string | null; hook?: string | null; caption?: string | null;
};
export const overviewStages = [
  { id: "draft", label: "AI drafts", color: "#cbd5e1" },
  { id: "internal", label: "Internal review", color: "#8baff8" },
  { id: "revision", label: "Changes needed", color: "#f4b36c" },
  { id: "client", label: "Client review", color: "#6c6de8" },
  { id: "ready", label: "Approved", color: "#369bbb" },
  { id: "published", label: "Published", color: "#1768e8" },
] as const;
export function overviewStage(post: OverviewPost): typeof overviewStages[number]["id"] {
  const status = post.platform === "INSTAGRAM" ? post.instagramPublishStatus : post.platform === "TIKTOK" ? post.tikTokPublishStatus : post.publishStatus;
  if (status === "PUBLISHED") return "published";
  if (post.isAiDraft) return "draft";
  if (post.internalReviewStatus === "NEEDS_CHANGES" || (post.internalReviewStatus === "APPROVED" && post.approvalStatus === "NEEDS_REVISION")) return "revision";
  if (post.internalReviewStatus !== "APPROVED") return "internal";
  if (post.approvalStatus !== "APPROVED") return "client";
  return "ready";
}
export function buildWorkspaceOverview(posts: OverviewPost[], now: Date) {
  const stages = overviewStages.map(stage => ({ ...stage, count: posts.filter(p => overviewStage(p) === stage.id).length }));
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
    return { date, count: posts.filter(p => !p.isAiDraft && p.postDate.slice(0, 10) === date).length };
  });
  const upcoming = posts.filter(p => !p.isAiDraft && overviewStage(p) !== "published" && Date.parse(p.postDate) >= now.getTime()).sort((a, b) => Date.parse(a.postDate) - Date.parse(b.postDate)).slice(0, 4);
  const platforms = [...new Set(posts.map(p => p.platform))].map(platform => ({ platform, count: posts.filter(p => p.platform === platform).length })).sort((a, b) => b.count - a.count);
  return { stages, days, upcoming, platforms };
}
