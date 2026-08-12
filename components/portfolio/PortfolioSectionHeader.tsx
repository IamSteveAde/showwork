"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";

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
function progressStorageKey(sectionId: string): string {
  return `showwork-portfolio-section-progress:${sectionId}`;
}
function getCompletedFingerprints(sectionId: string): Set<string> {
  try {
    const raw = localStorage.getItem(progressStorageKey(sectionId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function markFingerprintCompleted(sectionId: string, fingerprint: string) {
  const key = progressStorageKey(sectionId);
  const current = getCompletedFingerprints(sectionId);
  current.add(fingerprint);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}
function clearProgress(sectionId: string) {
  try {
    localStorage.removeItem(progressStorageKey(sectionId));
  } catch {
    // ignore
  }
}

interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(sectionId: string, fingerprint: string): string {
  return `showwork-portfolio-section-multipart:${sectionId}:${fingerprint}`;
}
function getMultipartProgress(sectionId: string, fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(sectionId, fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(sectionId: string, fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(sectionId, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore
  }
}
function clearMultipartProgress(sectionId: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(sectionId, fingerprint));
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

export default function PortfolioSectionHeader({
  sectionId,
  name,
  mediaType,
  fileCount,
}: {
  sectionId: string;
  name: string;
  mediaType: MediaType;
  fileCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [chunkStatus, setChunkStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!value.trim() || value.trim() === name) { setEditing(false); setValue(name); return; }
    setSaving(true);
    await fetch(`/api/portfolio/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const uploadOneFileWithRetry = async (file: File): Promise<{ ok: true } | { ok: false; error: string }> => {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
      try {
        const presignRes = await fetch("/api/portfolio/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error ?? "presign failed");

        await uploadWithProgress(presignData.uploadUrl, file, () => {});

        const completeRes = await fetch("/api/portfolio/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: presignData.fileKey, type: mediaType, sectionId }),
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

  const uploadLargeFileMultipart = async (file: File): Promise<{ ok: true } | { ok: false; error: string }> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getMultipartProgress(sectionId, fingerprint);
    if (!progress) {
      const startRes = await fetch("/api/portfolio/upload/multipart-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) return { ok: false, error: startData.error ?? "Failed to start large-file upload" };
      progress = { fileKey: startData.fileKey, uploadId: startData.uploadId, completedParts: [] };
      saveMultipartProgress(sectionId, fingerprint, progress);
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
          const signRes = await fetch("/api/portfolio/upload/multipart-sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileKey: progress!.fileKey, uploadId: progress!.uploadId, partNumber }),
          });
          const signData = await signRes.json();
          if (!signRes.ok) throw new Error(signData.error ?? "Failed to sign chunk");

          const etag = await uploadPartWithProgress(signData.uploadUrl, chunk, () => {});

          progress!.completedParts.push({ partNumber, etag });
          saveMultipartProgress(sectionId, fingerprint, progress!);
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

    const completeRes = await fetch("/api/portfolio/upload/multipart-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        type: mediaType,
        sectionId,
      }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) return { ok: false, error: completeData.error ?? "Failed to finalize large file" };

    clearMultipartProgress(sectionId, fingerprint);
    return { ok: true };
  };

  // No session cap here at all — portfolio uploads are unlimited by
  // design, unlike the project delivery flow's 3-batch limit.
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > 20) {
      const proceed = window.confirm(
        `You've selected ${selectedFiles.length} files. Uploading that many at once in one browser tab can occasionally crash on lower-memory devices — consider uploading in two smaller batches instead. Continue anyway?`
      );
      if (!proceed) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploadError(null);
    setUploading(true);

    try {
      const completed = getCompletedFingerprints(sectionId);
      const filesToUpload = selectedFiles.filter((f) => !completed.has(fileFingerprint(f)));
      const failedFiles: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

        setUploadStatus(`Uploading ${i + 1} of ${filesToUpload.length}...`);
        setChunkStatus(null);

        const result = isLarge ? await uploadLargeFileMultipart(file) : await uploadOneFileWithRetry(file);

        if (result.ok) {
          markFingerprintCompleted(sectionId, fileFingerprint(file));
        } else {
          failedFiles.push(`${file.name} (${result.error})`);
        }

        await sleep(INTER_FILE_PAUSE_MS);

        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < filesToUpload.length) {
          setUploadStatus("Pausing briefly before the next batch...");
          await sleep(INTER_BATCH_PAUSE_MS);
        }
      }

      if (failedFiles.length > 0) {
        setUploadError(
          `${filesToUpload.length - failedFiles.length} of ${filesToUpload.length} uploaded. ${failedFiles.length} failed — re-select the same files to resume just those.`
        );
        setUploadStatus(null);
        setChunkStatus(null);
        return;
      }

      clearProgress(sectionId);
      setUploadStatus("Done");
      router.refresh();
      setTimeout(() => setUploadStatus(null), 1200);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong");
      setUploadStatus(null);
      setChunkStatus(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteSection = async () => {
    setDeleting(true);
    const res = await fetch(`/api/portfolio/sections/${sectionId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else { setDeleting(false); setConfirmingDelete(false); }
  };

  if (editing) {
    return (
      <div className="mb-4 flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ fontSize: "16px" }}
          className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
        />
        <button onClick={save} disabled={saving} className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#F5C842", color: "#0A0A0A" }}>
          {saving ? "..." : "Save"}
        </button>
        <button onClick={() => { setEditing(false); setValue(name); }} className="text-xs text-white/40 underline">Cancel</button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
          {name} ({fileCount})
        </h2>
        <button onClick={() => setEditing(true)} className="text-xs text-white/30 underline hover:text-white/60">Rename</button>
        <span className="text-white/15">·</span>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptFor(mediaType)}
          onChange={handleAddFiles}
          className="hidden"
          id={`portfolio-add-${sectionId}`}
        />
        <label htmlFor={`portfolio-add-${sectionId}`} className="cursor-pointer text-xs font-semibold underline" style={{ color: "#F5C842" }}>
          {uploading ? (uploadStatus ?? "Uploading...") : "+ Add files"}
        </label>

        <span className="text-white/15">·</span>

        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-white/50">Permanently delete this section and its files?</span>
            <button onClick={handleDeleteSection} disabled={deleting} className="rounded-md bg-red-500 px-2 py-1 font-semibold text-white disabled:opacity-50">
              {deleting ? "..." : "Confirm"}
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-white/40 underline">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="text-xs text-red-400/70 underline hover:text-red-400">
            Delete section
          </button>
        )}
      </div>

      {uploading && (
        <div className="mt-2">
          <UploadPatienceBanner active={uploading} />
          {chunkStatus && <p className="mt-1.5 text-[11px] text-white/40">{chunkStatus}</p>}
        </div>
      )}
      {uploadError && <p className="mt-1.5 text-xs text-red-400">{uploadError}</p>}
    </div>
  );
}