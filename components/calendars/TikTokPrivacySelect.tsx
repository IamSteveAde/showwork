"use client";
import { useEffect, useState } from "react";
type Privacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
const labels: Record<Privacy, string> = { PUBLIC_TO_EVERYONE: "Public", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
export default function TikTokPrivacySelect({ calendarId, value, onChange }: { calendarId: string; value: Privacy | null; onChange: (value: Privacy | null) => void }) {
  const [options, setOptions] = useState<Privacy[]>([]);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setOptions([]); setAccount("");
    fetch(`/api/calendars/${calendarId}/tiktok/creator-info`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setOptions(data.privacyOptions.filter((option: string) => option in labels)); setAccount(data.accountName);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [calendarId, attempt]);
  return <div className="my-3 rounded-xl border border-teal-500/30 p-3"><label className="block text-sm">TikTok visibility{account ? ` · ${account}` : ""}<select disabled={loading || !!error} aria-label="TikTok visibility" value={value || ""} onChange={event => onChange((event.target.value || null) as Privacy | null)} className="mt-2 block w-full rounded-lg border bg-white p-2 text-black"><option value="">Choose visibility</option>{options.map(option => <option key={option} value={option}>{labels[option]}</option>)}</select></label>{loading && <p role="status" className="mt-2 text-sm">Loading TikTok settings…</p>}{error && <><p role="alert" className="mt-2 text-sm text-red-500">{error}</p><button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-2 text-sm underline">Retry loading TikTok settings</button></>}</div>;
}
