"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";

type MediaKind = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";

function uploadWithProgress(url: string, file: File | Blob, onProgress: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
function uploadPartWithProgress(url: string, chunk: Blob, onProgress: (loaded: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
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
interface ReplaceMultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartKey(mediaId: string, fingerprint: string): string {
  return `showwork-replace-multipart:${mediaId}:${fingerprint}`;
}
function getMultipartProgress(mediaId: string, fingerprint: string): ReplaceMultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartKey(mediaId, fingerprint));
    return raw ? (JSON.parse(raw) as ReplaceMultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(mediaId: string, fingerprint: string, progress: ReplaceMultipartProgress) {
  try {
    localStorage.setItem(multipartKey(mediaId, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore
  }
}
function clearMultipartProgress(mediaId: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartKey(mediaId, fingerprint));
  } catch {
    // ignore
  }
}

const MULTIPART_THRESHOLD_MB = 100;
const CHUNK_SIZE_MB = 200;
const CHUNK_CONCURRENCY = 2;
const MAX_RETRIES_PER_CHUNK = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ReplaceFileButton({
  mediaId,
  type,
  label,
}: {
  mediaId: string;
  type: MediaKind;
  label: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [chunkStatus, setChunkStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept =
    type === "VIDEO"
      ? "video/mp4,video/quicktime,video/webm"
      : type === "PHOTO"
        ? "image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
        : type === "PDF"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const uploadLargeFile = async (file: File): Promise<void> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getMultipartProgress(mediaId, fingerprint);
    if (!progress) {
      const startRes = await fetch(`/api/media/${mediaId}/replace/multipart-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error ?? "Failed to start large-file upload");
      progress = { fileKey: startData.fileKey, uploadId: startData.uploadId, completedParts: [] };
      saveMultipartProgress(mediaId, fingerprint, progress);
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
          const signRes = await fetch(`/api/media/${mediaId}/replace/multipart-sign-part`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileKey: progress!.fileKey, uploadId: progress!.uploadId, partNumber }),
          });
          const signData = await signRes.json();
          if (!signRes.ok) throw new Error(signData.error ?? "Failed to sign chunk");

          const etag = await uploadPartWithProgress(signData.uploadUrl, chunk, (loaded) => reportChunkProgress(partNumber, loaded));

          progress!.completedParts.push({ partNumber, etag });
          saveMultipartProgress(mediaId, fingerprint, progress!);
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

    if (firstError) throw new Error(firstError);

    const completeRes = await fetch(`/api/media/${mediaId}/replace/multipart-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: progress.fileKey, uploadId: progress.uploadId, parts: progress.completedParts }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to finalize large file");

    clearMultipartProgress(mediaId, fingerprint);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setChunkStatus(null);
    setUploading(true);
    setStatus("Uploading 0%");

    try {
      const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

      if (isLarge) {
        await uploadLargeFile(file);
      } else {
        const presignRes = await fetch(`/api/media/${mediaId}/replace/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSizeMb: file.size / (1024 * 1024),
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json();
          throw new Error(data.error ?? "Failed to start upload");
        }
        const { uploadUrl, fileKey } = await presignRes.json();

        await uploadWithProgress(uploadUrl, file, (loaded, total) => {
          setStatus(`Uploading ${Math.round((loaded / total) * 100)}%`);
        });

        const completeRes = await fetch(`/api/media/${mediaId}/replace/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey }),
        });
        if (!completeRes.ok) throw new Error("Failed to save the replacement");
      }

      setStatus("Done — refreshing...");
      router.refresh();
      setTimeout(() => setStatus(null), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus(null);
    } finally {
      setUploading(false);
      setChunkStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-2">
      {uploading && <UploadPatienceBanner active={uploading} />}
      {chunkStatus && <p className="mb-1.5 mt-1.5 text-[11px] text-white/40">{chunkStatus}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
        id={`replace-${mediaId}`}
      />
      <label
        htmlFor={`replace-${mediaId}`}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
        style={{ background: "rgba(245,200,66,0.12)", color: "#F5C842" }}
      >
        {status ?? label}
      </label>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}