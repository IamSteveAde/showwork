"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type AdditionalChannel = "facebook" | "linkedin" | "x";

const CHANNEL_META: Record<AdditionalChannel, { name: string; mark: string; color: string; accountType: string }> = {
  facebook: { name: "Facebook", mark: "f", color: "#1877F2", accountType: "Facebook Page" },
  linkedin: { name: "LinkedIn", mark: "in", color: "#0A66C2", accountType: "member profile" },
  x: { name: "X", mark: "𝕏", color: "#000000", accountType: "X account" },
};

const ERROR_MESSAGES: Record<string, string> = {
  denied: "The connection was cancelled.",
  not_configured: "This channel is not configured yet. Ask an administrator to finish its developer app setup.",
  not_found: "This workspace could not be found or you do not own it.",
  missing_state: "The secure connection session expired. Please try connecting again.",
  no_page: "No Facebook Page was available to connect. Make sure the account manages a Page and try again.",
  connection_failed: "The account could not be connected. Check the channel permissions and try again.",
};

export default function AdditionalChannelCard({
  channel,
  calendarId,
  accountName,
  connectedAt,
  isManager,
}: {
  channel: AdditionalChannel;
  calendarId: string;
  accountName: string | null;
  connectedAt: string | null;
  isManager: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meta = CHANNEL_META[channel];
  const [connectedAccount, setConnectedAccount] = useState(accountName);
  const [connectedDate, setConnectedDate] = useState(connectedAt);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get(`${channel}Connected`);
    const errorCode = searchParams.get(`${channel}Error`);
    if (success === "true") setJustConnected(true);
    if (errorCode) setError(ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.connection_failed);
    if (success || errorCode) {
      const url = new URL(window.location.href);
      url.searchParams.delete(`${channel}Connected`);
      url.searchParams.delete(`${channel}Error`);
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }
    // The callback is a full OAuth navigation; process its result once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendars/${calendarId}/channels/${channel}/disconnect`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Could not disconnect ${meta.name}.`);
      setConnectedAccount(null);
      setConnectedDate(null);
      setConfirming(false);
      setJustConnected(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not disconnect ${meta.name}.`);
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = !!connectedAccount;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: meta.color }}>
              {meta.mark}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">{meta.name} connection</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">
                Connect a {meta.accountType}
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
            {meta.name} account connected successfully.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] leading-5 text-red-300">
            {error}
          </p>
        )}

        {isConnected ? (
          <>
            <p className="mt-4 truncate text-sm font-medium text-white">{channel === "x" ? "@" : ""}{connectedAccount}</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
              This {meta.accountType} is linked to the workspace.
              {connectedDate && ` Connected ${new Date(connectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
            </p>
          </>
        ) : (
          <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
            Connect the {meta.accountType} used for this client&apos;s {meta.name} content.
          </p>
        )}
      </div>

      <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
        {!isManager ? (
          <p className="text-[10px] leading-5 text-[#718096]">Only the workspace owner can connect or disconnect social accounts.</p>
        ) : isConnected ? (
          confirming ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] text-[#AAB4C3]">Disconnect this {meta.accountType}?</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={disconnect} disabled={disconnecting} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={disconnecting} className="rounded-lg border border-[#334155] px-3 py-2 text-xs font-semibold text-[#AAB4C3]">
                  Keep connected
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-lg border border-[#334155] px-3 py-2 text-xs font-semibold text-[#AAB4C3] transition hover:border-red-400/30 hover:text-red-300">
              Disconnect {meta.name}
            </button>
          )
        ) : (
          <a href={`/api/calendars/${calendarId}/channels/${channel}/connect`} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: meta.color }}>
            Connect {meta.name}<span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </section>
  );
}
