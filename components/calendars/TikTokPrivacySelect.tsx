"use client";
import { useEffect, useState } from "react";
type Privacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
const labels: Record<Privacy, string> = { PUBLIC_TO_EVERYONE: "Public", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
export default function TikTokPrivacySelect({ calendarId, value, onChange }: { calendarId: string; value: Privacy | null; onChange: (value: Privacy | null) => void }) {
  const [options, setOptions] = useState<Privacy[]>([]);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/calendars/${calendarId}/tiktok/creator-info`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setOptions(data.privacyOptions.filter((option: string) => option in labels)); setAccount(data.accountName);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [calendarId]);
  return <div className="my-3 rounded-xl border border-teal-500/30 p-3"><label className="block text-sm">TikTok visibility{account ? ` · ${account}` : ""}<select aria-label="TikTok visibility" value={value || ""} onChange={event => onChange((event.target.value || null) as Privacy | null)} className="mt-2 block w-full rounded-lg border bg-white p-2 text-black"><option value="">Choose visibility</option>{options.map(option => <option key={option} value={option}>{labels[option]}</option>)}</select></label>{error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}</div>;
}
