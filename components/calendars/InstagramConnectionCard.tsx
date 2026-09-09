"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Instagram connection was cancelled.",
  no_linked_account: "No Instagram Business account is linked to your Facebook Page yet. Link one in your Facebook Page settings, then try again.",
  connection_failed: "Something went wrong connecting to Instagram. Please try again.",
  not_configured: "Instagram publishing isn't set up yet — contact support.",
  not_found: "That calendar couldn't be found.",
  missing_state: "Something went wrong — please try connecting again.",
};

export default function InstagramConnectionCard({
  calendarId,
  username,
  connectedAt,
}: {
  calendarId: string;
  username: string | null;
  connectedAt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("instagramError");
    const connected = searchParams.get("instagramConnected");
    if (errorCode) setError(ERROR_MESSAGES[errorCode] ?? "Something went wrong connecting to Instagram.");
    if (connected === "true") setJustConnected(true);
    if (errorCode || connected) {
      // Clean the URL so refreshing the page doesn't keep re-showing
      // the same success/error message.
      const url = new URL(window.location.href);
      url.searchParams.delete("instagramError");
      url.searchParams.delete("instagramConnected");
      router.replace(url.pathname + url.search, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/instagram/disconnect`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        setConfirming(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to disconnect — try again");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = !!username;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
      <div className="min-w-0 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="3.7" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">Instagram publishing</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">
                Auto-publish approved posts
              </p>
            </div>
          </div>

          {isConnected && (
            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
              Connected
            </span>
          )}
        </div>

        {justConnected && (
          <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-300">
            Instagram connected successfully.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        )}

        {isConnected ? (
          <>
            <p className="mt-4 text-sm font-medium text-white">@{username}</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
              Instagram posts approved by your client will automatically publish here once their scheduled date arrives.
              {connectedAt && ` Connected ${new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
            </p>
          </>
        ) : (
          <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
            Connect this calendar to a client&apos;s Instagram Business account — once connected, approved Instagram posts publish automatically on their scheduled date, no manual posting needed.
          </p>
        )}
      </div>

      <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
        {isConnected ? (
          confirming ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] text-[#AAB4C3]">Disconnect @{username}? Already-published posts stay published.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                </button>
                <button onClick={() => setConfirming(false)} className="text-xs text-white/40 underline">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="w-full rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10"
            >
              Disconnect Instagram
            </button>
          )
        ) : (
         <a
  href={`/api/calendars/${calendarId}/instagram/connect`}
  target="_blank"
  rel="noopener noreferrer"
  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
  style={{
    background:
      "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
  }}
>
  Connect Instagram

  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="h-3.5 w-3.5 opacity-70"
    aria-hidden="true"
  >
    <path
      d="M14 5h5v5M19 5l-8 8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 13v4.5A1.5 1.5 0 0 1 16.5 19h-10A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6H11"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
</a>
        )}
      </div>
    </div>
  );
}