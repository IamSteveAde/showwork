"use client";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpenText, Check, ChevronDown, Globe2, History, Loader2, MessageCircle, Plus, Send, Sparkles, X } from 'lucide-react';
import RandyAvatar from '@/components/support/RandyAvatar';
import RandyContentPrompt from './RandyContentPrompt';
import type { BusinessChatAnswer } from '@/lib/knowledge/randy/answer';
import styles from './RandyWorkspace.module.css';
type Conversation = { id: string; title: string; processingAt: string | null };
type Message = { id: string; role: string; body: BusinessChatAnswer & { mode?: string }; knowledgeDocumentId: string | null };
export default function BusinessResearchPanel({ calendarId, canManage, canGenerate = false }: { calendarId: string; canManage: boolean; canGenerate?: boolean }) {
 const router = useRouter();
 const [conversations, setConversations] = useState<Conversation[]>([]), [conversation, setConversation] = useState<Conversation | null>(null), [messages, setMessages] = useState<Message[]>([]);
 const [text, setText] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [interrupted, setInterrupted] = useState(false);
 const [historyOpen, setHistoryOpen] = useState(false);
 const end = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null), selection = useRef(0);
 const endpoint = `/api/calendars/${calendarId}/randy`;
 const waiting = !!conversation?.processingAt && !interrupted;
 const list = useCallback(async () => {
  const response = await fetch(endpoint, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw Error(data.error); setConversations(data.conversations);
 }, [endpoint]);
 const load = useCallback(async (id: string, version = selection.current) => {
  const response = await fetch(`${endpoint}?conversation=${encodeURIComponent(id)}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw Error(data.error);
  if (version === selection.current) { setConversation(data.conversation); setMessages(data.messages); setInterrupted(data.interrupted); if (!data.conversation.processingAt) void list().catch(() => {}); }
 }, [endpoint, list]);
 useEffect(() => { let alive = true; void list().catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; selection.current++; }; }, [list]);
 useEffect(() => { if (!conversation?.id || !waiting) return; const id = conversation.id; const timer = setInterval(() => { void load(id).catch(e => setError(e.message)); }, 3000); return () => clearInterval(timer); }, [conversation?.id, waiting, load]);
 useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [messages.length, waiting]);
 function fresh() { selection.current++; setConversation(null); setMessages([]); setInterrupted(false); setError(''); setText(''); setHistoryOpen(false); input.current?.focus(); }
 async function choose(id: string) { const version = ++selection.current; setBusy(true); setError(''); setHistoryOpen(false); try { await load(id, version); } catch (e) { setError(e instanceof Error ? e.message : 'Could not open conversation.'); } finally { setBusy(false); } }
 async function send(value = text) {
  if (!value.trim() || busy || waiting || !canGenerate) return;
  setBusy(true); setError('');
  try {
   const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: conversation?.id, text: value, action: 'chat' }) });
   const data = await response.json(); if (!response.ok) throw Error(data.error);
   setText(''); await load(data.conversationId); await list();
  } catch (e) { setError(e instanceof Error ? e.message : 'Could not send.'); }
  finally { setBusy(false); input.current?.focus(); }
 }
 async function confirm(messageId: string, action: 'confirmKnowledge' | 'confirmResearch' = 'confirmKnowledge') {
  setBusy(true); setError('');
  try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, conversationId: conversation?.id, messageId }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); await load(conversation!.id); if (action === 'confirmKnowledge') router.refresh(); }
  catch (e) { setError(e instanceof Error ? e.message : 'Could not confirm save.'); } finally { setBusy(false); }
 }
 return <section className={styles.workspace} aria-label="Randy business assistant">
  <header className={styles.header}><div className={styles.identity}><RandyAvatar size={46}/><div><h1>Randy</h1><p>Your business thinking partner. Chat, research and build your knowledge.</p></div></div><button className={styles.historyToggle} type="button" onClick={() => setHistoryOpen(!historyOpen)} aria-expanded={historyOpen}><History size={17}/><span>Conversations</span><ChevronDown size={14}/></button></header>
  <div className={styles.layout}>
   <aside className={styles.sidebar} data-open={historyOpen} aria-label="Your Randy conversations"><div className={styles.sidebarTop}><span>Your conversations</span><button type="button" aria-label="Close conversations" className={styles.closeHistory} onClick={() => setHistoryOpen(false)}><X size={18}/></button></div><button className={styles.newChat} type="button" onClick={fresh} disabled={busy}><Plus size={16}/>Start conversation</button><nav>{conversations.map(c => <button key={c.id} type="button" aria-current={c.id === conversation?.id ? 'page' : undefined} onClick={() => void choose(c.id)} disabled={busy}><MessageCircle size={15}/><span>{c.title}</span>{c.processingAt && <span className={styles.activityDot} aria-label="Reply in progress"/>}</button>)}</nav>{loading && <p className={styles.hint}>Loading conversations…</p>}<small>Only you can see these conversations. Workspace knowledge is shared.</small></aside>
   <div className={styles.main}>
     <div className={styles.messages} aria-label="Business conversation" aria-live="polite" aria-busy={waiting || busy}>
      {!messages.length && <div className={styles.welcome}><RandyAvatar size={68}/><span className={styles.eyebrow}>A partner for your next move</span><h2>Let’s talk about<br/><span>your business.</span></h2><p>Explore an idea, understand your audience, or tell me something new about your brand.</p></div>}
      {messages.map((message, index) => <article key={message.id} className={message.role === 'user' ? styles.user : styles.answer}>
       {message.role === 'assistant' && <div className={styles.byline}><RandyAvatar size={24}/>Randy</div>}
       {message.body.mode?.startsWith('research') && <span className={styles.researchLabel}><Globe2 size={12}/>Web research</span>}
       <div className={styles.messageText}>{message.body.text}</div>
       {!!message.body.sources?.length && <details className={styles.sources}><summary>Sources · {message.body.sources.length}<ChevronDown size={13}/></summary><div>{message.body.sources.map(source => source.url ? <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"><Globe2 size={13}/>{source.title}<ArrowUpRight size={12}/></a> : <span key={source.id}><BookOpenText size={13}/>{source.title}</span>)}</div></details>}
       {message.body.proposal && <div className={styles.proposal}><span className={styles.proposalLabel}><BookOpenText size={14}/>{message.knowledgeDocumentId ? 'Saved to Business Knowledge' : 'Add this to your business information?'}</span><h3>{message.body.proposal.title}</h3><p>{message.body.proposal.text}</p>{message.knowledgeDocumentId ? <span className={styles.saved}><Check size={15}/>Saved</span> : <><small>Adds a shared source. Existing documents stay unchanged; conflicting information needs review.</small>{canManage ? <button type="button" onClick={() => void confirm(message.id)} disabled={busy || waiting}><Check size={15}/>Confirm & save</button> : <small>A knowledge manager must confirm additions.</small>}</>}</div>}
       {message.body.researchPlan && <div className={styles.proposal}><span className={styles.proposalLabel}><Globe2 size={14}/>Public research topic</span><p>{message.body.researchPlan.focus}</p><small>Only this topic and public business identifiers go into web search. Review it for private details before starting.</small>{message.body.researchStarted ? <span className={styles.saved}><Check size={15}/>Research requested</span> : canManage && <button type="button" disabled={busy || waiting} onClick={() => void confirm(message.id, 'confirmResearch')}><Globe2 size={15}/>Start research</button>}</div>}
       {message.body.contentBrief && <RandyContentPrompt calendarId={calendarId} brief={message.body.contentBrief} canGenerate={canGenerate}/>}
       {message.role === 'assistant' && index === messages.length - 1 && !message.body.researchPlan && <div className={styles.chatActions}>
        {canGenerate && !message.body.contentBrief && <button type="button" disabled={busy || waiting} onClick={() => void send('Create a content-generation prompt from this discussion and any relevant research. Use our business context and preserve uncertainties.')}><Sparkles size={14}/>Create content prompt</button>}
        {canManage && canGenerate && !message.body.proposal && <button type="button" disabled={busy || waiting} onClick={() => void send('Suggest a useful addition to our Business Knowledge based on this discussion. Separate confirmed business facts from proposed strategy and cited research hypotheses.')}><BookOpenText size={14}/>Suggest knowledge update</button>}
        {message.body.researchSuggested && canManage && canGenerate && <button type="button" disabled={busy || waiting} onClick={() => void send('Research the opportunity we just discussed. Prepare a specific public research topic for me to review.')}><Globe2 size={14}/>Research this idea</button>}
       </div>}

      </article>)}
      {waiting && <div className={styles.thinking} role="status"><Loader2 size={16}/>Randy is {messages.at(-1)?.body.mode === 'research-approved' ? 'researching public sources' : messages.at(-1)?.body.mode === 'research' ? 'preparing your research' : 'thinking about your business'}…</div>}
      {interrupted && <p className={styles.error}>That reply was interrupted. You can ask again; nothing was automatically saved to knowledge.</p>}
      <div ref={end}/>
     </div>
     <form className={styles.composer} onSubmit={e => { e.preventDefault(); void send(); }}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.inputBox}><label className="sr-only" htmlFor={`randy-business-${calendarId}`}>Message Randy about your business</label><textarea ref={input} id={`randy-business-${calendarId}`} value={text} rows={2} maxLength={3000} disabled={!canGenerate || busy || waiting} placeholder={canGenerate ? 'Ask Randy, or share an idea…' : 'AI generation permission is required to chat.'} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><div className={styles.inputActions}><button className={styles.send} type="submit" aria-label="Send to Randy" disabled={!text.trim() || !canGenerate || busy || waiting}>{busy || waiting ? <Loader2 size={17}/> : <Send size={17}/>}</button></div></div>
      <p className={styles.footerHint}>Uses your Business Knowledge · Review additions before saving</p>
     </form>
   </div>
  </div>
 </section>;
}
