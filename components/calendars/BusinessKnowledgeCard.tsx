"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface BusinessDocumentData {
  id: string;
  originalName: string;
  createdAt: string;
}

export default function BusinessKnowledgeCard({
  calendarId,
  aiActive,
  businessSummary,
  summaryUpdatedAt,
  lastResearchedAt,
  documents,
}: {
  calendarId: string;
  aiActive: boolean;
  businessSummary: string | null;
  summaryUpdatedAt: string | null;
  lastResearchedAt: string | null;
  documents: BusinessDocumentData[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const uploadOne = async (file: File) => {
    const presignRes = await fetch(`/api/calendars/${calendarId}/business-documents/upload-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!uploadRes.ok) throw new Error("Failed to upload file");

    const completeRes = await fetch(`/api/calendars/${calendarId}/business-documents/upload-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: presignData.fileKey, originalName: file.name, contentType: file.type }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to process document");
    return completeData;
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  if (!aiActive) {
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#2478FF]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2.8L13.7 9.3L20.2 11L13.7 12.7L12 19.2L10.3 12.7L3.8 11L10.3 9.3L12 2.8Z" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">AI content assistant</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">Premium add-on</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
            Upload documents about a client&apos;s business, let AI research their industry weekly, then generate a full content calendar on demand. Not active on this account yet.
          </p>
        </div>
        <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
          <a
            href="/dashboard/calendars"
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
          >
            Subscribe — ₦15,000/month
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
      <div className="min-w-0 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#2478FF]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2.8L13.7 9.3L20.2 11L13.7 12.7L12 19.2L10.3 12.7L3.8 11L10.3 9.3L12 2.8Z" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">AI business knowledge</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">
                {documents.length} {documents.length === 1 ? "document" : "documents"} uploaded
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
            Active
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">{error}</p>
        )}

        {businessSummary ? (
          <div className="mt-4 rounded-xl border border-[#223047] bg-[#0E1622] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#718096]">Current understanding</p>
              <button onClick={() => setSummaryExpanded((v) => !v)} className="text-[10px] font-semibold text-[#2478FF]">
                {summaryExpanded ? "Show less" : "Show more"}
              </button>
            </div>
            <p className={`mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[#AAB4C3] ${summaryExpanded ? "" : "line-clamp-3"}`}>
              {businessSummary}
            </p>
            {(summaryUpdatedAt || lastResearchedAt) && (
              <p className="mt-2 text-[9px] text-[#4A5568]">
                {summaryUpdatedAt && `Updated ${new Date(summaryUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                {summaryUpdatedAt && lastResearchedAt && " · "}
                {lastResearchedAt && `Last researched ${new Date(lastResearchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
            Upload brand guidelines, product info, or anything else about this client&apos;s business — the AI uses it to understand what to create content about.
          </p>
        )}

        {documents.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-[#223047] bg-[#0E1622] px-3 py-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#718096]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                  <path d="M15 2v5h5" />
                </svg>
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{doc.originalName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {uploading ? "Uploading and reading document..." : "Upload business document"}
        </button>
        <p className="mt-2 text-center text-[9px] text-[#4A5568]">PDF, Word, or plain text</p>
      </div>
    </div>
  );
}