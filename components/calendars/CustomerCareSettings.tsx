"use client";

import { useId } from "react";
import { REPLY_TONES, type ReplyTone } from "@/lib/socialMessaging/replyProfile";
import BusinessKnowledgeCard, { type BusinessDocumentData } from "./BusinessKnowledgeCard";

export type InboxBusinessKnowledge = {
  aiActive: boolean;
  businessSummary: string | null;
  summaryUpdatedAt: string | null;
  documents: BusinessDocumentData[];
};

export default function CustomerCareSettings({ calendarId, knowledge, tone, saving, locked, onToneChange }: {
  calendarId: string; knowledge: InboxBusinessKnowledge; tone: ReplyTone;
  saving: boolean; locked: boolean; onToneChange: (tone: ReplyTone) => void;
}) {
  const id = useId();
  return <div>
    <div className="mt-5 rounded-xl border border-[#D2DFF1] bg-[#F5F8FE] p-4">
      <label htmlFor={id} className="block text-sm font-medium text-[#31577E]">Reply tone</label>
      <select id={id} value={tone} disabled={saving || locked} onChange={event => onToneChange(event.target.value as ReplyTone)} className="mt-2 min-h-11 w-full rounded-lg border border-[#C8D9EF] bg-white px-3 text-sm text-[#31577E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3478EC] disabled:opacity-50">
        {REPLY_TONES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className="mt-2 text-xs leading-5 text-[#7186A2]">{saving ? "Saving…" : REPLY_TONES.find(option => option.value === tone)?.description}</p>
      <p className="mt-1 text-[11px] text-[#7186A2]">Saved automatically for AI drafts and automatic replies.</p>
    </div>
    <BusinessKnowledgeCard compact calendarId={calendarId} aiActive={knowledge.aiActive} businessSummary={knowledge.businessSummary} summaryUpdatedAt={knowledge.summaryUpdatedAt} lastResearchedAt={null} documents={knowledge.documents} />
  </div>;
}
