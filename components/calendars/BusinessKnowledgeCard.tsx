"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface BusinessDocumentData {
  id: string;
  originalName: string;
  createdAt: string;
}

type BusinessKnowledgeCardProps = {
  calendarId: string;
  aiActive: boolean;
  businessSummary: string | null;
  summaryUpdatedAt: string | null;
  lastResearchedAt: string | null;
  documents: BusinessDocumentData[];
};

function formatDate(value: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 2.75h8.75L19 7v13.25A1.75 1.75 0 0 1 17.25 22h-11.5A1.75 1.75 0 0 1 4 20.25V4.5a1.75 1.75 0 0 1 2-1.75Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 2.75V7H19" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h8M8 14.5h8M8 18h5" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2.75 13.9 9.1 20.25 11 13.9 12.9 12 19.25 10.1 12.9 3.75 11l6.35-1.9L12 2.75Z" strokeLinejoin="round" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13.5v5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.75 13h8.5L17 7M10 10.5v6M14 10.5v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BusinessKnowledgeCard({
  calendarId,
  aiActive,
  businessSummary,
  summaryUpdatedAt,
  lastResearchedAt,
  documents,
}: BusinessKnowledgeCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uploadOne = async (file: File) => {
    const presignRes = await fetch(
      `/api/calendars/${calendarId}/business-documents/upload-presign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      }
    );

    const presignData = await presignRes.json();

    if (!presignRes.ok) {
      throw new Error(presignData.error ?? "Failed to start upload");
    }

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file");
    }

    const completeRes = await fetch(
      `/api/calendars/${calendarId}/business-documents/upload-complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: presignData.fileKey,
          originalName: file.name,
          contentType: file.type,
        }),
      }
    );

    const completeData = await completeRes.json();

    if (!completeRes.ok) {
      throw new Error(completeData.error ?? "Failed to process document");
    }

    return completeData;
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      let anyFailedToFold = false;

      for (const file of Array.from(files)) {
        const result = await uploadOne(file);

        if (result?.summaryUpdated === false) {
          anyFailedToFold = true;
        }
      }

      if (anyFailedToFold) {
        setError(
          "The document uploaded, but AI couldn't process it into a summary. Try again in a moment."
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    setDeletingId(documentId);
    setError(null);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/business-documents/${documentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove document");
      }

      setConfirmingDeleteId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  };

  const updated = formatDate(summaryUpdatedAt);
  const researched = formatDate(lastResearchedAt);

  if (!aiActive) {
    return (
      <section className="relative w-full overflow-hidden rounded-[30px] border border-[#DCE5F2] bg-[#0A101A] shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2478FF]/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#2478FF]/8 blur-3xl" />

        <div className="relative p-6 sm:p-8 lg:p-9">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2478FF]/20 bg-[#2478FF]/10 text-[#69A0FF] shadow-[0_10px_30px_rgba(36,120,255,0.12)]">
                <SparkIcon />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78A9F8]">
                  AI add-on
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                  Teach Showwork the business.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#AAB7C8]">
                  Give the assistant the context it needs to understand this
                  client, research their space, and build better content plans.
                </p>
              </div>
            </div>

            <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
              Premium
            </span>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            {[
              ["01", "Business context"],
              ["02", "AI research"],
              ["03", "Content planning"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5"
              >
                <p className="text-[9px] font-bold tracking-[0.12em] text-[#52729E]">
                  {number}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/[0.07] bg-[#0D1520]/90 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-8">
          <div>
            <p className="text-xs font-semibold text-white">Unlock AI business knowledge</p>
            <p className="mt-1 text-[10px] leading-5 text-[#718096]">
              Activate the premium content assistant for this workspace.
            </p>
          </div>

          <a
            href="/dashboard/calendars"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#2478FF] px-5 py-3 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(36,120,255,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] sm:mt-0 sm:w-auto"
          >
            Activate AI
            <span className="ml-2">→</span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden rounded-[30px] border border-[#DCE3EC] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#2478FF]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-1/2 bg-gradient-to-r from-[#2478FF]/[0.025] to-transparent" />

      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2478FF]/15 bg-[#EEF5FF] text-[#2478FF]">
              <SparkIcon />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#101828] sm:text-xl">
                  AI business knowledge
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7E4CD] bg-[#ECFDF3] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#027A48]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                  Active
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-[#667085]">
                Your AI context for this client workspace.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2">
            <FileIcon />
            <span className="text-[11px] font-semibold text-[#475467]">
              {documents.length} {documents.length === 1 ? "source" : "sources"}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FFF7F7] px-4 py-3.5 text-[11px] leading-5 text-[#B42318]"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F04438]" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="min-w-0 rounded-[22px] border border-[#E4E7EC] bg-[#F8FAFC] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#667085]">
                  Current understanding
                </p>
                <p className="mt-1 text-sm font-semibold text-[#101828]">
                  What the AI knows about this business
                </p>
              </div>

              {businessSummary && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((value) => !value)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D9E2EF] bg-white px-2.5 py-2 text-[10px] font-semibold text-[#2478FF] transition-colors hover:border-[#B9D2FA] hover:bg-[#F5F9FF]"
                >
                  {summaryExpanded ? "Collapse" : "Read summary"}
                  <ChevronIcon open={summaryExpanded} />
                </button>
              )}
            </div>

            {businessSummary ? (
              <p
                className={`mt-4 whitespace-pre-wrap text-xs leading-6 text-[#475467] ${
                  summaryExpanded ? "" : "line-clamp-4"
                }`}
              >
                {businessSummary}
              </p>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#D5DCE5] bg-white px-4 py-5">
                <p className="text-xs font-medium text-[#475467]">
                  No business summary yet.
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#98A2B3]">
                  Upload a business document and Showwork will use it to build
                  context for this client.
                </p>
              </div>
            )}

            {(updated || researched) && (
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#E4E7EC] pt-4">
                {updated && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                      Knowledge updated
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#667085]">
                      {updated}
                    </p>
                  </div>
                )}

                {researched && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                      Last research
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#667085]">
                      {researched}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-[#E4E7EC] bg-white p-5 sm:p-6">
            <div className="flex h-full flex-col">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#667085]">
                Knowledge base
              </p>
              <p className="mt-1 text-sm font-semibold text-[#101828]">
                Give the assistant more context
              </p>
              <p className="mt-2 text-[11px] leading-5 text-[#667085]">
                Upload brand guidelines, product information, service details,
                briefs, or other useful business documents.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-3 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(36,120,255,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadIcon />
                {uploading ? "Uploading & reading…" : "Add business documents"}
              </button>

              <p className="mt-2 text-center text-[9px] font-medium text-[#98A2B3]">
                PDF, Word or plain text
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) {
              void handleFiles(event.target.files);
              event.currentTarget.value = "";
            }
          }}
        />

        {documents.length > 0 && (
          <div className="mt-5 rounded-[22px] border border-[#E4E7EC] bg-white">
            <button
              type="button"
              onClick={() => setDocumentsExpanded((value) => !value)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#667085]">
                  <FileIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#101828]">
                    Uploaded sources
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-[#98A2B3]">
                    {documents.length} {documents.length === 1 ? "document" : "documents"} available to the AI
                  </p>
                </div>
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] text-[#667085]">
                <ChevronIcon open={documentsExpanded} />
              </span>
            </button>

            {documentsExpanded && (
              <div className="border-t border-[#EEF0F3] px-4 pb-4 pt-2 sm:px-5">
                <div className="divide-y divide-[#EEF0F3]">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex min-w-0 items-center gap-3 py-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#667085]">
                        <FileIcon />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[11px] font-medium text-[#344054]"
                          title={doc.originalName}
                        >
                          {doc.originalName}
                        </p>
                        <p className="mt-0.5 text-[9px] text-[#98A2B3]">
                          Added {formatDate(doc.createdAt)}
                        </p>
                      </div>

                      {confirmingDeleteId === doc.id ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void removeDocument(doc.id)}
                            disabled={deletingId === doc.id}
                            className="rounded-lg bg-[#D92D20] px-2.5 py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-[#B42318] disabled:opacity-50"
                          >
                            {deletingId === doc.id ? "Removing…" : "Remove"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={deletingId === doc.id}
                            className="rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-[#667085] hover:bg-[#F2F4F7] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(doc.id)}
                          aria-label={`Remove ${doc.originalName}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#FFF1F0] hover:text-[#D92D20]"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
