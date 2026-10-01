"use client";

import { useEffect, useRef, useState } from "react";
import type { UnifiedInboxConversation } from "@/lib/xChat/inbox";
import type { ChatWithJuicebox, SigningKeyEntry } from "@xdevplatform/chat-xdk";
import { realmToken, releaseChat, withExclusiveUnlock, sendPayload, verifiedMessages, type DisplayMessage } from "@/lib/xChat/browser";

class ChatRequestError extends Error {
  constructor(message: string, public retrySamePayload = true) { super(message); }
}
type Setup = { connectedAt: string; account: { id: string; username: string }; record: { public_key_version: string; public_key: string; juicebox_config: Record<string, unknown> } };
type Conversation = { id: string; participant_ids?: string[]; label?: string; name?: string | null; username?: string | null; updated_at?: string; crmConversationId?: string; leadStatus?: string };
type Events = { data?: { encoded_event: string }[]; meta?: { conversation_key_events?: string[]; next_token?: string }; signingKeys: SigningKeyEntry[] };

export type XChatInboxState = {
  conversations: UnifiedInboxConversation[]; selected: string; busy: boolean; retry: boolean; error: string; notice: string; cursor?: string;
  refresh: () => Promise<void>; older: () => Promise<void>; sendText: (text: string) => Promise<boolean>;
};
export default function XChatInbox({ calendarId, connectionId, activeConversationId, onState }: {
  calendarId: string; connectionId: string; activeConversationId: string;
  onState: (connectionId: string, state: XChatInboxState | null) => void;
}) {
  const base = `/api/calendars/${encodeURIComponent(calendarId)}/inbox/x-chat?connectionId=${encodeURIComponent(connectionId)}`;
  const chat = useRef<ChatWithJuicebox | null>(null);
  const epoch = useRef(0);
  const pin = useRef<HTMLInputElement>(null);
  const pending = useRef<{ conversationId: string; body: ReturnType<typeof sendPayload>; text: string } | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listCursor, setListCursor] = useState<string | undefined>();
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [histories, setHistories] = useState<Record<string, DisplayMessage[]>>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [username, setUsername] = useState("");

  const [retry, setRetry] = useState(false);

  function clearSession() {
    epoch.current++;
    const previous = chat.current; chat.current = null;
    releaseChat(previous);
    if (pin.current) pin.current.value = "";
    pending.current = null;
    setSetup(null); setUnlocked(false); setMessages([]); setHistories({}); setConversations([]); setSelected("");
    setRetry(false); setCursor(undefined); setListCursor(undefined); setBusy(false); setNotice(""); setError("");
  }
  useEffect(() => {
    // Clear keys and plaintext on page exit, logout navigation/unmount, or hidden tab.
    const hidden = () => { if (document.hidden) clearSession(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", clearSession);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", clearSession);
      epoch.current++;
      releaseChat(chat.current); chat.current = null;
      onState(connectionId, null);
    };
    // Component is keyed by workspace and connection in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!unlocked) return;
    const timeout = window.setTimeout(clearSession, 15 * 60_000);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function request<T>(action: string, params: Record<string, string> = {}, body?: unknown): Promise<T> {
    const response = await fetch(`${base}&${new URLSearchParams({ action, ...params })}`, {
      cache: "no-store", method: body === undefined ? "GET" : "POST",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) { clearSession(); setError(result.error || "X Chat session ended."); }
      throw new ChatRequestError(result.error || "X Chat request failed.", result.retrySamePayload !== false);
    }
    return result;
  }
  useEffect(() => {
    if (!unlocked) return;
    const interval = window.setInterval(() => { void request("session").catch(() => {}); }, 30_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);
  async function checkAccess() {
    const version = epoch.current; setBusy(true); setError("");
    try { const result = await request<Setup>("setup"); if (version === epoch.current) setSetup(result); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not check X Chat access."); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function list(version: number, next?: string) {
    const result = await request<{ data?: Conversation[]; meta?: { next_token?: string } }>("sync-leads", next ? { cursor: next } : {}, {});
    if (version !== epoch.current) return;
    const direct = (result.data || []).filter(item => {
      const ids = item.id.split(/[:-]/);
      return ids.length === 2 && new Set(ids).size === 2 && ids.includes(setup!.account.id) && ids.every(id => /^\d+$/.test(id));
    });
    setConversations(current => next ? [...new Map([...current, ...direct].map(item => [item.id, item])).values()] : direct);
    setListCursor(result.meta?.next_token);
    window.dispatchEvent(new Event("showwork-inbox-leads-updated"));
    if (!direct.length && !next) setNotice("No one-to-one chats in this page. Try the sender's username or load more conversations.");
  }
  async function unlock(event: React.FormEvent) {
    event.preventDefault(); if (!setup || busy || !pin.current?.value) return;
    const version = epoch.current;
    const bytes = new TextEncoder().encode(pin.current.value); pin.current.value = "";
    let instance: ChatWithJuicebox | null = null;
    let remainingGuesses: (error: unknown) => number | null = () => null;
    setBusy(true); setError(""); setNotice("");
    try {
      await withExclusiveUnlock(async () => {
        const sdk = await import("@xdevplatform/chat-xdk");
        remainingGuesses = sdk.guessesRemaining;
        instance = await sdk.createChat({ juiceboxConfig: JSON.stringify(setup.record.juicebox_config), getAuthToken: async realm => realmToken(setup.record.juicebox_config, realm) });
        if (version !== epoch.current) return;
        await instance.unlock(bytes);
        if (version !== epoch.current) return;
        if (!instance.matchesRegisteredKey(setup.record.public_key)) throw new Error("Recovered keys do not match this X identity.");
        instance.setIdentity(setup.account.id, setup.record.public_key_version);
        instance.setRejectUnverified(true); instance.setCacheKeys(true);
        chat.current = instance; instance = null; setUnlocked(true);
      });
      if (version === epoch.current) {
        try { await list(version); }
        catch (err) {
          if (version === epoch.current) setError(`X Chat unlocked, but conversations could not load. ${err instanceof ChatRequestError ? err.message : "Please retry loading conversations."}`);
        }
      }
    } catch (err) {
      // Never echo arbitrary SDK errors or backup responses into telemetry/UI.
      if (version === epoch.current) {
        const remaining = remainingGuesses(err);
        setError(remaining !== null ? `Incorrect PIN. ${remaining} attempts remain. Do not keep guessing.` : "X Chat could not unlock. Check the PIN, Chat API access, and key-backup availability. No keys were changed.");
      }
    } finally { bytes.fill(0); releaseChat(instance); if (version === epoch.current) setBusy(false); }
  }
  const participant = (id: string) => id.split(/[:-]/).find(value => value !== setup?.account.id) || id;
  async function loadMessages(id: string, next?: string) {
    const instance = chat.current; if (!instance || !setup || busy) return;
    const version = epoch.current; setBusy(true); setError(""); setNotice("");
    if (id !== selected) { setMessages([]); setCursor(undefined); pending.current = null; setRetry(false); }
    setSelected(id);
    try {
      const result = await request<Events>("events", { conversationId: id, ...(next ? { cursor: next } : {}) });
      if (version !== epoch.current) return;
      instance.setSigningKeys(result.signingKeys);
      const decrypted = instance.decryptEvents([...(result.meta?.conversation_key_events || []), ...(result.data || []).map(item => item.encoded_event)]);
      const display = verifiedMessages(decrypted.messages.map(item => item.event), setup.account.id, participant(id), setup.connectedAt);
      setMessages(current => [...new Map([...(next ? current : []), ...display].map(item => [item.id, item])).values()].sort((a, b) => a.time - b.time));
      setHistories(current => ({ ...current, [id]: [...new Map([...(next ? current[id] || [] : []), ...display].map(item => [item.id, item])).values()].sort((a, b) => a.time - b.time) }));
      setCursor(result.meta?.next_token);
      const failures = Object.keys(decrypted.errors).length;
      setNotice(failures ? `${failures} events could not be verified or decrypted. No unverified text is shown.` : !display.length ? "No verified text messages since this X channel was connected. Attachments and group chats are not supported here yet." : "Messages decrypted on this device.");
    } catch (err) { if (version === epoch.current) setError(err instanceof Error ? err.message : "Could not read this chat."); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function findConversation(event: React.FormEvent) {
    event.preventDefault(); if (busy || !setup) return;
    const version = epoch.current; setBusy(true); setError("");
    try {
      const result = await request<{ participant: { id: string; username: string; name?: string } }>("resolve", { username });
      if (version !== epoch.current) return;
      const item = { id: `${setup.account.id}-${result.participant.id}`, username: result.participant.username, name: result.participant.name };
      setConversations(current => [item, ...current.filter(existing => participant(existing.id) !== result.participant.id)]);
      setNotice("Select the conversation below to decrypt its messages.");
    } catch (err) { if (version === epoch.current) setError(err instanceof Error ? err.message : "Could not find this account."); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  async function sendText(text: string): Promise<boolean> {
    if (!chat.current || !selected || selected !== activeConversationId || busy || (!text.trim() && !pending.current)) return false;
    const version = epoch.current; setBusy(true); setError(""); setNotice("");
    try {
      if (!pending.current) pending.current = { conversationId: selected, text: text.trim(), body: sendPayload(chat.current.encryptMessage({ conversationId: selected, text: text.trim() })) };
      const outgoing = pending.current;
      await request("send", { conversationId: outgoing.conversationId }, outgoing.body);
      if (version !== epoch.current) return false;
      // Add only after X accepts the encrypted request; retain plaintext only
      // in this unlocked browser session, just like decrypted history.
      const sent: DisplayMessage = { id: outgoing.body.message_id, senderId: setup!.account.id, text: outgoing.text, time: Date.now() };
      setMessages(current => [...current.filter(item => item.id !== sent.id), sent]);
      setHistories(current => ({ ...current, [selected]: [...(current[selected] || []).filter(item => item.id !== sent.id), sent] }));
      pending.current = null; setRetry(false); setNotice("Reply sent.");
      return true;
    } catch (err) {
      if (version === epoch.current) {
        const encrypted = !!pending.current;
        if (err instanceof ChatRequestError && !err.retrySamePayload) pending.current = null;
        setRetry(!!pending.current);
        // Never expose arbitrary SDK errors or key material.
        const detail = err instanceof ChatRequestError ? err.message : encrypted
          ? "Delivery could not be confirmed. Check your connection."
          : "This chat has no usable encryption key for sending. Refresh messages to load its latest keys, then try again.";
        setError(`${detail}${pending.current ? " Retry reply reuses the same message ID." : ""}`);
      }
    } finally { if (version === epoch.current) setBusy(false); }
    return false;
  }
  useEffect(() => {
    if (activeConversationId && activeConversationId !== selected && unlocked && !busy) void loadMessages(activeConversationId);
    // Selection comes from the shared inbox list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, selected, unlocked, busy]);
  useEffect(() => {
    const rows: UnifiedInboxConversation[] = !unlocked || !setup ? [] : conversations.map(item => {
      const history = histories[item.id] || [];
      const latest = history.at(-1);
      return {
        id: item.crmConversationId || `xchat:${connectionId}:${item.id}`, platform: "X", participantPlatformId: participant(item.id),
        participantName: item.name || null, participantUsername: item.username || null, leadStatus: item.leadStatus || "", unreadCount: 0,
        lastMessageAt: latest?.time ? new Date(latest.time).toISOString() : item.updated_at || null,
        lastMessagePreview: latest?.text || "Encrypted conversation",
        connection: { id: connectionId, username: setup.account.username, accountName: null, status: "CONNECTED" },
        messages: history.map(message => ({ id: message.id, direction: message.senderId === setup.account.id ? "OUTBOUND" as const : "INBOUND" as const, status: "SENT", text: message.text, platformCreatedAt: new Date(message.time || 0).toISOString(), isAiGenerated: false })),
        encrypted: { connectionId, conversationId: item.id },
      };
    });
    onState(connectionId, { conversations: rows, selected, busy, retry, error, notice, cursor,
      refresh: () => loadMessages(selected), older: () => loadMessages(selected, cursor), sendText });
    // Keep ephemeral messages in the shared inbox only for this unlocked session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, messages, histories, selected, busy, retry, error, notice, cursor, unlocked, setup, activeConversationId, onState, connectionId]);
  return <div className="shrink-0 space-y-2 border-b border-[#E9EDF3] p-3">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#344054]">X{setup ? ` · @${setup.account.username}` : " messages"}</span>{setup && <button type="button" onClick={clearSession} className="text-[10px] text-blue-700">Lock</button>}</div>
    {!setup && <button type="button" disabled={busy} onClick={() => void checkAccess()} className="rounded-lg bg-[#1768E8] px-3 py-2 text-xs text-white disabled:opacity-50">{busy ? "Checking…" : "Unlock X messages"}</button>}
    {setup && !unlocked && <form onSubmit={unlock} className="flex gap-2"><input ref={pin} type="password" aria-label="X Chat PIN" autoComplete="off" placeholder="Existing X Chat PIN" disabled={busy} className="min-w-0 flex-1 rounded-lg border border-[#D0D5DD] p-2 text-xs" /><button disabled={busy} className="rounded-lg bg-[#1768E8] px-3 py-2 text-xs text-white disabled:opacity-50">{busy ? "Unlocking…" : "Unlock"}</button></form>}
    {!unlocked && <p className="text-[10px] text-[#667085]">Your PIN stays on this device. Unlock to view X chats in this inbox.</p>}
    {error && !activeConversationId && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {notice && !activeConversationId && <p role="status" className="text-[10px] text-[#667085]">{notice}</p>}
    {unlocked && <>
      <button type="button" disabled={busy} onClick={async () => {
        const version = epoch.current; setBusy(true); setError(""); setNotice("");
        try { await list(version); }
        catch (err) { if (version === epoch.current) setError(err instanceof ChatRequestError ? err.message : "Could not load conversations. Please retry."); }
        finally { if (version === epoch.current) setBusy(false); }
      }} className="text-[10px] text-blue-700">{busy ? "Loading conversations…" : "Refresh X conversations"}</button>
      <form onSubmit={findConversation} className="flex gap-2"><input aria-label="X Chat sender username" placeholder="Find X @username" value={username} onChange={e => setUsername(e.target.value)} disabled={busy} className="min-w-0 flex-1 rounded-lg border border-[#D0D5DD] p-2 text-xs" /><button disabled={busy} className="text-xs text-blue-700">Find</button></form>
      {listCursor && <button type="button" disabled={busy} onClick={async () => { const version = epoch.current; setBusy(true); try { await list(version, listCursor); } catch { if (version === epoch.current) setError("Could not load more conversations."); } finally { if (version === epoch.current) setBusy(false); } }} className="text-[10px] text-blue-700">Load more X conversations</button>}
    </>}
  </div>;
}
