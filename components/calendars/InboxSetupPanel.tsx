"use client";

import { Bot, BookOpen, Check, CheckCheck, Eye, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";
import { useId } from "react";
import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";
import BusinessKnowledgeCard from "./BusinessKnowledgeCard";
import type { InboxBusinessKnowledge } from "./CustomerCareSettings";
import { normalizeReplyProfile, REPLY_TONES, type ReplyProfile } from "@/lib/socialMessaging/replyProfile";
import styles from "./InboxSetupPanel.module.css";

type Settings = { clientAccessEnabled: boolean; aiAutoReplyEnabled: boolean; aiReplyProfile: ReplyProfile };
export default function InboxSetupPanel({ calendarId, knowledge, settings, saving, inboxAccess, autoRepliesAccess, onChange, onClose }: {
  calendarId?: string; knowledge?: InboxBusinessKnowledge; settings: Settings; saving: boolean;
  inboxAccess: boolean; autoRepliesAccess: boolean;
  onChange: (patch: Partial<Settings>) => void; onClose: () => void;
}) {
  const toneId = useId();
  const profile = normalizeReplyProfile(settings.aiReplyProfile);
  return <div className={styles.panel}>
    <header className={styles.header}>
      <span className={styles.headerIcon}><Sparkles size={22} strokeWidth={1.5} aria-hidden="true" /></span>
      <div className={styles.headerCopy}><p className={styles.eyebrow}>Your inbox, thoughtfully configured</p><h3>Good conversations start here.</h3><p>Set the boundaries. Give AI the context. Make every reply feel like you.</p></div>
      <button type="button" className={styles.close} aria-label="Close AI and inbox setup" onClick={onClose}><X size={18} aria-hidden="true" /></button>
    </header>
    <div className={styles.layout}>
      <div className={styles.controls}>
        <div className={styles.sectionLabel}><span>01</span> Access & automation</div>
        <div className={styles.controlCard}>
          <div className={styles.controlRow}><span className={styles.controlIcon}><Eye size={19} aria-hidden="true" /></span><div className={styles.controlCopy}><h4>Client visibility</h4><p>Let your client read conversations in their portal.</p></div><label className={styles.switch}><input type="checkbox" role="switch" aria-label="Allow client inbox access" checked={settings.clientAccessEnabled} disabled={saving || !inboxAccess} onChange={event => onChange({ clientAccessEnabled: event.target.checked })} /><span aria-hidden="true" /></label></div>
          {!inboxAccess && <WorkspaceFeatureNotice compact feature="socialInbox" />}
          <div className={styles.controlDivider} />
          <div className={styles.controlRow}><span className={`${styles.controlIcon} ${styles.aiIcon}`}><Bot size={20} aria-hidden="true" /></span><div className={styles.controlCopy}><h4>Automatic AI replies <span className={`${styles.pill} ${settings.aiAutoReplyEnabled ? styles.enabled : ""}`}>{settings.aiAutoReplyEnabled ? "On" : "Off"}</span></h4><p>Answer new messages using your business knowledge.</p></div><label className={styles.switch}><input type="checkbox" role="switch" aria-label="Enable AI automatic replies" checked={settings.aiAutoReplyEnabled} disabled={saving || !inboxAccess || !autoRepliesAccess} onChange={event => onChange({ aiAutoReplyEnabled: event.target.checked })} /><span aria-hidden="true" /></label></div>
          {!autoRepliesAccess && <WorkspaceFeatureNotice compact feature="aiAutoReplies" />}
        </div>
        <div className={styles.voiceCard}>
          <div className={styles.voiceHeader}><div><p className={styles.eyebrow}>The way you sound</p><h4>A voice that fits your business.</h4></div><Sparkles size={18} aria-hidden="true" /></div>
          <label htmlFor={toneId} className={styles.fieldLabel}>Reply tone</label>
          <select id={toneId} className={styles.select} value={profile.tone} disabled={saving || !inboxAccess} onChange={event => onChange({ aiReplyProfile: { ...profile, tone: event.target.value as ReplyProfile["tone"] } })}>{REPLY_TONES.map(tone => <option key={tone.value} value={tone.value}>{tone.label}</option>)}</select>
          <p className={styles.toneDescription}>{REPLY_TONES.find(tone => tone.value === profile.tone)?.description}</p>
          <div className={styles.voiceFoot}><CheckCheck size={14} aria-hidden="true" /> Applies to AI drafts and automatic replies.</div>
        </div>
        <div className={styles.safeguard}><ShieldCheck size={19} aria-hidden="true" /><p><strong>You stay in control.</strong> Uncertain requests are handed to your team. Encrypted X chats are excluded from AI.</p></div>
      </div>
      <div className={styles.knowledgeColumn}>
        <div className={styles.sectionLabel}><span>02</span> The knowledge behind every reply</div>
        <div className={styles.knowledgeCard}>
          <div className={styles.knowledgeHeader}><span className={styles.bookIcon}><BookOpen size={21} aria-hidden="true" /></span><div><h4>Grounded in your business.</h4><p>Real answers start with the right information.</p></div></div>
          {calendarId && knowledge ? <BusinessKnowledgeCard compact calendarId={calendarId} aiActive={knowledge.aiActive} businessSummary={knowledge.businessSummary} summaryUpdatedAt={knowledge.summaryUpdatedAt} lastResearchedAt={null} documents={knowledge.documents} /> : <div className={styles.knowledgeEmpty}><BookOpen size={24} aria-hidden="true" /><p>Manage business documents from Knowledge in your workspace.</p></div>}
          <div className={styles.knowledgeFoot}><LockKeyhole size={13} aria-hidden="true" /> Business documents are not shared in the client inbox.</div>
        </div>
      </div>
    </div>
    <footer className={styles.footer}><span role="status">{saving ? <><span className={styles.savingDot} /> Saving changes…</> : <><Check size={14} aria-hidden="true" /> Changes save automatically</>}</span><span>Made for a more personal inbox.</span></footer>
  </div>;
}
