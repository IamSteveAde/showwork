"use client";

import { useState, useRef } from "react";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";

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
function progressStorageKey(scopeKey: string): string {
  return `showwork-task-subsection-progress:${scopeKey}`;
}
function getCompletedFingerprints(scopeKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(progressStorageKey(scopeKey));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function markFingerprintCompleted(scopeKey: string, fingerprint: string) {
  const key = progressStorageKey(scopeKey);
  const current = getCompletedFingerprints(scopeKey);
  current.add(fingerprint);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}
function clearProgress(scopeKey: string) {
  try {
    localStorage.removeItem(progressStorageKey(scopeKey));
  } catch {
    // ignore
  }
}

interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(scopeKey: string, fingerprint: string): string {
  return `showwork-task-subsection-multipart:${scopeKey}:${fingerprint}`;
}
function getMultipartProgress(scopeKey: string, fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(scopeKey, fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(scopeKey: string, fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(scopeKey, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore
  }
}
function clearMultipartProgress(scopeKey: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(scopeKey, fingerprint));
  } catch {
    // ignore
  }
}

const MULTIPART_THRESHOLD_MB = 100;
const CHUNK_SIZE_MB = 200;
const CHUNK_CONCURRENCY = 2;
const MAX_RETRIES_PER_FILE = 2;
const MAX_RETRIES_PER_CHUNK = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function detectType(file: File): string {
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("image/")) return "PHOTO";
  return "DOCUMENT";
}

/**
 * A real, standalone action for creating a named sub-section within
 * a single task's own uploaded work — e.g. "Round 1" and "Round 2" as
 * two separate sub-sections under the same task, each holding their
 * own files. Same weight and shape as the delivery-side AddSubSection,
 * scoped to a task instead of a section.
 */
export default function AddTaskSubSection({ taskId, onChanged }: { taskId: string; onChanged: () => void }) {
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
      const completed = getCompletedFingerprints(`${taskId}:${subSectionName.trim().toLowerCase()}`);
      setResumedCount(selectedFiles.filter((f) => completed.has(fileFingerprint(f))).length);
    }
    setFiles(selectedFiles);
  };

  const handleNameChange = (value: string) => {
    setSubSectionName(value);
    if (files.length > 0 && value.trim()) {
      const completed = getCompletedFingerprints(`${taskId}:${value.trim().toLowerCase()}`);
      setResumedCount(files.filter((f) => completed.has(fileFingerprint(f))).length);
    } else {
      setResumedCount(0);
    }
  };

  const uploadOneFileWithRetry = async (file: File, folderId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const type = detectType(file);
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
      try {
        const presignRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

        await uploadWithProgress(presignData.uploadUrl, file, () => {});

        const completeRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: presignData.fileKey, filename: file.name, type, folderId }),
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to save upload");
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
    const type = detectType(file);
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getMultipartProgress(scopeKey, fingerprint);
    if (!progress) {
      const startRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-multipart-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
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
    let firstError: string | null = null;

    const uploadOneChunk = async (partNumber: number): Promise<void> => {
      if (firstError) return;
      setChunkStatus(`${completedCount} of ${totalChunks} chunks done`);

      const start = (partNumber - 1) * chunkSizeBytes;
      const end = Math.min(start + chunkSizeBytes, file.size);
      const chunk = file.slice(start, end);

      let chunkSucceeded = false;
      let lastError = "Upload failed";

      for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
        try {
          const signRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-multipart-sign-part`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileKey: progress!.fileKey, uploadId: progress!.uploadId, partNumber }),
          });
          const signData = await signRes.json();
          if (!signRes.ok) throw new Error(signData.error ?? "Failed to sign chunk");

          const etag = await uploadPartWithProgress(signData.uploadUrl, chunk, () => {});

          progress!.completedParts.push({ partNumber, etag });
          saveMultipartProgress(scopeKey, fingerprint, progress!);
          completedCount++;
          setChunkStatus(`${completedCount} of ${totalChunks} chunks done`);

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

    const completeRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-multipart-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        filename: file.name,
        type,
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

    const scopeKey = `${taskId}:${subSectionName.trim().toLowerCase()}`;

    try {
      const folderRes = await fetch(`/api/managed-projects/tasks/${taskId}/folders`, {
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

        await sleep(150);
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
      onChanged();
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
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[11px] font-semibold transition-colors hover:bg-white/5"
        style={{ borderColor: "rgba(36,120,255,0.3)", color: "#2478FF" }}
      >
        + Add sub-section
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg p-3" style={{ background: "rgba(36,120,255,0.05)", border: "1px solid rgba(36,120,255,0.2)" }}>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Sub-section name
        </label>
        <input
          type="text"
          value={subSectionName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Round 1 drafts"
          autoFocus
          style={{ fontSize: "16px" }}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-white/25"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Files
        </label>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelection(Array.from(e.target.files ?? []))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-white"
        />
        {files.length > 0 && (
          <p className="mt-1 text-[10px] text-white/40">
            {files.length} file{files.length === 1 ? "" : "s"} selected
            {resumedCount > 0 && <span style={{ color: "#4ade80" }}> — {resumedCount} already done, will be skipped</span>}
          </p>
        )}
      </div>

      {uploading && <UploadPatienceBanner active={uploading} />}
      {chunkStatus && <p className="text-[10px] text-white/40">{chunkStatus}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {skippedFiles.length > 0 && (
        <div className="rounded-md p-2 text-[10px] text-white/60" style={{ background: "rgba(249,115,22,0.1)" }}>
          <p className="mb-1 font-semibold" style={{ color: "#F97316" }}>Failed after retrying:</p>
          {skippedFiles.map((name) => (
            <p key={name} className="truncate">{name}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <button
          onClick={handleCreate}
          disabled={uploading}
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
        >
          {uploading ? (status ?? "Uploading...") : skippedFiles.length > 0 ? "Retry remaining" : "Create sub-section"}
        </button>
        <button onClick={reset} disabled={uploading} className="text-[11px] font-semibold text-white/40 hover:text-white disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}