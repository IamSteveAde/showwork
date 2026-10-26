"use client";
import { useState } from "react";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";
import type { KnowledgeAnswer, KnowledgeGap } from "@/lib/knowledge/clarification";

export interface ClarificationPrompt { gaps: KnowledgeGap[]; incomplete: boolean; canSave: boolean }
export interface ClarificationResponse { knowledgeAnswers: KnowledgeAnswer[]; omitUnsupportedDetails: boolean; useAvailableKnowledge: boolean }

export default function KnowledgeClarification({ calendarId, prompt, busy, onContinue }: {
  calendarId: string; prompt: ClarificationPrompt; busy: boolean; onContinue: (response: ClarificationResponse) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const values = () => Object.entries(answers).filter(([, answer]) => answer.trim()).map(([question, answer]) => ({ question, answer }));
  const save = async () => {
    setSaving(true); setNotice("");
    try {
      const res = await calendarMutationFetch(`/api/calendars/${encodeURIComponent(calendarId)}/business-documents/clarification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: values() }) });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Could not save answers.");
      setNotice("Saved to business knowledge. Existing documents were kept.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save answers."); }
    finally { setSaving(false); }
  };
  return <section id="knowledge-clarification" tabIndex={-1} aria-labelledby="knowledge-clarification-title" className="my-5 space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
    <div>
      <h3 id="knowledge-clarification-title" className="font-semibold text-slate-900">A few details before we create</h3>
      <p className="mt-1 text-sm text-slate-600">Answer below for this request, or leave unsupported details out. No drafts have been generated and no generation allowance has been used.</p>
    </div>
    {prompt.incomplete && <p role="status" className="rounded-xl bg-white p-3 text-sm text-slate-700">Some sources have no readable text yet. You can wait and retry after processing, check the documents in Knowledge, or continue with the available information.</p>}
    {prompt.gaps.map((gap, index) => <label key={gap.question} className="block text-sm text-slate-800">
      <span className="font-medium">{gap.kind === "conflict" ? "Conflicting information: " : ""}{gap.question}</span>
      <span className="mt-1 block text-xs text-slate-600">{gap.reason}</span>
      <textarea aria-label={gap.question} rows={3} maxLength={3000} disabled={busy || saving} value={answers[gap.question] || ""} onChange={event => { setAnswers(previous => ({ ...previous, [gap.question]: event.target.value })); setNotice(""); }} className="mt-2 w-full resize-y rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-900 focus:outline-blue-500" placeholder={index === 0 ? "Include the exact details, such as amount and currency." : "Your answer"} />
    </label>)}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || saving || (prompt.gaps.length > 0 && values().length === 0)} onClick={() => onContinue({ knowledgeAnswers: values(), omitUnsupportedDetails: false, useAvailableKnowledge: true })} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking knowledge…" : prompt.gaps.length ? "Use answers for this request" : "Use available knowledge"}</button>
      <button type="button" disabled={busy || saving} onClick={() => onContinue({ knowledgeAnswers: values(), omitUnsupportedDetails: true, useAvailableKnowledge: true })} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-800 disabled:opacity-50">Continue without unresolved details</button>
      {prompt.canSave && prompt.gaps.length > 0 && <button type="button" disabled={busy || saving || !values().length} onClick={() => void save()} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50">{saving ? "Saving…" : "Save answers to business knowledge"}</button>}
    </div>
    <p className="text-xs text-slate-600">Saving is optional and makes your answers available for future requests. It does not automatically replace conflicting information.</p>
    {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
  </section>;
}
