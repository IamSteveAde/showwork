"use client";

import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";
import UiSymbol from "@/components/ui/UiSymbol";
import CustomerCareSettings from "./CustomerCareSettings";
import ReplyDraftAssistant from "./ReplyDraftAssistant";
import { normalizeReplyProfile, type ReplyProfile } from "@/lib/socialMessaging/replyProfile";
import XChatInbox, { type XChatInboxState } from "./XChatInbox";
import { mergeInboxConversations, type UnifiedInboxConversation } from "@/lib/xChat/inbox";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, Check, Inbox, MessageSquareText, RefreshCw, Search, Send, Settings2, Sparkles, UserRound, Users } from "lucide-react";

const PLATFORMS: Record<string, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", LINKEDIN: "LinkedIn", X: "X", YOUTUBE: "YouTube", WHATSAPP: "WhatsApp" };
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CUSTOMER", "NOT_A_LEAD"] as const;
type InboxMessage = { id: string; direction: "INBOUND" | "OUTBOUND"; status: string; text: string; platformCreatedAt: string; isAiGenerated: boolean; autoReplyHandoffReason?: string | null; sendError?: string | null };
type Conversation = UnifiedInboxConversation;
type InboxData = {
  summary: { leads: number; newMessages: number; messagesThisMonth: number; allMessages: number };
  accounts: Array<{ id: string; platform: string; accountName: string | null; username: string | null; status: string; messagingAvailable: boolean; messagingNote: string }>;
  settings: { clientAccessEnabled: boolean; aiAutoReplyEnabled: boolean; aiAutoReplyInstructions: string | null; aiReplyProfile: ReplyProfile };
  conversations: Conversation[];
};

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function SocialLeadInbox({ calendarId, slug, clientMode = false, isManager = false, canReplyFromWorkspace = false, inboxAccess = true, autoRepliesAccess = true }: { calendarId?: string; slug?: string; clientMode?: boolean; isManager?: boolean; canReplyFromWorkspace?: boolean; inboxAccess?: boolean; autoRepliesAccess?: boolean }) {
  const [xChats, setXChats] = useState<Record<string, XChatInboxState>>({});
  const updateXChat = useCallback((connectionId: string, state: XChatInboxState | null) => {
    setXChats(current => {
      if (state) return { ...current, [connectionId]: state };
      if (!current[connectionId]) return current;
      const next = { ...current }; delete next[connectionId]; return next;
    });
  }, []);
  const [data, setData] = useState<InboxData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [replyGuidance, setReplyGuidance] = useState("");
  const [replyProfile, setReplyProfile] = useState<ReplyProfile>(() => normalizeReplyProfile(null));
  const settingsDirty = useRef(false);
  useEffect(() => { settingsDirty.current = false; }, [calendarId]);
  const endpoint = clientMode ? `/api/social-calendar/${encodeURIComponent(slug || "")}/inbox` : `/api/calendars/${encodeURIComponent(calendarId || "")}/inbox`;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (platform) query.set("platform", platform);
      if (status) query.set("status", status);
      if (search.trim()) query.set("q", search.trim());
      if (unreadOnly) query.set("unread", "true");
      const response = await fetch(`${endpoint}?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load the inbox.");
      setData(result);
      if (!settingsDirty.current) {
        setReplyGuidance(result.settings.aiAutoReplyInstructions || "");
        setReplyProfile(normalizeReplyProfile(result.settings.aiReplyProfile));
      }
      setSelectedId(current => (quiet && !!current) || current.startsWith("xchat:") || result.conversations.some((item: Conversation) => item.id === current) ? current : result.conversations[0]?.id || "");
      if (!quiet) setError("");
    } catch (err) { if (!quiet) setError(err instanceof Error ? err.message : "Could not load the inbox."); }
    finally { if (!quiet) setLoading(false); }
  }, [endpoint, platform, status, search, unreadOnly]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener("showwork-inbox-leads-updated", refresh);
    return () => window.removeEventListener("showwork-inbox-leads-updated", refresh);
  }, [load]);
  useEffect(() => { const timer = window.setInterval(() => void load(true), 30000); return () => window.clearInterval(timer); }, [load]);
  const conversations = useMemo(() => mergeInboxConversations(data?.conversations || [],
    Object.entries(xChats).filter(([id]) => data?.accounts.some(account => account.id === id && account.status === "CONNECTED")).flatMap(([, state]) => state.conversations),
    { platform, status, search, unreadOnly }), [data, xChats, platform, status, search, unreadOnly]);
  const selected = conversations.find(item => item.id === selectedId) ?? null;
  const selectedX = selected?.encrypted ? xChats[selected.encrypted.connectionId] : undefined;
  useEffect(() => { setDraft(""); }, [selected?.id]);


  async function markRead(conversation: Conversation) {
    if (conversation.encrypted || !inboxAccess || clientMode || !calendarId || conversation.unreadCount === 0) return;
    await fetch(`${endpoint}/${encodeURIComponent(conversation.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markRead: true }) });
    void load(true);
  }

  async function updateLeadStatus(value: string) {
    if (!inboxAccess || !calendarId || !selected || selected.id.startsWith("xchat:")) return;
    const response = await fetch(`${endpoint}/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadStatus: value }) });
    if (!response.ok) { const result = await response.json().catch(() => ({})); setError(result.error || "Could not update lead status."); return; }
    void load(true);
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!calendarId || !selected || (!draft.trim() && !selectedX?.retry)) return;
    if (selected.encrypted && selectedX) {
      if (await selectedX.sendText(draft)) setDraft("");
      return;
    }
    setSending(true); setError("");
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(selected.id)}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send reply.");
      setDraft(""); setSuccess("Reply sent to the platform.");
      await load(true);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send reply."); }
    finally { setSending(false); }
  }

  async function saveSettings(patch: Partial<InboxData["settings"]>) {
    if (!inboxAccess || !calendarId || !data) return;
    setSavingSettings(true); setError("");
    const settings = { ...data.settings, ...patch, aiAutoReplyInstructions: replyGuidance, aiReplyProfile: replyProfile };
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/inbox/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save inbox settings.");
      settingsDirty.current = false;
      setData(current => current ? { ...current, settings: result } : current); setSuccess("Inbox settings saved.");
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save inbox settings."); }
    finally { setSavingSettings(false); }
  }

  const whatsappWindowClosed = selected?.platform === "WHATSAPP" && (!selected.replyWindowExpiresAt || Date.parse(selected.replyWindowExpiresAt) <= Date.now());
  const canReply = selected?.encrypted ? inboxAccess && !!selectedX && selectedX.selected === selected.encrypted.conversationId && !clientMode && isManager : !clientMode && canReplyFromWorkspace && selected && !whatsappWindowClosed && ["FACEBOOK", "INSTAGRAM", "X", "LINKEDIN", "TIKTOK", "WHATSAPP"].includes(selected.platform) && selected.connection?.status === "CONNECTED" && data?.accounts.some(account => account.platform === selected.platform && (!selected.connection?.id || account.id === selected.connection.id) && account.messagingAvailable);
  const monthName = new Date().toLocaleString(undefined, { month: "long" });

  return <section className="space-y-5" aria-label="Social leads inbox">
    {!clientMode && !inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}
    <header className="relative overflow-hidden rounded-2xl bg-[#101828] p-5 text-white shadow-[0_16px_44px_rgba(16,24,40,.12)] sm:p-7"><div className="pointer-events-none absolute -right-10 -top-20 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.13em] text-blue-100"><Inbox className="h-3.5 w-3.5" /> Unified social inbox</div><h2 className="mt-4 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Inbox</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Keep social conversations together, track every enquiry as a lead, and reply from the workspace.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-[#101828] disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh inbox</button></div></header>


    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}{success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><Check className="h-4 w-4" />{success}</div>}

    {data && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Stat icon={Users} label="Leads" value={data.summary.leads} detail="Conversations, excluding not a lead" /><Stat icon={MessageSquareText} label="New messages" value={data.summary.newMessages} detail="Unread inbound messages" accent /><Stat icon={Inbox} label={`Messages in ${monthName}`} value={data.summary.messagesThisMonth} detail={`${data.summary.allMessages.toLocaleString()} messages all time`} /></div>

      {isManager && <div className="grid gap-4 xl:grid-cols-2"><div className="rounded-xl border border-[#DFE6EF] bg-white p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-[#101828]">Client visibility</h3>{!inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}<p className="mt-1 text-xs leading-5 text-[#667085]">Let clients review social leads and message history in their portal.</p></div><input aria-label="Allow client inbox access" type="checkbox" checked={data.settings.clientAccessEnabled} disabled={savingSettings || !inboxAccess} onChange={event => void saveSettings({ clientAccessEnabled: event.target.checked })} className="mt-1 h-4 w-4 accent-[#1768E8]" /></div></div><div className="rounded-xl border border-[#DFE6EF] bg-white p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-semibold text-[#101828]">AI customer care</h3></div><p className="mt-1 text-xs leading-5 text-[#667085]">Prepare replies with your business facts, or turn on automatic replies when your playbook is ready.</p></div><input aria-label="Enable AI automatic replies" type="checkbox" checked={data.settings.aiAutoReplyEnabled} disabled={savingSettings || !inboxAccess || !autoRepliesAccess} onChange={event => void saveSettings({ aiAutoReplyEnabled: event.target.checked })} className="mt-1 h-4 w-4 accent-[#1768E8]" /></div>{!autoRepliesAccess && <WorkspaceFeatureNotice compact feature="aiAutoReplies" />}<CustomerCareSettings profile={replyProfile} guidance={replyGuidance} saving={savingSettings || !inboxAccess} onProfileChange={profile => { settingsDirty.current = true; setReplyProfile(profile); }} onGuidanceChange={value => { settingsDirty.current = true; setReplyGuidance(value); }} onSave={() => void saveSettings({})} /><p className="mt-3 text-[10px] leading-4 text-[#667085]">Automatic replies hand sensitive or uncertain requests to your team. Encrypted X chats stay outside AI drafting.</p></div></div>}

      <div className="grid gap-4 rounded-2xl border border-[#DFE6EF] bg-white p-3 shadow-[0_5px_20px_rgba(16,24,40,.035)] lg:grid-cols-[350px_minmax(0,1fr)] lg:p-4">
        <div className="flex h-[420px] min-h-0 flex-col overflow-hidden lg:h-[min(72dvh,760px)] rounded-xl border border-[#E9EDF3] bg-[#FAFBFD]">
          <div className="shrink-0 space-y-3 border-b border-[#E9EDF3] p-3"><label className="relative block"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people or messages" className="w-full rounded-lg border border-[#E3E8EF] bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></label><div className="grid grid-cols-2 gap-2"><select aria-label="Filter by platform" value={platform} onChange={event => setPlatform(event.target.value)} className="rounded-lg border border-[#E3E8EF] bg-white px-2 py-2 text-[11px]"><option value="">All platforms</option>{Object.entries(PLATFORMS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><select aria-label="Filter by lead status" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-[#E3E8EF] bg-white px-2 py-2 text-[11px]"><option value="">All lead statuses</option>{STATUSES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><button type="button" onClick={() => setUnreadOnly(value => !value)} className={`w-full rounded-lg px-3 py-2 text-left text-[10px] font-semibold ${unreadOnly ? "bg-blue-50 text-blue-700" : "text-[#667085] hover:bg-white"}`}>{unreadOnly ? <><UiSymbol name="check" />{" Showing unread only"}</> : "Show unread only"}</button></div>
          {!clientMode && isManager && calendarId && data.accounts.filter(account => account.platform === "X" && account.status === "CONNECTED").map(account => <XChatInbox key={`${calendarId}:${account.id}`} calendarId={calendarId} connectionId={account.id} activeConversationId={selected?.encrypted?.connectionId === account.id ? selected.encrypted.conversationId : ""} onState={updateXChat} />)}
          <div aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{conversations.length ? conversations.map(conversation => <button type="button" key={conversation.id} disabled={!!selectedX?.busy || (!!selectedX?.retry && conversation.id !== selectedId)} onClick={() => { setSelectedId(conversation.id); void markRead(conversation); }} className={`w-full border-b border-[#EEF1F5] p-3 text-left transition hover:bg-white ${selectedId === conversation.id ? "bg-white shadow-[inset_3px_0_0_#1768E8]" : ""}`}><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><UserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#101828]">{conversation.participantName || conversation.participantUsername || `${PLATFORMS[conversation.platform]} contact`}</p><p className="truncate text-[9px] text-[#667085]">{PLATFORMS[conversation.platform]}{conversation.participantUsername ? ` · ${conversation.platform === "WHATSAPP" ? "" : "@"}${conversation.participantUsername}` : ""}</p></div></div>{conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1768E8] px-1.5 text-[9px] font-bold text-white">{conversation.unreadCount}</span>}</div><p className="mt-2 line-clamp-2 pl-10 text-[10px] leading-4 text-[#667085]">{conversation.lastMessagePreview || "New social conversation"}</p><div className="mt-2 flex items-center justify-between pl-10"><span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-[#667085] ring-1 ring-[#E3E8EF]">{conversation.leadStatus ? conversation.leadStatus.replaceAll("_", " ") : "Encrypted"}</span><span className="text-[9px] text-[#98A2B3]">{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : ""}</span></div></button>) : <div className="px-5 py-12 text-center"><Inbox className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-xs font-semibold text-[#344054]">No conversations found</p><p className="mt-1 text-[10px] leading-4 text-[#667085]">WhatsApp and Meta messages arrive through webhooks. Unlock X to view messages sent since the channel was connected.</p></div>}</div>
        </div>

        <div className="flex h-[min(80dvh,760px)] min-h-0 min-w-0 flex-col overflow-hidden lg:h-[min(72dvh,760px)] rounded-xl border border-[#E9EDF3] bg-white">{selected ? <><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E9EDF3] p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF5FF] text-[#1768E8]"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#101828]">{selected.participantName || selected.participantUsername || "Social contact"}</p><p className="mt-0.5 text-[10px] text-[#667085]">{PLATFORMS[selected.platform]}{selected.participantUsername ? ` · ${selected.platform === "WHATSAPP" ? "" : "@"}${selected.participantUsername}` : ""}{selected.connection?.username ? ` · Connected as ${selected.platform === "WHATSAPP" ? "" : "@"}${selected.connection.username}` : selected.connection?.accountName ? ` · ${selected.connection.accountName}` : ""}</p></div></div>{!selected.id.startsWith("xchat:") && <select aria-label="Update lead status" value={selected.leadStatus} disabled={!inboxAccess || clientMode} onChange={event => void updateLeadStatus(event.target.value)} className="rounded-lg border border-[#D0D5DD] bg-white px-2.5 py-2 text-[10px] font-semibold text-[#344054] disabled:opacity-70">{STATUSES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>}</header>{selectedX && <div className="shrink-0 space-y-2 border-b border-[#E9EDF3] px-4 py-2"><div className="flex gap-3"><button type="button" disabled={selectedX.busy} onClick={() => void selectedX.refresh()} className="text-[10px] text-blue-700">Refresh messages</button>{selectedX.cursor && <button type="button" disabled={selectedX.busy} onClick={() => void selectedX.older()} className="text-[10px] text-blue-700">Load older messages</button>}</div>{selectedX.error && <p role="alert" className="text-xs text-red-700">{selectedX.error}</p>}{selectedX.notice && <p role="status" className="text-[10px] text-[#667085]">{selectedX.notice}</p>}</div>}<div aria-label="Message history" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#FAFBFD] p-4">{selected.messages.map(message => <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${message.direction === "OUTBOUND" ? "rounded-br-md bg-[#1768E8] text-white" : "rounded-bl-md border border-[#E8EDF3] bg-white text-[#344054]"}`}><p className="whitespace-pre-wrap text-xs leading-5">{message.text}</p><div className={`mt-1.5 flex items-center justify-end gap-2 text-[8px] ${message.direction === "OUTBOUND" ? "text-blue-100" : "text-[#98A2B3]"}`}><span>{message.direction === "OUTBOUND" ? `${message.isAiGenerated ? "AI · " : ""}${message.status === "READ" ? "Read" : message.status === "DELIVERED" ? "Delivered" : message.status === "FAILED" ? "Failed" : "Sent"}` : "Received"}</span><time>{new Date(message.platformCreatedAt).toLocaleString()}</time></div>{message.autoReplyHandoffReason && <p className="mt-1 text-[9px] text-amber-700">{message.autoReplyHandoffReason}</p>}{message.sendError && <p className="mt-1 text-[9px] text-rose-600">{message.sendError}</p>}</div></div>)}</div>{!clientMode ? <form onSubmit={sendReply} className="shrink-0 border-t border-[#E9EDF3] p-3">{!inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}{!selected.encrypted && <ReplyDraftAssistant endpoint={endpoint} conversationId={selected.id} defaultTone={normalizeReplyProfile(data.settings.aiReplyProfile).tone} currentDraft={draft} latestInboundId={[...selected.messages].reverse().find(message => message.direction === "INBOUND")?.id} onUseDraft={setDraft} locked={!inboxAccess} />}<div className="flex items-end gap-2"><textarea value={draft} onChange={event => setDraft(event.target.value)} rows={2} disabled={!canReply || !!selectedX?.retry || !!selectedX?.busy} maxLength={2000} placeholder="Write a reply that will be sent to the connected platform…" className="min-h-11 max-h-32 min-w-0 flex-1 resize-y rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-xs outline-none focus:border-blue-400" /><button type="submit" disabled={!canReply || sending || !!selectedX?.busy || (!draft.trim() && !selectedX?.retry)} className="flex h-10 items-center gap-2 rounded-xl bg-[#1768E8] px-3.5 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />{sending || selectedX?.busy ? "Sending" : selectedX?.retry ? "Retry reply" : "Reply"}</button></div><p className="mt-1.5 text-[9px] text-[#98A2B3]">{selected.encrypted ? "Encrypted on this device. Message text is not saved to shared CRM history or used for AI replies." : "Replies are sent using the connected account and follow the platform’s messaging window and policies."}</p></form> : <div className="shrink-0 border-t border-[#E9EDF3] bg-[#FAFBFD] p-3 text-[10px] leading-4 text-[#667085]">{clientMode ? "This client portal is read-only. Ask the workspace manager to reply." : selected.encrypted ? (!isManager ? "Ask the workspace owner to unlock X and reply." : selectedX?.busy ? "Loading this X conversation…" : "Unlock X messages with your X Chat PIN to read and reply.") : whatsappWindowClosed ? "WhatsApp’s 24-hour reply window has closed. Wait for a new customer message to reply." : "Replying is unavailable until this platform grants and is configured for messaging access."}</div>}</> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageSquareText className="h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-semibold text-[#344054]">Select a conversation</h3><p className="mt-1 max-w-sm text-xs leading-5 text-[#667085]">Choose a lead on the left to review its message history.</p></div>}</div>
      </div>

      <div className="rounded-xl border border-[#DFE6EF] bg-white p-4"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-[#667085]" /><h3 className="text-sm font-semibold text-[#101828]">Channel messaging access</h3></div><p className="mt-1 text-xs leading-5 text-[#667085]">Meta DMs need approved messaging permissions, a connected Page/account subscription, and the app-level callback at <span className="font-mono text-[#344054]">/api/webhooks/meta/messaging</span> with message events enabled.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.accounts.length ? data.accounts.map(account => <div key={account.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#E8EDF3] bg-[#FAFBFD] p-3"><div><p className="text-xs font-semibold text-[#344054]">{PLATFORMS[account.platform]}{account.username ? ` · ${account.platform === "WHATSAPP" ? "" : "@"}${account.username}` : account.accountName ? ` · ${account.accountName}` : ""}</p><p className="mt-1 text-[10px] leading-4 text-[#667085]">{account.messagingNote}</p></div><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${account.messagingAvailable ? "bg-emerald-500" : "bg-amber-400"}`} /></div>) : <p className="text-xs text-[#667085]">Connect social accounts in Channels to get started.</p>}</div>{!clientMode && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "channels" } }))} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#1768E8]">Manage channel connections <ArrowUpRight className="h-3 w-3" /></button>}</div>
    </>}
  </section>;
}

function Stat({ icon: Icon, label, value, detail, accent = false }: { icon: typeof Users; label: string; value: number; detail: string; accent?: boolean }) {
  return <div className="rounded-xl border border-[#E7EBF1] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)]"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#667085]">{label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-semibold tracking-[-.04em] text-[#101828]">{value.toLocaleString()}</p><p className="mt-1 text-[10px] text-[#98A2B3]">{detail}</p></div>;
}
