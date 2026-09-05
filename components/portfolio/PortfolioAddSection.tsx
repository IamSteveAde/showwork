"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";
import { detectLocalFileAspectRatio } from "@/lib/detectLocalFileAspectRatio";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "type" | "details";

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
function progressStorageKey(sectionName: string): string {
  return `showwork-portfolio-upload-progress:${sectionName.trim().toLowerCase()}`;
}
function getCompletedFingerprints(sectionName: string): Set<string> {
  try {
    const raw = localStorage.getItem(progressStorageKey(sectionName));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function markFingerprintCompleted(sectionName: string, fingerprint: string) {
  const key = progressStorageKey(sectionName);
  const current = getCompletedFingerprints(sectionName);
  current.add(fingerprint);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}
function clearProgress(sectionName: string) {
  try {
    localStorage.removeItem(progressStorageKey(sectionName));
  } catch {
    // ignore
  }
}

interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(sectionName: string, fingerprint: string): string {
  return `showwork-portfolio-multipart:${sectionName.trim().toLowerCase()}:${fingerprint}`;
}
function getMultipartProgress(sectionName: string, fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(sectionName, fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(sectionName: string, fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(sectionName, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore
  }
}
function clearMultipartProgress(sectionName: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(sectionName, fingerprint));
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

export default function PortfolioAddSection({ hasSections }: { hasSections: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [sectionName, setSectionName] = useState("");
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
    setMediaType(null);
    setSectionName("");
    setFiles([]);
    setResumedCount(0);
    setStatus(null);
    setChunkStatus(null);
    setError(null);
    setSkippedFiles([]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const chooseType = (type: MediaType) => {
    setMediaType(type);
    setError(null);
    setStep("details");
  };

  const handleFileSelection = (selectedFiles: File[]) => {
    if (selectedFiles.length > 20) {
      const proceed = window.confirm(
        `You've selected ${selectedFiles.length} files. Uploading that many at once in one browser tab can occasionally crash on lower-memory devices — consider uploading in two smaller batches instead. Continue anyway?`
      );
      if (!proceed) return;
    }
    if (sectionName.trim()) {
      const completed = getCompletedFingerprints(sectionName);
      setResumedCount(selectedFiles.filter((f) => completed.has(fileFingerprint(f))).length);
    }
    setFiles(selectedFiles);
  };

  const handleSectionNameChange = (value: string) => {
    setSectionName(value);
    if (files.length > 0 && value.trim()) {
      const completed = getCompletedFingerprints(value);
      setResumedCount(files.filter((f) => completed.has(fileFingerprint(f))).length);
    } else {
      setResumedCount(0);
    }
  };

    const uploadOneFileWithRetry = async (
    file: File,
    sectionId: string,
    onProgress: (percent: number) => void
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
      try {
        const presignRes = await fetch("/api/portfolio/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error ?? "presign failed");

               await uploadWithProgress(presignData.uploadUrl, file, (loaded, total) => {
          onProgress(Math.round((loaded / total) * 100));
        });

        // Read from the local file, not the network — this already
        // finished (or resolved to null) well before the upload
        // above even completed, so it adds no real wait here.
        const aspectRatio = await detectLocalFileAspectRatio(file);

        const completeRes = await fetch("/api/portfolio/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: presignData.fileKey, type: mediaType, sectionId, aspectRatio }),
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
    sectionId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getMultipartProgress(sectionName, fingerprint);
    if (!progress) {
      const startRes = await fetch("/api/portfolio/upload/multipart-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) return { ok: false, error: startData.error ?? "Failed to start large-file upload" };
      progress = { fileKey: startData.fileKey, uploadId: startData.uploadId, completedParts: [] };
      saveMultipartProgress(sectionName, fingerprint, progress);
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
          const etag = await uploadPartWithProgress(signData.uploadUrl, chunk, (loaded) => {
            const percent = Math.min(100, Math.round(((completedCount * chunkSizeBytes + loaded) / file.size) * 100));
            setChunkStatus(`${percent}% uploaded`);
          });

          progress!.completedParts.push({ partNumber, etag });
          saveMultipartProgress(sectionName, fingerprint, progress!);
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

       const aspectRatio = await detectLocalFileAspectRatio(file);

    const completeRes = await fetch("/api/portfolio/upload/multipart-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        type: mediaType,
        sectionId,
        aspectRatio,
      }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) return { ok: false, error: completeData.error ?? "Failed to finalize large file" };

    clearMultipartProgress(sectionName, fingerprint);
    return { ok: true };
  };

  const handleUpload = async () => {
    if (!mediaType) return;
    if (!sectionName.trim()) { setError("Give this section a name"); return; }
    if (files.length === 0) { setError("Choose at least one file"); return; }
    setError(null);
    setSkippedFiles([]);
    setUploading(true);

    try {
      const sectionRes = await fetch("/api/portfolio/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName, mediaType }),
      });
      if (!sectionRes.ok) {
        const data = await sectionRes.json();
        throw new Error(data.error ?? "Couldn't create section");
      }
      const { section } = await sectionRes.json();

      const completed = getCompletedFingerprints(sectionName);
      const filesToUpload = files.filter((f) => !completed.has(fileFingerprint(f)));
      const failedFiles: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

        setStatus(`Uploading ${i + 1} of ${filesToUpload.length}${resumedCount > 0 ? ` (${resumedCount} already done)` : ""}...`);
        setChunkStatus(null);

                const result = isLarge
          ? await uploadLargeFileMultipart(file, section.id)
          : await uploadOneFileWithRetry(file, section.id, (percent) =>
              setStatus(`Uploading ${i + 1} of ${filesToUpload.length} — ${percent}% uploaded...`)
            );

        if (result.ok) {
          markFingerprintCompleted(sectionName, fileFingerprint(file));
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

      clearProgress(sectionName);
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
    return hasSections ? (
      <button
        onClick={() => setStep("type")}
        className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold transition-transform hover:scale-[1.01]"
        style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}
      >
        + Have something new to add? Add a different section
      </button>
    ) : (
      <button
        onClick={() => setStep("type")}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors hover:border-white/30"
        style={{ borderColor: "rgba(245,200,66,0.3)", background: "rgba(245,200,66,0.04)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "#F5C842" }}>+ Add your first section</span>
        <span className="max-w-sm text-xs text-white/40">
          A section is whatever you're showcasing — "Weddings," "Brand Films," "Case Studies." Add as many as you need, anytime.
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
      {step === "type" && (
        <>
          <p className="text-sm font-semibold text-white/70">What are you adding?</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { type: "PHOTO" as const, icon: "🖼️", label: "Images", sub: "Photos, renders, mockups" },
              { type: "VIDEO" as const, icon: "🎬", label: "Videos", sub: "Films, reels, showreels" },
              { type: "DOCUMENT" as const, icon: "📄", label: "Documents", sub: "Word docs (.docx)" },
              { type: "PDF" as const, icon: "📕", label: "PDFs", sub: "Case studies, decks" },
            ]).map((opt) => (
              <button
                key={opt.type}
                onClick={() => chooseType(opt.type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-semibold text-white">{opt.label}</span>
                <span className="text-xs text-white/40">{opt.sub}</span>
              </button>
            ))}
          </div>
          <button onClick={reset} className="text-left text-xs text-white/40 underline">Cancel</button>
        </>
      )}

      {step === "details" && (
        <>
          <p className="text-xs font-semibold text-white/70">
            {mediaType === "VIDEO" ? "🎬 Videos" : mediaType === "PHOTO" ? "🖼️ Images" : mediaType === "PDF" ? "📕 PDFs" : "📄 Documents"} — name this section
          </p>
          <input
            type="text"
            value={sectionName}
            onChange={(e) => handleSectionNameChange(e.target.value)}
            placeholder={mediaType === "VIDEO" ? "e.g. Showreel" : "e.g. Recent Weddings"}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
          />
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={
              mediaType === "VIDEO" ? "video/mp4,video/quicktime,video/webm"
              : mediaType === "PHOTO" ? "image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
              : mediaType === "PDF" ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
            onChange={(e) => handleFileSelection(Array.from(e.target.files ?? []))}
            className="hidden"
            id="portfolio-builder-files"
          />
          <label htmlFor="portfolio-builder-files" className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-white/50 hover:border-white/25">
            {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} selected — click to change` : "Choose files"}
          </label>
          {files.length > 0 && resumedCount > 0 && (
            <p className="text-xs" style={{ color: "#4ade80" }}>
              {resumedCount} already uploaded from a previous attempt, will be skipped
            </p>
          )}

                    {uploading && <UploadPatienceBanner active={uploading} />}
          {chunkStatus && <p className="text-xs font-semibold" style={{ color: "#F5C842" }}>{chunkStatus}</p>}

          <div className="flex items-center gap-3">
            <button onClick={handleUpload} disabled={uploading} className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: "#F5C842", color: "#0A0A0A" }}>
              {uploading ? (status ?? "Uploading...") : skippedFiles.length > 0 ? "Retry remaining" : "✓ Save section"}
            </button>
            <button onClick={reset} className="text-xs text-white/40 underline">Cancel</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {skippedFiles.length > 0 && (
            <div className="rounded-lg p-3 text-xs text-white/60" style={{ background: "rgba(249,115,22,0.1)" }}>
              <p className="mb-1 font-semibold" style={{ color: "#F97316" }}>Failed after retrying:</p>
              {skippedFiles.map((name) => (
                <p key={name} className="truncate">{name}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}