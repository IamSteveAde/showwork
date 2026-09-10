"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "TikTok connection was cancelled.",
  connection_failed: "Something went wrong connecting to TikTok. Please try again.",
  not_configured: "TikTok publishing isn't set up yet — contact support.",
  not_found: "That calendar couldn't be found.",
  missing_state: "Something went wrong — please try connecting again.",
};

export default function TikTokConnectionCard({
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
    const errorCode = searchParams.get("tiktokError");
    const connected = searchParams.get("tiktokConnected");
    if (errorCode) setError(ERROR_MESSAGES[errorCode] ?? "Something went wrong connecting to TikTok.");
    if (connected === "true") setJustConnected(true);
    if (errorCode || connected) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tiktokError");
      url.searchParams.delete("tiktokConnected");
      router.replace(url.pathname + url.search, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/tiktok/disconnect`, { method: "POST" });
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">TikTok publishing</p>
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
            TikTok connected successfully.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        )}

        {isConnected ? (
          <>
            <p className="mt-4 text-sm font-medium text-white">{username}</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
              Approved TikTok posts will automatically publish here once their scheduled date arrives.
              {connectedAt && ` Connected ${new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
            </p>
            <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                <span className="font-semibold text-amber-200">While this app awaits TikTok&apos;s content audit:</span> every post publishes as private (visible only to this account) — a TikTok platform restriction, not something this changes.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
            Connect this calendar to a client&apos;s TikTok account — once connected, approved TikTok posts publish automatically on their scheduled date, no manual posting needed.
          </p>
        )}
      </div>

      <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
        {isConnected ? (
          confirming ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] text-[#AAB4C3]">Disconnect this TikTok account? Already-published posts stay published.</p>
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
              Disconnect TikTok
            </button>
          )
        ) : (
          <a
            href={`/api/calendars/${calendarId}/tiktok/connect`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Connect TikTok
          </a>
        )}
      </div>
    </div>
  );
}