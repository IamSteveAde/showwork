"use client";
import TikTokPublishing from "./TikTokPublishing";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Post = { tikTokPrivacyLevel?: string | null; tikTokSettings?: unknown; tikTokConsentAt?: string | null; tikTokPublishId?: string | null; tikTokInitStartedAt?: string | null; tikTokPublishError?: string | null; caption?: string | null; cta?: string | null; hashtags?: string | null; taggedAccounts?: string | null; linkUrl?: string | null; assets?: { id: string; mediaType: string; contentUrl: string }[]; id: string; platform: string; approvalStatus: string; publishStatus?: string; publishError?: string | null; publishPermalink?: string | null; instagramPublishStatus: string; tikTokPublishStatus: string };
export default function SocialPostPublishing({ calendarId, post }: { calendarId: string; post: Post }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const status = newStatus ?? (post.platform === "INSTAGRAM" ? post.instagramPublishStatus : post.platform === "TIKTOK" ? post.tikTokPublishStatus : post.publishStatus || "NOT_SCHEDULED");
  if (post.platform === "TIKTOK") return <TikTokPublishing calendarId={calendarId} post={post} />;
  if (!["FACEBOOK", "INSTAGRAM", "TIKTOK", "LINKEDIN", "X"].includes(post.platform) || post.approvalStatus !== "APPROVED") return null;
  async function act(action: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/calendars/${calendarId}/posts/${post.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, confirmedNotPublished: confirmed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update publishing.");
      setNewStatus(action === "cancel" ? "NOT_SCHEDULED" : "SCHEDULED"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Publishing failed."); } finally { setBusy(false); }
  }
  return <section className="my-4 rounded-xl border border-blue-500/20 p-4 text-sm">
    <p className="font-semibold">{post.platform} publishing: {status.toLowerCase().replaceAll("_", " ")}</p>
    {post.publishError && status === "FAILED" && <p className="mt-2 text-red-500">{post.publishError}</p>}
    {post.publishPermalink && status === "PUBLISHED" && <a href={post.publishPermalink} target="_blank" rel="noreferrer" className="underline">View published post</a>}
    {status === "NOT_SCHEDULED" && <button disabled={busy} onClick={() => act("schedule")} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-white">Schedule approved post</button>}
    {status === "SCHEDULED" && <><p className="mt-2">Publishes at the calendar time, or on the next scheduler run if that time has passed.</p><button disabled={busy} onClick={() => act("cancel")} className="mt-3 underline">Cancel publishing</button></>}
    {status === "FAILED" && <><label className="mt-3 flex gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I checked the platform and this post has not published.</label><button disabled={busy || !confirmed} onClick={() => act("retry")} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-40">Retry publishing</button></>}
    {error && <p role="alert" className="mt-2 text-red-500">{error}</p>}
  </section>;
}
