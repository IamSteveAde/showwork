"use client";

import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";
import styles from "./SocialLeadInbox.module.css";
import CustomerCareSettings, { type InboxBusinessKnowledge } from "./CustomerCareSettings";
import ReplyDraftAssistant from "./ReplyDraftAssistant";
import { normalizeReplyProfile, type ReplyProfile } from "@/lib/socialMessaging/replyProfile";
import XChatInbox, { type XChatInboxState } from "./XChatInbox";
import { mergeInboxConversations, resolveSelectedInboxConversation, type UnifiedInboxConversation } from "@/lib/xChat/inbox";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowUpRight, Check, Inbox, MessageSquareText, RefreshCw, Search, Send, Settings2, Sparkles, SlidersHorizontal, X } from "lucide-react";

const PLATFORMS: Record<string, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", LINKEDIN: "LinkedIn", X: "X", YOUTUBE: "YouTube", WHATSAPP: "WhatsApp" };
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CUSTOMER", "NOT_A_LEAD"] as const;
type Conversation = UnifiedInboxConversation;
type InboxData = {
  summary: { leads: number; newMessages: number; messagesThisMonth: number; allMessages: number };
  accounts: Array<{ id: string; platform: string; accountName: string | null; username: string | null; status: string; messagingAvailable: boolean; messagingNote: string }>;
  settings: { clientAccessEnabled: boolean; aiAutoReplyEnabled: boolean; aiAutoReplyInstructions: string | null; aiReplyProfile: ReplyProfile };
  conversations: Conversation[];
};

const contactName = (conversation: Conversation) => conversation.participantName || conversation.participantUsername || `${PLATFORMS[conversation.platform] || conversation.platform} contact`;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const dayLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function SocialLeadInbox({ calendarId, slug, clientMode = false, isManager = false, canReplyFromWorkspace = false, inboxAccess = true, autoRepliesAccess = true, isOwner = false, canManageLeads = true, canViewChannels = true, businessKnowledge }: { calendarId?: string; slug?: string; clientMode?: boolean; isManager?: boolean; canReplyFromWorkspace?: boolean; inboxAccess?: boolean; autoRepliesAccess?: boolean; businessKnowledge?: InboxBusinessKnowledge; isOwner?: boolean; canManageLeads?: boolean; canViewChannels?: boolean }) {
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[selectedId] || "";
  const setDraft = useCallback((value: string) => setDrafts(current => ({ ...current, [selectedId]: value })), [selectedId]);
  const [pinnedConversation, setPinnedConversation] = useState<Conversation | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [panel, setPanel] = useState<"settings" | "channels" | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const channelsButtonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const lastThreadRef = useRef("");
  const nearBottomRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const endpoint = clientMode ? `/api/social-calendar/${encodeURIComponent(slug || "")}/inbox` : `/api/calendars/${encodeURIComponent(calendarId || "")}/inbox`;

  useEffect(() => {
    setData(null); setSelectedId(""); setPinnedConversation(null); setDrafts({});
    setMobileChatOpen(false); setError(""); setSuccess("");
    setPlatform(""); setStatus(""); setSearch(""); setUnreadOnly(false);
    lastThreadRef.current = "";
  }, [endpoint]);

  const load = useCallback(async (quiet = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (platform) query.set("platform", platform);
      if (status) query.set("status", status);
      if (search.trim()) query.set("q", search.trim());
      if (unreadOnly) query.set("unread", "true");
      const response = await fetch(`${endpoint}?${query}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load the inbox.");
      if (controller.signal.aborted) return;
      setData(result);
      setSelectedId(current => current || result.conversations[0]?.id || "");
      if (!quiet) setError("");
    } catch (err) { if (!controller.signal.aborted && !quiet) setError(err instanceof Error ? err.message : "Could not load the inbox."); }
    finally { if (requestRef.current === controller) setLoading(false); }
  }, [endpoint, platform, status, search, unreadOnly]);

  const latestLoadRef = useRef(load);
  useEffect(() => { latestLoadRef.current = load; }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search.trim() ? 250 : 0);
    return () => { window.clearTimeout(timer); requestRef.current?.abort(); };
  }, [load, search]);
  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener("showwork-inbox-leads-updated", refresh);
    return () => window.removeEventListener("showwork-inbox-leads-updated", refresh);
  }, [load]);
  useEffect(() => { const timer = window.setInterval(() => void load(true), 30000); return () => window.clearInterval(timer); }, [load]);
  const encryptedConversations = useMemo(() => Object.entries(xChats)
    .filter(([id]) => data?.accounts.some(account => account.id === id && account.status === "CONNECTED"))
    .flatMap(([, state]) => state.conversations), [data?.accounts, xChats]);
  const conversations = useMemo(() => mergeInboxConversations(data?.conversations || [], encryptedConversations,
    { platform, status, search, unreadOnly }), [data, encryptedConversations, platform, status, search, unreadOnly]);
  const selected = resolveSelectedInboxConversation([...conversations, ...encryptedConversations], selectedId, pinnedConversation);
  useEffect(() => {
    const match = data?.conversations.find(item => item.id === selectedId);
    if (match && !match.encrypted) setPinnedConversation(match);
  }, [data, selectedId]);
  const selectedX = selected?.encrypted ? xChats[selected.encrypted.connectionId] : undefined;
  const messageCount = selected?.messages.length || 0;
  const lastMessageId = selected?.messages.at(-1)?.id;
  useEffect(() => {
    const element = historyRef.current;
    if (!element) return;
    if (lastThreadRef.current !== selectedId || nearBottomRef.current) element.scrollTop = element.scrollHeight;
    lastThreadRef.current = selectedId;
  }, [selectedId, messageCount, lastMessageId, mobileChatOpen]);
  useEffect(() => {
    // Encrypted reply drafts leave memory when X is locked or the workspace changes.
    const clearPrivateDrafts = () => setDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith("xchat:"))));
    const hidden = () => { if (document.hidden) clearPrivateDrafts(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", clearPrivateDrafts);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", clearPrivateDrafts); };
  }, []);
  useEffect(() => {
    setDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => !id.startsWith("xchat:") || encryptedConversations.some(item => item.id === id))));
  }, [encryptedConversations]);


  const hasData = Boolean(data);
  useEffect(() => {
    if (!panel || !hasData || !panelRef.current) return;
    const element = panelRef.current;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [panel, hasData]);

  function closePanel() {
    const trigger = panel === "settings" ? settingsButtonRef.current : channelsButtonRef.current;
    setPanel(null);
    trigger?.focus();
  }

  async function markRead(conversation: Conversation) {
    if (conversation.encrypted || !inboxAccess || !canReplyFromWorkspace || clientMode || !calendarId || conversation.unreadCount === 0) return;
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(conversation.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markRead: true }) });
      if (response.ok) void latestLoadRef.current(true);
    } catch { /* Keep the open chat usable if marking read briefly fails. */ }
  }

  async function updateLeadStatus(value: string) {
    if (!inboxAccess || !canManageLeads || !calendarId || !selected || selected.id.startsWith("xchat:")) return;
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadStatus: value }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); setError(result.error || "Could not update lead status."); return; }
      setPinnedConversation(current => current?.id === selected.id ? { ...current, leadStatus: value } : current);
      void latestLoadRef.current(true);
    } catch { setError("Could not update lead status. Please try again."); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!canReply || sending || selectedX?.busy || !calendarId || !selected || (!draft.trim() && !selectedX?.retry)) return;
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
      await latestLoadRef.current(true);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send reply."); }
    finally { setSending(false); }
  }

  async function saveSettings(patch: Partial<InboxData["settings"]>) {
    if (!inboxAccess || !calendarId || !data) return;
    setSavingSettings(true); setError("");
    const settings = { ...data.settings, ...patch, aiAutoReplyInstructions: patch.aiAutoReplyInstructions ?? data.settings.aiAutoReplyInstructions ?? "" };
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/inbox/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save inbox settings.");
      setData(current => current ? { ...current, settings: result } : current); setSuccess("Inbox settings saved.");
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save inbox settings."); }
    finally { setSavingSettings(false); }
  }

  const whatsappWindowClosed = selected?.platform === "WHATSAPP" && (!selected.replyWindowExpiresAt || Date.parse(selected.replyWindowExpiresAt) <= Date.now());
  const canReply = selected?.encrypted ? inboxAccess && !!selectedX && selectedX.selected === selected.encrypted.conversationId && !clientMode && isOwner : !clientMode && canReplyFromWorkspace && selected && !whatsappWindowClosed && ["FACEBOOK", "INSTAGRAM", "X", "LINKEDIN", "TIKTOK", "WHATSAPP"].includes(selected.platform) && selected.connection?.status === "CONNECTED" && data?.accounts.some(account => account.status === "CONNECTED" && account.platform === selected.platform && (!selected.connection?.id || account.id === selected.connection.id) && account.messagingAvailable);
  const replyUnavailable = clientMode ? "Read-only client view. Ask your workspace manager to reply."
    : !inboxAccess ? "Your plan does not include replying from the inbox."
    : selected?.encrypted ? (!isOwner ? "The workspace owner can unlock X to reply." : "Unlock X to read and reply to this conversation.")
    : whatsappWindowClosed ? "WhatsApp’s reply window has closed. A new customer message will reopen it."
    : "Replying isn’t available for this connected account yet.";
  const channelKeys = useMemo(() => [...new Set(data?.accounts.map(account => account.platform) || [])], [data?.accounts]);
  const openConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setPinnedConversation(conversation.encrypted ? null : conversation);
    setMobileChatOpen(true);
    nearBottomRef.current = true;
    setSuccess("");
    void markRead(conversation);
  };

  return (
    <section className={styles.inbox} aria-label="Social leads inbox">
      {!clientMode && !inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}
      <header className={styles.header}>
        <div className={styles.identity}><span className={styles.headerIcon}><MessageSquareText size={21} aria-hidden="true" /></span><div><h2>Every conversation, connected.</h2><p>Your inbox. One clear place to reply.</p></div></div>
        <div className={styles.headerActions}>
          {data && <><span className={styles.metric}><strong>{data.summary.newMessages.toLocaleString()}</strong> unread</span>{canManageLeads && <span className={styles.metric}><strong>{data.summary.leads.toLocaleString()}</strong> leads</span>}</>}
          <button type="button" className={`${styles.button} ${styles.refreshButton}`} onClick={() => void load()} disabled={loading} aria-label="Refresh inbox"><RefreshCw size={15} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} /><span>Refresh</span></button>
          {canViewChannels && <button type="button" ref={channelsButtonRef} className={`${styles.button} ${panel === "channels" ? styles.activeButton : ""}`} aria-expanded={panel === "channels"} aria-controls="inbox-channels-panel" onClick={() => setPanel(current => current === "channels" ? null : "channels")}><SlidersHorizontal size={15} aria-hidden="true" />Channel access</button>}
          {isManager && <button type="button" ref={settingsButtonRef} className={`${styles.button} ${panel === "settings" ? styles.activeButton : ""}`} aria-expanded={panel === "settings"} aria-controls="inbox-settings-panel" onClick={() => setPanel(current => current === "settings" ? null : "settings")}><Settings2 size={15} aria-hidden="true" />AI & inbox setup</button>}
        </div>
      </header>
      {error && <div role="alert" className={styles.notice}><AlertCircle size={16} className="shrink-0" aria-hidden="true" />{error}</div>}
      {success && <div role="status" className={`${styles.notice} ${styles.success}`}><Check size={16} aria-hidden="true" />{success}</div>}
      <nav className={styles.channels} aria-label="Conversation channels">
        <button type="button" aria-pressed={!platform} onClick={() => setPlatform("")} className={`${styles.channel} ${!platform ? styles.channelSelected : ""}`}><Inbox size={14} aria-hidden="true" />All conversations</button>
        {channelKeys.map(key => <button type="button" key={key} aria-pressed={platform === key} onClick={() => setPlatform(key)} className={`${styles.channel} ${platform === key ? styles.channelSelected : ""}`}><span className={styles.channelDot} aria-hidden="true" />{PLATFORMS[key] || key}</button>)}
      </nav>
      <div className={`${styles.workbench} ${mobileChatOpen ? styles.conversationOpen : ""}`}>
        <aside className={styles.list} aria-label="Conversation list">
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>Conversations <span>{conversations.length}</span></div>
            <div className={styles.search}><Search size={15} aria-hidden="true" /><input aria-label="Search people or messages" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people or messages" type="search" /></div>
            <div className={styles.filters}><select aria-label="Filter by lead status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All lead statuses</option>{STATUSES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(value => !value)} className={`${styles.unreadToggle} ${unreadOnly ? styles.unreadSelected : ""}`}>{unreadOnly && <Check size={12} aria-hidden="true" />}Unread</button></div>
          </div>
          {!clientMode && isOwner && calendarId && <div className={styles.xUnlock}>{data?.accounts.filter(account => account.platform === "X" && account.status === "CONNECTED").map(account => <XChatInbox key={`${calendarId}:${account.id}`} calendarId={calendarId} connectionId={account.id} activeConversationId={selected?.encrypted?.connectionId === account.id ? selected.encrypted.conversationId : ""} onState={updateXChat} />)}</div>}
          <div className={styles.threads} aria-label="Conversations" aria-busy={loading}>
            {conversations.map(conversation => <button type="button" key={conversation.id} aria-pressed={selectedId === conversation.id} disabled={!!selectedX?.busy || (!!selectedX?.retry && conversation.id !== selectedId)} onClick={() => openConversation(conversation)} className={`${styles.thread} ${selectedId === conversation.id ? styles.threadSelected : ""}`}>
              <div className={styles.threadTop}><span className={styles.avatar} aria-hidden="true">{initials(contactName(conversation))}</span><div className={styles.threadIdentity}><p className={styles.threadName}>{contactName(conversation)}</p><p className={styles.threadPlatform}>{PLATFORMS[conversation.platform]}</p></div>{conversation.unreadCount > 0 && <span className={styles.unreadCount} aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}</div>
              <p className={`${styles.preview} ${drafts[conversation.id] ? styles.draftLabel : ""}`}>{drafts[conversation.id] ? `Draft: ${drafts[conversation.id]}` : conversation.lastMessagePreview || "Start of a conversation"}</p>
              <div className={styles.threadFoot}><span>{conversation.encrypted ? "Encrypted" : conversation.leadStatus?.replaceAll("_", " ")}</span><span>{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</span></div>
            </button>)}
            {!conversations.length && <div className={styles.emptyList}><Inbox size={25} className="mx-auto" aria-hidden="true" /><p>{loading ? "Loading conversations…" : "No conversations here yet."}</p>{!loading && <p>{search || status || unreadOnly || platform ? "Try another filter or search." : "Messages from connected channels will appear here."}</p>}</div>}
          </div>
        </aside>
        <div className={styles.chat} aria-label="Active conversation">
          {selected ? <>
            <header className={styles.chatHeader}>
              <div className={styles.chatIdentity}>
                <button type="button" className={`${styles.button} ${styles.mobileBack}`} aria-label="Back to conversations" onClick={() => setMobileChatOpen(false)}><ArrowLeft size={16} aria-hidden="true" /></button>
                <span className={styles.avatar} aria-hidden="true">{initials(contactName(selected))}</span>
                <div className="min-w-0"><h3 className={styles.chatName}>{contactName(selected)}</h3><p className={styles.chatSub}>{PLATFORMS[selected.platform]}{selected.participantUsername ? ` · ${selected.platform === "WHATSAPP" ? "" : "@"}${selected.participantUsername}` : ""}{selected.encrypted ? " · Encrypted" : ""}</p></div>
              </div>
              <div className={styles.chatControls}>{canManageLeads && !selected.encrypted && <select aria-label="Update lead status" value={selected.leadStatus} disabled={!inboxAccess || clientMode} onChange={event => void updateLeadStatus(event.target.value)}>{STATUSES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>}</div>
            </header>
            {selectedX && <div className={styles.messageTools}><div className="flex flex-wrap gap-4"><button type="button" disabled={selectedX.busy} onClick={() => void selectedX.refresh()} className="text-blue-700">Refresh messages</button>{selectedX.cursor && <button type="button" disabled={selectedX.busy} onClick={() => void selectedX.older()} className="text-blue-700">Load older messages</button>}</div>{selectedX.error && <p role="alert" className="mt-2 text-red-700">{selectedX.error}</p>}{selectedX.notice && <p role="status" className="mt-2 text-[#667085]">{selectedX.notice}</p>}</div>}
            <div ref={historyRef} className={styles.history} aria-label="Message history" tabIndex={0} onScroll={event => { const element = event.currentTarget; nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }}>
              {selected.messages.map((message, index) => <div key={message.id}>
                {(index === 0 || dayLabel(selected.messages[index - 1].platformCreatedAt) !== dayLabel(message.platformCreatedAt)) && <div className={styles.dayLabel}><span>{dayLabel(message.platformCreatedAt)}</span></div>}
                <div className={`${styles.messageRow} ${message.direction === "OUTBOUND" ? styles.messageOutbound : ""}`}><div className={styles.bubble}><p>{message.text}</p><div className={styles.messageMeta}><span>{message.direction === "OUTBOUND" ? `${message.isAiGenerated ? "AI · " : ""}${message.status === "READ" ? "Read" : message.status === "DELIVERED" ? "Delivered" : message.status === "FAILED" ? "Failed" : "Sent"}` : "Received"}</span><time dateTime={message.platformCreatedAt} title={new Date(message.platformCreatedAt).toLocaleString()}>{new Date(message.platformCreatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time></div>{message.autoReplyHandoffReason && <p className={styles.handoff}>{message.autoReplyHandoffReason}</p>}{message.sendError && <p className={styles.messageError}>{message.sendError}</p>}</div></div>
              </div>)}
              {!selected.messages.length && <div className={styles.empty}><MessageSquareText size={28} aria-hidden="true" /><p>{selected.encrypted && selectedX?.busy ? "Loading messages…" : "No messages in this conversation yet."}</p></div>}
            </div>
            {!clientMode ? <form onSubmit={sendReply} className={styles.composer}>
              {!selected.encrypted && canReply && data && <details className={styles.assistant} key={selected.id}><summary><Sparkles size={14} aria-hidden="true" />AI reply assistant</summary><ReplyDraftAssistant endpoint={endpoint} conversationId={selected.id} defaultTone={normalizeReplyProfile(data.settings.aiReplyProfile).tone} currentDraft={draft} latestInboundId={[...selected.messages].reverse().find(message => message.direction === "INBOUND")?.id} onUseDraft={setDraft} locked={!inboxAccess} /></details>}
              <div className={styles.composerBar}><textarea aria-label={`Reply to ${contactName(selected)}`} value={draft} onChange={event => setDraft(event.target.value)} rows={2} disabled={!canReply || sending || !!selectedX?.retry || !!selectedX?.busy} maxLength={2000} placeholder={canReply ? "Write your reply…" : "Replies unavailable"} /><button type="submit" aria-label={selectedX?.retry ? "Retry reply" : "Send reply"} disabled={!canReply || sending || !!selectedX?.busy || (!draft.trim() && !selectedX?.retry)} className={styles.send}><Send size={16} aria-hidden="true" /><span>{sending || selectedX?.busy ? "Sending…" : selectedX?.retry ? "Retry" : "Send"}</span></button></div>
              <p className={styles.composerHint}>{!canReply ? replyUnavailable : selected.encrypted ? "Encrypted on this device. Excluded from shared history and AI." : `Replies sent through ${PLATFORMS[selected.platform]}${selected.connection?.username ? ` · @${selected.connection.username}` : selected.connection?.accountName ? ` · ${selected.connection.accountName}` : ""}.`}</p>
            </form> : <div className={styles.readOnly}>{replyUnavailable}</div>}
          </> : <div className={styles.empty}><span className={styles.emptyIcon}><MessageSquareText size={31} strokeWidth={1.5} aria-hidden="true" /></span><h3>{loading && !data ? "Opening your inbox…" : "A little more room to connect."}</h3><p>{loading && !data ? "Your conversations are on their way." : "Choose a conversation to read messages and keep the conversation going."}</p></div>}
        </div>
      </div>
      {panel === "settings" && isManager && data && <section ref={panelRef} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); closePanel(); } }} id="inbox-settings-panel" className={styles.settings} aria-label="AI and inbox setup">
        <div className={styles.settingsHeader}><div><h3>AI & inbox setup</h3><p className="mt-1 text-xs text-[#607898]">Upload business documents and choose what clients can see.</p></div><button type="button" className={styles.button} aria-label="Close AI and inbox setup" onClick={closePanel}><X size={16} aria-hidden="true" /></button></div>
        <div className={styles.settingsGrid}>
          <div className={styles.settingsCard}><div className={styles.toggleRow}><div><h4>Client inbox access</h4><p>Let clients read conversations in their portal.</p></div><input aria-label="Allow client inbox access" type="checkbox" checked={data.settings.clientAccessEnabled} disabled={savingSettings || !inboxAccess} onChange={event => void saveSettings({ clientAccessEnabled: event.target.checked })} /></div>{!inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}</div>
          <div className={styles.settingsCard}><div className={styles.toggleRow}><div><h4>Automatic AI replies</h4><p>Use your uploaded business knowledge to answer incoming messages.</p></div><input aria-label="Enable AI automatic replies" type="checkbox" checked={data.settings.aiAutoReplyEnabled} disabled={savingSettings || !inboxAccess || !autoRepliesAccess} onChange={event => void saveSettings({ aiAutoReplyEnabled: event.target.checked })} /></div>{!autoRepliesAccess && <WorkspaceFeatureNotice compact feature="aiAutoReplies" />}{calendarId && businessKnowledge && <CustomerCareSettings calendarId={calendarId} knowledge={businessKnowledge} tone={normalizeReplyProfile(data.settings.aiReplyProfile).tone} saving={savingSettings} locked={!inboxAccess} onToneChange={tone => void saveSettings({ aiReplyProfile: { ...normalizeReplyProfile(data.settings.aiReplyProfile), tone } })} />}<p>Automatic replies hand uncertain requests to your team. Encrypted X chats are excluded from AI.</p></div>
        </div>
      </section>}
      {panel === "channels" && canViewChannels && data && <section ref={panelRef} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); closePanel(); } }} id="inbox-channels-panel" className={styles.settings} aria-label="Channel messaging access">
        <div className={styles.settingsHeader}><div><h3>Channel access</h3><p className="mt-1 text-xs text-[#607898]">Check messaging access for your connected accounts.</p></div><button type="button" className={styles.button} aria-label="Close channel access" onClick={closePanel}><X size={16} aria-hidden="true" /></button></div>
        <div className={styles.channelGrid}>{data.accounts.map(account => <div key={account.id} className={styles.account}><span className={`${styles.accessDot} ${account.messagingAvailable ? styles.accessReady : ""}`} aria-hidden="true" /><div><p>{PLATFORMS[account.platform]}{account.username ? ` · ${account.platform === "WHATSAPP" ? "" : "@"}${account.username}` : account.accountName ? ` · ${account.accountName}` : ""}</p><small>{account.messagingNote}</small></div></div>)}</div>
        {!data.accounts.length && <p className="text-sm text-[#607898]">Connect a channel to bring messages into your inbox.</p>}
        {!clientMode && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "channels" } }))} className={`${styles.button} mt-4`}>Manage connections <ArrowUpRight size={14} aria-hidden="true" /></button>}
      </section>}
    </section>
  );
}
