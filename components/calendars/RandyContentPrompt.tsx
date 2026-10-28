"use client";
import { useState } from 'react';
import { ArrowUpRight, Check, Copy, FilePenLine } from 'lucide-react';
import { queueResearchBrief } from '@/lib/knowledge/researchHandoff';
import styles from './RandyWorkspace.module.css';
export default function RandyContentPrompt({ calendarId, brief, canGenerate }: { calendarId: string; brief: { title: string; prompt: string }; canGenerate: boolean }) {
 const [prompt, setPrompt] = useState(brief.prompt), [copied, setCopied] = useState(false), [error, setError] = useState('');
 async function copy() {
  try { await navigator.clipboard.writeText(prompt); setCopied(true); setError(''); } catch { setError('Select the prompt text to copy it manually.'); }
 }
 return <div className={styles.proposal}>
  <span className={styles.proposalLabel}><FilePenLine size={14}/>Your content prompt</span><h3>{brief.title}</h3>
  <label className={styles.promptLabel}>Review and edit<textarea value={prompt} onChange={event => { setPrompt(event.target.value); setCopied(false); }} maxLength={8000} rows={8}/></label>
  <div className={styles.promptActions}><button type="button" disabled={!prompt.trim()} onClick={() => void copy()}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy prompt'}</button>
   {canGenerate && <button type="button" disabled={!prompt.trim()} onClick={() => { queueResearchBrief(calendarId, prompt); window.dispatchEvent(new CustomEvent('showwork-workspace-navigate', { detail: { id: 'generate' } })); }}>Use in Generate<ArrowUpRight size={14}/></button>}
  </div><small>Opens Generate with these instructions. Review your settings before generating; nothing is created or published automatically.</small>
  {error && <p role="status" className={styles.error}>{error}</p>}
 </div>;
}
