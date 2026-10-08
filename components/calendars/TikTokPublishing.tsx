"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyTikTokSettings, type TikTokSettings, type TikTokCreator } from "@/lib/tiktokSettings";
import { buildCaption } from "@/lib/publishing/state";

type Post = {
  id: string; approvalStatus: string; tikTokPublishStatus: string;
  tikTokPrivacyLevel?: string | null; tikTokSettings?: unknown; tikTokPublishError?: string | null;
  tikTokConsentAt?: string | null; tikTokPublishId?: string | null; tikTokInitStartedAt?: string | null;
  caption?: string | null; cta?: string | null; hashtags?: string | null; taggedAccounts?: string | null; linkUrl?: string | null;
  assets?: { id: string; mediaType: string; contentUrl: string }[];
};
type Creator = TikTokCreator & { accountId: string };
const labels: Record<string, string> = { PUBLIC_TO_EVERYONE: "Public", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
export default function TikTokPublishing({ calendarId, post }: { calendarId: string; post: Post }) {
  const router = useRouter();
  const [settings, setSettings] = useState<TikTokSettings>(() => ({ ...emptyTikTokSettings, privacyLevel: post.tikTokPrivacyLevel || null, ...(post.tikTokSettings as Partial<TikTokSettings> || {}) }));
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState(post.tikTokPublishStatus);
  const [duration, setDuration] = useState<number | null>(null);
  const video = post.assets?.some(a => a.mediaType === "VIDEO") || false;
  const approved = post.approvalStatus === "APPROVED";
  const locked = ["SCHEDULED", "PUBLISHING", "PUBLISHED"].includes(status) || !!post.tikTokPublishId;
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setConsent(false); setCreator(null); setError("");
    try {
      const response = await fetch(`/api/calendars/${calendarId}/tiktok/creator-info`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load TikTok settings.");
      if (!signal?.aborted) {
        setCreator(result);
        setSettings(current => ({ ...current,
          allowComment: result.comment_disabled ? false : current.allowComment,
          allowDuet: result.duet_disabled ? false : current.allowDuet,
          allowStitch: result.stitch_disabled ? false : current.allowStitch,
        }));
      }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Could not load TikTok settings."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [calendarId, post.id, post.approvalStatus]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => { setStatus(post.tikTokPublishStatus); }, [post.tikTokPublishStatus]);
  // A refreshed post/approval invalidates local acceptance of the final action.
  useEffect(() => { setConsent(false); }, [post.caption, post.cta, post.hashtags, post.taggedAccounts, post.linkUrl, post.approvalStatus, JSON.stringify(post.assets)]);
  function change<K extends keyof TikTokSettings>(key: K, value: TikTokSettings[K]) {
    setConsent(false); setSaved("");
    setSettings(current => ({ ...current, [key]: value,
      ...(key === "disclosureEnabled" && value === false ? { yourBrand: false, brandedContent: false } : {}),
    }));
  }
  let invalid = "";
  if (!creator || loading) invalid = "Load the current TikTok account settings first.";
  else if (!settings.privacyLevel || !creator.privacy_level_options.includes(settings.privacyLevel)) invalid = "Choose an available TikTok visibility option.";
  else if (settings.disclosureEnabled && !settings.yourBrand && !settings.brandedContent) invalid = "You need to indicate if your content promotes yourself, a third party, or both.";
  else if (settings.brandedContent && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(settings.privacyLevel)) invalid = "Branded content visibility cannot be set to private. Choose Public or Friends.";
  else if (settings.allowComment && creator.comment_disabled || video && (settings.allowDuet && creator.duet_disabled || settings.allowStitch && creator.stitch_disabled)) invalid = "An interaction was disabled in TikTok. Turn it off before continuing.";
  else if (video && duration !== null && duration > creator.max_video_post_duration_sec) invalid = `Shorten this video to ${creator.max_video_post_duration_sec} seconds or less.`;
  const caption = buildCaption({ caption: post.caption || null, cta: post.cta || null, hashtags: post.hashtags || null, taggedAccounts: post.taggedAccounts || null, linkUrl: post.linkUrl });
  async function act(action: string) {
    setBusy(true); setError(""); setSaved("");
    try {
      const response = await fetch(`/api/calendars/${calendarId}/posts/${post.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, settings: { ...settings, ...(!video ? { allowDuet: false, allowStitch: false } : {}) }, accountId: creator?.accountId, consent, confirmedNotPublished: confirmed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update TikTok publishing.");
      setStatus(result.status); setConsent(false);
      setSaved(action === "save" ? "TikTok settings saved. Publishing still requires approval and your authorization." : action === "cancel" ? "Publishing cancelled. Review and authorize again to schedule." : "TikTok publishing authorized. The result will update here.");
      window.dispatchEvent(new Event("showwork-calendar-posts-sync")); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update TikTok publishing."); setConsent(false); }
    finally { setBusy(false); }
  }
  const controlClass = "flex gap-2 text-sm";
  const inputClass = "mt-2 block w-full rounded-lg border border-slate-400/30 bg-white p-2 text-black disabled:opacity-50";
  return <section className="my-4 space-y-4 rounded-2xl border border-teal-500/30 p-4 text-sm" aria-label="Post to TikTok">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Post to TikTok</h3><button type="button" disabled={loading || busy} onClick={() => void load()} className="underline disabled:opacity-50">Refresh account settings</button></div>
    {loading && <p role="status">Loading TikTok account and available settings…</p>}
    {creator && <div className="flex items-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={creator.creator_avatar_url} alt="" className="h-10 w-10 rounded-full" /><div><p className="font-semibold">{creator.creator_nickname}</p><p className="opacity-70">@{creator.creator_username}</p></div></div>}
    <p>Publishing: {status.toLowerCase().replaceAll("_", " ")}</p>
    <p className="text-xs opacity-70">Your originals are preserved. Photos are prepared as JPEG; transparency uses a white background and animated images use their first frame. Videos that need conversion are prepared as MP4, with resizing or padding to fit TikTok. Videos keep their full duration and audio.</p>
    <div className="flex gap-3 overflow-x-auto">
      {post.assets?.map(asset => asset.mediaType === "VIDEO" ? <video key={asset.id} src={asset.contentUrl} controls playsInline preload="metadata" onLoadedMetadata={event => setDuration(event.currentTarget.duration)} className="max-h-64 max-w-full rounded-xl" /> : <img key={asset.id} src={asset.contentUrl} alt="Photo to publish" className="max-h-64 rounded-xl object-contain" />)}
    </div>
    <div><p className="font-medium">Final caption</p><p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-400/20 p-3">{caption || "No caption"}</p><p className="mt-1 text-xs opacity-70">{approved ? "To edit the approved caption or media, ask the client to request a revision." : "Edit caption, mentions, call to action, hashtags and links in the post details before approval."}</p></div>
    <fieldset disabled={locked || busy || !creator || loading} className="space-y-4 disabled:opacity-70">
      {!video && <label className="block">Photo title<input value={settings.photoTitle} maxLength={90} onChange={e => change("photoTitle", e.target.value)} className={inputClass} /><span className="text-xs opacity-70">{settings.photoTitle.length}/90</span></label>}
      <label className="block">Privacy / visibility<select aria-label="TikTok visibility" value={settings.privacyLevel || ""} onChange={e => change("privacyLevel", e.target.value || null)} className={inputClass}><option value="">Choose visibility</option>{creator?.privacy_level_options.map(option => <option key={option} value={option} disabled={settings.brandedContent && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(option)} title={settings.brandedContent && option === "SELF_ONLY" ? "Branded content visibility cannot be set to private." : undefined}>{labels[option] || option}</option>)}</select></label>
      {settings.brandedContent && <p className="text-xs">Branded content visibility cannot be set to private. Choose Public or Friends.</p>}
      <div className="space-y-2"><p className="font-medium">Interaction settings</p>{(["allowComment", ...(video ? ["allowDuet", "allowStitch"] : [])] as ("allowComment" | "allowDuet" | "allowStitch")[]).map(key => {
        const restricted = key === "allowComment" ? creator?.comment_disabled : key === "allowDuet" ? creator?.duet_disabled : creator?.stitch_disabled;
        const label = key === "allowComment" ? "Allow comments" : key === "allowDuet" ? "Allow Duet" : "Allow Stitch";
        return <label key={key} className={`${controlClass} ${restricted ? "text-slate-400" : ""}`} title={restricted ? "Disabled in this TikTok account's privacy settings." : undefined}><input type="checkbox" checked={settings[key]} disabled={restricted} onChange={e => change(key, e.target.checked)} />{label}{restricted && <span className="text-xs">Disabled in TikTok</span>}</label>;
      })}</div>
      <div className="space-y-2"><label className={controlClass}><input type="checkbox" role="switch" checked={settings.disclosureEnabled} onChange={e => change("disclosureEnabled", e.target.checked)} />Content Disclosure</label><p className="text-xs opacity-70">Indicate whether this content promotes yourself, a brand, product or service.</p>
        {settings.disclosureEnabled && <div className="space-y-3 rounded-lg border border-slate-400/20 p-3"><label className={controlClass}><input type="checkbox" checked={settings.yourBrand} onChange={e => change("yourBrand", e.target.checked)} />Your Brand</label><p className="text-xs opacity-70">You are promoting yourself or your own business.</p><label className={controlClass} title={settings.privacyLevel === "SELF_ONLY" ? "Branded content visibility cannot be set to private." : undefined}><input type="checkbox" checked={settings.brandedContent} disabled={!!settings.privacyLevel && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(settings.privacyLevel)} onChange={e => change("brandedContent", e.target.checked)} />Branded Content</label><p className="text-xs opacity-70">You are promoting another brand or a third party.</p>{settings.privacyLevel === "SELF_ONLY" && <p className="text-xs">Branded content visibility cannot be set to private.</p>}{(settings.yourBrand || settings.brandedContent) && <p role="status">Your {video ? "video" : "photo"} will be labeled as &apos;{settings.brandedContent ? "Paid partnership" : "Promotional content"}&apos;</p>}</div>}
      </div>
      <label className={controlClass}><input type="checkbox" checked={settings.isAigc} onChange={e => change("isAigc", e.target.checked)} />This media is AI generated</label>
    </fieldset>
    {creator && video && <p className="text-xs opacity-70">This TikTok account supports videos up to {creator.max_video_post_duration_sec} seconds. The stored file is checked before publishing.</p>}
    {invalid && !locked && <p role="status" className="text-amber-600">{invalid}</p>}
    {!locked && <>
      {!approved && <button type="button" disabled={busy || !!invalid} onClick={() => void act("save")} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-40">Save TikTok settings</button>}
      {approved && <>
        <label className={controlClass}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy || !!invalid} /><span>By posting, you agree to TikTok&apos;s {settings.disclosureEnabled && settings.brandedContent && <><a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer" className="underline">Branded Content Policy</a> and </>}<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline">Music Usage Confirmation</a>.</span></label>
        <p className="text-xs opacity-70">I authorize Showwork to send this reviewed content and these settings to the TikTok account shown above, now or at its scheduled time. After submission, TikTok may take a few minutes to process the post and make it visible on the profile.</p>
        {status === "FAILED" && <label className={controlClass}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I checked TikTok and this post has not published.</label>}
        <div title={invalid || undefined} className="flex flex-wrap gap-3"><button type="button" disabled={busy || !!invalid || !consent || status === "FAILED" && !confirmed} onClick={() => void act(status === "FAILED" ? "retry" : "schedule")} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-40">{busy ? "Preparing and checking media…" : status === "FAILED" ? "Authorize and retry" : "Authorize and schedule"}</button>{status !== "FAILED" && <button type="button" disabled={busy || !!invalid || !consent} onClick={() => void act("publish")} className="rounded-lg border border-blue-500 px-3 py-2 disabled:opacity-40">Authorize and publish now</button>}</div>
      </>}
    </>}
    {status === "SCHEDULED" && <><p>Authorized for the calendar time. Cancel to change settings or review authorization.</p><button type="button" disabled={busy} onClick={() => void act("cancel")} className="underline">Cancel publishing</button></>}
    {status === "PUBLISHING" && <p role="status">TikTok is processing this post. Showwork will keep checking for confirmation; do not submit it again.</p>}
    {status === "PUBLISHED" && <p role="status">TikTok confirmed this post. Open the account in TikTok to view it.</p>}
    {post.tikTokPublishId && status === "FAILED" && <p>This TikTok operation failed. Correct the media and create a new post to submit again.</p>}
    {(error || post.tikTokPublishError) && <p role="alert" className="text-red-500">{error || post.tikTokPublishError}</p>}
    {saved && <p role="status">{saved}</p>}
  </section>;
}
