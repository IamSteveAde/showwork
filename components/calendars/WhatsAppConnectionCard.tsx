"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";

type Connection = { id: string; accountName: string | null; username: string | null; status: string; connectedAt: string;
  platformAccountId: string; whatsappBusinessAccountId: string | null; messagingWebhookError: string | null; accessTokenExpiresAt: string | null };

export default function WhatsAppConnectionCard({ calendarId, isManager }: { calendarId: string; isManager: boolean }) {
  const endpoint = `/api/calendars/${encodeURIComponent(calendarId)}/channels/whatsapp`;
  const [connection, setConnection] = useState<Connection | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load WhatsApp connection.");
      setConfigured(data.configured);
      setConnection(data.connection);
      setBusinessAccountId(data.connection?.whatsappBusinessAccountId || "");
      setPhoneNumberId(data.connection?.platformAccountId || "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load WhatsApp."); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessAccountId, phoneNumberId, accessToken }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect WhatsApp.");
      setConnection(data.connection); setEditing(false);
      setNotice("WhatsApp connected. New conversations appear in Inbox and create leads. Enable AI replies in Inbox settings.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect WhatsApp."); }
    finally { setBusy(false); setAccessToken(""); }
  }
  async function disconnect() {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not disconnect WhatsApp.");
      setConnection(null); setConfirming(false); setEditing(false); setAccessToken("");
      setBusinessAccountId(""); setPhoneNumberId("");
      setNotice("WhatsApp disconnected. Existing conversations and leads are preserved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect WhatsApp."); }
    finally { setBusy(false); }
  }
  const inputClass = "mt-1 w-full rounded-lg border border-[#334155] bg-[#101828] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400";
  const expired = !!connection?.accessTokenExpiresAt && Date.parse(connection.accessTokenExpiresAt) <= Date.now();
  const connected = connection?.status === "CONNECTED" && !expired;
  return <section className="w-full min-w-0 overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#128C7E] text-white"><MessageCircle className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-white">WhatsApp Business</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#718096]">Messaging · Leads · AI replies</p></div></div>
        {connection && <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${connected ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{connected ? "Connected" : "Reconnect"}</span>}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-[#AAB4C3]">Receive WhatsApp enquiries in your inbox, capture leads, and reply manually or with AI using your business knowledge. Customer messages open a 24-hour reply window.</p>
      {connection && <div className="mt-4"><p className="text-sm font-medium text-white">{connection.accountName}</p><p className="mt-1 text-xs text-[#AAB4C3]">{connection.username}</p></div>}
      {connection?.messagingWebhookError && <p className="mt-3 text-xs text-amber-300">{connection.messagingWebhookError}</p>}
      {expired && <p className="mt-3 text-xs text-amber-300">The access token has expired. Update the connection to resume replies.</p>}
      {error && <p role="alert" className="mt-3 text-xs leading-5 text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs leading-5 text-emerald-300">{notice}</p>}
      {!loading && !configured && <p className="mt-3 text-xs leading-5 text-amber-300">Ask your administrator to configure the WhatsApp app and messaging webhook before connecting.</p>}
    </div>
    <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
      {loading ? <p className="text-xs text-[#AAB4C3]">Loading WhatsApp…</p> : !isManager ? <p className="text-xs text-[#718096]">Only the workspace owner can manage this connection.</p> : editing ?
        <form onSubmit={connect} className="space-y-3">
          <p className="text-[11px] leading-5 text-[#AAB4C3]">Use a registered Cloud API number and a system-user access token from your Meta app. Find the IDs in WhatsApp → API Setup in Meta.</p>
          <label className="block text-xs text-[#AAB4C3]">WhatsApp Business Account ID<input required inputMode="numeric" pattern="[0-9]{5,30}" value={businessAccountId} onChange={e => setBusinessAccountId(e.target.value)} disabled={busy} className={inputClass} /></label>
          <label className="block text-xs text-[#AAB4C3]">Phone Number ID<input required inputMode="numeric" pattern="[0-9]{5,30}" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} disabled={busy} className={inputClass} /></label>
          <label className="block text-xs text-[#AAB4C3]">Access token<input required type="password" autoComplete="new-password" maxLength={4096} value={accessToken} onChange={e => setAccessToken(e.target.value)} disabled={busy} className={inputClass} /></label>
          <div className="flex gap-2"><button disabled={busy || !configured} className="rounded-lg bg-[#128C7E] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Connecting…" : "Save connection"}</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setAccessToken(""); }} className="rounded-lg border border-[#334155] px-3 py-2 text-xs text-[#AAB4C3]">Cancel</button></div>
        </form> : confirming ? <div><p className="mb-3 text-xs text-[#AAB4C3]">Disconnect WhatsApp? Incoming messages and AI replies will stop. Existing leads and history stay available.</p><div className="flex gap-2"><button disabled={busy} onClick={() => void disconnect()} className="rounded-lg bg-red-500 px-3 py-2 text-xs text-white">{busy ? "Disconnecting…" : "Disconnect"}</button><button disabled={busy} onClick={() => setConfirming(false)} className="rounded-lg border border-[#334155] px-3 py-2 text-xs text-[#AAB4C3]">Keep connected</button></div></div>
        : <div className="flex flex-wrap gap-2"><button disabled={!configured} onClick={() => setEditing(true)} className="rounded-lg bg-[#128C7E] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{connection ? "Update connection" : "Connect WhatsApp"}</button>{connection && <><button onClick={() => window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "inbox" } }))} className="rounded-lg border border-[#334155] px-3 py-2 text-xs text-[#AAB4C3]">Open inbox</button><button onClick={() => setConfirming(true)} className="rounded-lg border border-[#334155] px-3 py-2 text-xs text-[#AAB4C3]">Disconnect</button></>}</div>}
      {!loading && error && !connection && !editing && <button onClick={() => void load()} className="mt-3 text-xs text-blue-300 underline">Retry loading</button>}
    </div>
  </section>;
}
