"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "details";

function uploadWithProgress(url: string, file: File | Blob, onProgress: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
function uploadPartWithProgress(url: string, chunk: Blob, onProgress: (loaded: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("R2 didn't return an ETag for this chunk — check that ETag is listed under Access-Control-Expose-Headers in your R2 bucket's CORS settings."));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Chunk upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during chunk upload"));
    xhr.send(chunk);
  });
}

function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
function progressStorageKey(folderScopeId: string): string {
  return `showwork-subsection-upload-progress:${folderScopeId}`;
}
function getCompletedFingerprints(folderScopeId: string): Set<string> {
  try {
    const raw = localStorage.getItem(progressStorageKey(folderScopeId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function markFingerprintCompleted(folderScopeId: string, fingerprint: string) {
  const key = progressStorageKey(folderScopeId);
  const current = getCompletedFingerprints(folderScopeId);
  current.add(fingerprint);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}
function clearProgress(folderScopeId: string) {
  try {
    localStorage.removeItem(progressStorageKey(folderScopeId));
  } catch {
    // ignore
  }
}

interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(folderScopeId: string, fingerprint: string): string {
  return `showwork-subsection-multipart:${folderScopeId}:${fingerprint}`;
}
function getMultipartProgress(folderScopeId: string, fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(folderScopeId, fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(folderScopeId: string, fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(folderScopeId, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore
  }
}
function clearMultipartProgress(folderScopeId: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(folderScopeId, fingerprint));
  } catch {
    // ignore
  }
}

const MULTIPART_THRESHOLD_MB = 100;
const CHUNK_SIZE_MB = 200;
const CHUNK_CONCURRENCY = 2;
const BATCH_SIZE = 3;
const INTER_FILE_PAUSE_MS = 150;
const INTER_BATCH_PAUSE_MS = 3000;
const MAX_RETRIES_PER_FILE = 2;
const MAX_RETRIES_PER_CHUNK = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function acceptFor(mediaType: MediaType): string {
  if (mediaType === "VIDEO") return "video/mp4,video/quicktime,video/webm";
  if (mediaType === "PHOTO") return "image/jpeg,image/png,image/webp,image/svg+xml,image/avif";
  if (mediaType === "PDF") return "application/pdf";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/**
 * A real, standalone action for creating a named sub-section inside
 * an existing section — same weight and shape as creating a
 * top-level section elsewhere in this app, not a small picker
 * tucked into a corner. No type-picker step here, unlike a brand-new
 * section: a sub-section inherits its parent section's media type,
 * since it's still the same kind of work, just organized further —
 * a "Sonos Campaign" sub-section under a "Q3 Deliverables" section
 * holds the same kind of files the section already does.
 */
export default function AddSubSection({
  projectId,
  sectionId,
  mediaType,
}: {
  projectId: string;
  sectionId: string;
  mediaType: MediaType;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [subSectionName, setSubSectionName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [resumedCount, setResumedCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [chunkStatus, setChunkStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("closed");
    setSubSectionName("");
    setFiles([]);
    setResumedCount(0);
    setStatus(null);
    setChunkStatus(null);
    setError(null);
    setSkippedFiles([]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileSelection = (selectedFiles: File[]) => {
    if (selectedFiles.length > 20) {
      const proceed = window.confirm(
        `You've selected ${selectedFiles.length} files. Uploading that many at once in one browser tab can occasionally crash on lower-memory devices — consider uploading in two smaller batches instead. Continue anyway?`
      );
      if (!proceed) return;
    }
    if (subSectionName.trim()) {
      const completed = getCompletedFingerprints(`${sectionId}:${subSectionName.trim().toLowerCase()}`);
      setResumedCount(selectedFiles.filter((f) => completed.has(fileFingerprint(f))).length);
    }
    setFiles(selectedFiles);
  };

  const handleNameChange = (value: string) => {
    setSubSectionName(value);
    if (files.length > 0 && value.trim()) {
      const completed = getCompletedFingerprints(`${sectionId}:${value.trim().toLowerCase()}`);
      setResumedCount(files.filter((f) => completed.has(fileFingerprint(f))).length);
    } else {
      setResumedCount(0);
    }
  };

  const uploadOneFileWithRetry = async (
    file: File,
    folderId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
        });
                const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error ?? "presign failed");

        await uploadWithProgress(presignData.uploadUrl, file, (loaded, total) => {
          setChunkStatus(`${Math.round((loaded / total) * 100)}% uploaded`);
        });

        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, fileKey: presignData.fileKey, type: mediaType, sectionId, folderId }),
        });
        if (!completeRes.ok) throw new Error("Failed to save file");

        return { ok: true };
      } catch (err) {
        if (attempt === MAX_RETRIES_PER_FILE) {
          return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
        }
        await sleep(2000 * (attempt + 1));
      }
    }
    return { ok: false, error: "Upload failed" };
  };

  const uploadLargeFileMultipart = async (
    file: File,
    folderId: string,
    scopeKey: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getMultipartProgress(scopeKey, fingerprint);
    if (!progress) {
      const startRes = await fetch("/api/upload/multipart/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) return { ok: false, error: startData.error ?? "Failed to start large-file upload" };
      progress = { fileKey: startData.fileKey, uploadId: startData.uploadId, completedParts: [] };
      saveMultipartProgress(scopeKey, fingerprint, progress);
    }

    const completedPartNumbers = new Set(progress.completedParts.map((p) => p.partNumber));
    const remainingPartNumbers: number[] = [];
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      if (!completedPartNumbers.has(partNumber)) remainingPartNumbers.push(partNumber);
    }

    let completedCount = totalChunks - remainingPartNumbers.length;
    let totalLoadedBytes = completedPartNumbers.size * chunkSizeBytes;
    const perChunkLastReported = new Map<number, number>();
    const reportChunkProgress = (partNumber: number, loaded: number) => {
      const last = perChunkLastReported.get(partNumber) ?? 0;
      totalLoadedBytes += loaded - last;
      perChunkLastReported.set(partNumber, loaded);
      const percent = Math.min(100, Math.round((totalLoadedBytes / file.size) * 100));
      setChunkStatus(`${percent}% uploaded`);
    };
    let firstError: string | null = null;

    const uploadOneChunk = async (partNumber: number): Promise<void> => {
      if (firstError) return;

      const start = (partNumber - 1) * chunkSizeBytes;
      const end = Math.min(start + chunkSizeBytes, file.size);
      const chunk = file.slice(start, end);

      let chunkSucceeded = false;
      let lastError = "Upload failed";

      for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
        try {
          const signRes = await fetch("/api/upload/multipart/sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, fileKey: progress!.fileKey, uploadId: progress!.uploadId, partNumber }),
          });
          const signData = await signRes.json();
          if (!signRes.ok) throw new Error(signData.error ?? "Failed to sign chunk");

          const etag = await uploadPartWithProgress(signData.uploadUrl, chunk, (loaded) => reportChunkProgress(partNumber, loaded));

          progress!.completedParts.push({ partNumber, etag });
          saveMultipartProgress(scopeKey, fingerprint, progress!);
          completedCount++;

          chunkSucceeded = true;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Upload failed";
          if (attempt < MAX_RETRIES_PER_CHUNK) await sleep(2000 * (attempt + 1));
        }
      }
      if (!chunkSucceeded && !firstError) {
        firstError = `${lastError} (chunk ${partNumber} of ${totalChunks})`;
      }
    };

    const queue = [...remainingPartNumbers];
    const workers = Array.from({ length: CHUNK_CONCURRENCY }, async () => {
      while (queue.length > 0 && !firstError) {
        const partNumber = queue.shift();
        if (partNumber !== undefined) await uploadOneChunk(partNumber);
      }
    });
    await Promise.all(workers);

    if (firstError) return { ok: false, error: firstError };

    const completeRes = await fetch("/api/upload/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        type: mediaType,
        sectionId,
        folderId,
      }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) return { ok: false, error: completeData.error ?? "Failed to finalize large file" };

    clearMultipartProgress(scopeKey, fingerprint);
    return { ok: true };
  };

  const handleCreate = async () => {
    if (!subSectionName.trim()) { setError("Give this sub-section a name"); return; }
    if (files.length === 0) { setError("Choose at least one file"); return; }
    setError(null);
    setSkippedFiles([]);
    setUploading(true);

    const scopeKey = `${sectionId}:${subSectionName.trim().toLowerCase()}`;

    try {
      const folderRes = await fetch(`/api/sections/${sectionId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subSectionName.trim() }),
      });
      const folderData = await folderRes.json();
      if (!folderRes.ok) throw new Error(folderData.error ?? "Failed to create sub-section");
      const folderId = folderData.folder.id;

      const completed = getCompletedFingerprints(scopeKey);
      const filesToUpload = files.filter((f) => !completed.has(fileFingerprint(f)));
      const failedFiles: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

        setStatus(`Uploading ${i + 1} of ${filesToUpload.length}${resumedCount > 0 ? ` (${resumedCount} already done)` : ""}...`);
        setChunkStatus(null);

        const result = isLarge
          ? await uploadLargeFileMultipart(file, folderId, scopeKey)
          : await uploadOneFileWithRetry(file, folderId);

        if (result.ok) {
          markFingerprintCompleted(scopeKey, fileFingerprint(file));
        } else {
          failedFiles.push(`${file.name} (${result.error})`);
        }

        await sleep(INTER_FILE_PAUSE_MS);

        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < filesToUpload.length) {
          setStatus("Pausing briefly before the next batch...");
          await sleep(INTER_BATCH_PAUSE_MS);
        }
      }

      if (failedFiles.length > 0) {
        setSkippedFiles(failedFiles);
        setStatus(null);
        setError(
          `${filesToUpload.length - failedFiles.length} of ${filesToUpload.length} uploaded. ${failedFiles.length} failed — re-select the same files to resume just those.`
        );
        setUploading(false);
        return;
      }

      clearProgress(scopeKey);
      setStatus("Done");
      router.refresh();
      setTimeout(reset, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus(null);
    } finally {
      setUploading(false);
      setChunkStatus(null);
    }
  };

  if (step === "closed") {
    return (
      <button
        onClick={() => setStep("details")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-xs font-semibold transition-colors hover:bg-white/5"
        style={{ borderColor: "rgba(36,120,255,0.3)", color: "#2478FF" }}
      >
        + Add sub-section
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg p-4" style={{ background: "rgba(36,120,255,0.05)", border: "1px solid rgba(36,120,255,0.2)" }}>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Sub-section name
        </label>
        <input
          type="text"
          value={subSectionName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Sonos Campaign"
          autoFocus
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
        />
        <p className="mt-1.5 text-[11px] text-white/30">
          Your client will see this as its own sub-heading within this section, with its own set of files.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Files
        </label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptFor(mediaType)}
          onChange={(e) => handleFileSelection(Array.from(e.target.files ?? []))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        {files.length > 0 && (
          <p className="mt-1.5 text-xs text-white/40">
            {files.length} file{files.length === 1 ? "" : "s"} selected
            {resumedCount > 0 && (
              <span style={{ color: "#4ade80" }}> — {resumedCount} already uploaded from a previous attempt, will be skipped</span>
            )}
          </p>
        )}
      </div>

      {uploading && <UploadPatienceBanner active={uploading} />}
            {chunkStatus && <p className="text-xs font-semibold" style={{ color: "#2478FF" }}>{chunkStatus}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {skippedFiles.length > 0 && (
        <div className="rounded-lg p-3 text-xs text-white/60" style={{ background: "rgba(249,115,22,0.1)" }}>
          <p className="mb-1 font-semibold" style={{ color: "#F97316" }}>Failed after retrying:</p>
          {skippedFiles.map((name) => (
            <p key={name} className="truncate">{name}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
                <button
          onClick={handleCreate}
          disabled={uploading}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
        >
          {uploading ? (chunkStatus ?? status ?? "Uploading...") : skippedFiles.length > 0 ? "Retry remaining" : "Create sub-section"}
        </button>
        <button onClick={reset} disabled={uploading} className="text-xs font-semibold text-white/40 hover:text-white disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}