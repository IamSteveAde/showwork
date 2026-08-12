"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "type" | "details";

// ─────────────────────────────────────────────
// SINGLE-PUT UPLOAD — the original path, still used for anything
// under the multipart threshold. Unchanged from before.
// ─────────────────────────────────────────────
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
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

// ─────────────────────────────────────────────
// MULTIPART CHUNK UPLOAD — same XHR mechanism as above, but also
// captures the ETag R2 returns for that specific chunk on success.
// That ETag has to be reported back later, in completeMultipartUpload,
// for every single part — R2 uses it to verify each chunk arrived
// intact before assembling the final file.
// ─────────────────────────────────────────────
function uploadPartWithProgress(url: string, chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Upload succeeded but no ETag was returned"));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Part upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during part upload"));
    xhr.send(chunk);
  });
}

// ─────────────────────────────────────────────
// WHOLE-FILE RESUME — unchanged from before. Tracks which files
// (by fingerprint) have already fully succeeded, so re-selecting the
// same batch after a crash skips whatever's already done.
// ─────────────────────────────────────────────
function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
function progressStorageKey(projectId: string, sectionName: string): string {
  return `showwork-upload-progress:${projectId}:${sectionName.trim().toLowerCase()}`;
}
function getCompletedFingerprints(projectId: string, sectionName: string): Set<string> {
  try {
    const raw = localStorage.getItem(progressStorageKey(projectId, sectionName));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function markFingerprintCompleted(projectId: string, sectionName: string, fingerprint: string) {
  const key = progressStorageKey(projectId, sectionName);
  const current = getCompletedFingerprints(projectId, sectionName);
  current.add(fingerprint);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
    // Storage full or unavailable — resuming just won't work this
    // time, but it shouldn't block the actual upload from proceeding.
  }
}
function clearProgress(projectId: string, sectionName: string) {
  try {
    localStorage.removeItem(progressStorageKey(projectId, sectionName));
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// CHUNK-LEVEL RESUME — the real point of multipart, beyond just
// supporting bigger files. R2 keeps an in-progress multipart session
// alive server-side (identified by uploadId) even if the browser
// crashes mid-upload — so as long as this uploadId and the list of
// already-completed parts survive locally, resuming means picking up
// from the next missing chunk, not restarting a 10GB file from zero.
// ─────────────────────────────────────────────
interface MultipartProgress {
  uploadId: string;
  fileKey: string;
  totalParts: number;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(fingerprint: string): string {
  return `showwork-multipart-progress:${fingerprint}`;
}
function getMultipartProgress(fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(fingerprint), JSON.stringify(progress));
  } catch {
    // ignore — same reasoning as markFingerprintCompleted above
  }
}
function clearMultipartProgress(fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(fingerprint));
  } catch {
    // ignore
  }
}

// Files below this use the simple single-PUT path — multipart has
// real overhead (a session start, N signed URLs, a completion call)
// that isn't worth it for anything small.
const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE_BYTES = 200 * 1024 * 1024; // 200MB per chunk
const MAX_PART_RETRIES = 2;

const BATCH_SIZE = 3;
const INTER_FILE_PAUSE_MS = 150;
const INTER_BATCH_PAUSE_MS = 3000;
const MAX_RETRIES_PER_FILE = 2;

/**
 * Uploads one large file via multipart — slicing it into chunks,
 * uploading whichever ones aren't already done (per the saved
 * progress for this exact file), and completing the session once
 * every chunk succeeds. Called instead of the simple single-PUT path
 * whenever a file is over MULTIPART_THRESHOLD_BYTES.
 */
async function uploadLargeFileMultipart(
  file: File,
  projectId: string,
  mediaType: MediaType,
  sectionId: string,
  setStatus: (s: string) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fingerprint = fileFingerprint(file);
  const totalParts = Math.ceil(file.size / CHUNK_SIZE_BYTES);

  let progress = getMultipartProgress(fingerprint);

  // Resume only if the saved session genuinely matches this file
  // (same total part count) — if it doesn't, this isn't safely
  // resumable (a different file, or the chunking math changed) and
  // starting a fresh session is the only safe option.
  const canResume = progress && progress.totalParts === totalParts;

  if (!canResume) {
    try {
      const startRes = await fetch("/api/upload/multipart/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filename: file.name,
          contentType: file.type,
          fileSizeMb: file.size / (1024 * 1024),
        }),
      });
      if (!startRes.ok) {
        const data = await startRes.json();
        throw new Error(data.error ?? "Failed to start upload");
      }
      const { uploadId, fileKey } = await startRes.json();
      progress = { uploadId, fileKey, totalParts, completedParts: [] };
      saveMultipartProgress(fingerprint, progress);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to start upload" };
    }
  }

  const completedPartNumbers = new Set(progress!.completedParts.map((p) => p.partNumber));

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (completedPartNumbers.has(partNumber)) continue; // already done in a prior attempt

    const start = (partNumber - 1) * CHUNK_SIZE_BYTES;
    const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
    const chunk = file.slice(start, end);

    let succeeded = false;
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_PART_RETRIES; attempt++) {
      try {
        setStatus(`Uploading ${file.name} — part ${partNumber} of ${totalParts}...`);

        const signRes = await fetch("/api/upload/multipart/sign-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            fileKey: progress!.fileKey,
            uploadId: progress!.uploadId,
            partNumber,
          }),
        });
        if (!signRes.ok) {
          const data = await signRes.json();
          throw new Error(data.error ?? "Failed to sign part");
        }
        const { uploadUrl } = await signRes.json();

        const etag = await uploadPartWithProgress(uploadUrl, chunk);

        progress!.completedParts.push({ partNumber, etag });
        saveMultipartProgress(fingerprint, progress!);
        succeeded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Part upload failed";
        if (attempt < MAX_PART_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }

    if (!succeeded) {
      // Progress up to this point stays saved — the next attempt
      // (whether the person retries immediately or comes back later)
      // picks up from this exact chunk, not from zero.
      return { ok: false, error: `${file.name}: ${lastError}` };
    }
  }

  try {
    const completeRes = await fetch("/api/upload/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        fileKey: progress!.fileKey,
        uploadId: progress!.uploadId,
        parts: progress!.completedParts,
        type: mediaType,
        sectionId,
      }),
    });
    if (!completeRes.ok) {
      const data = await completeRes.json();
      throw new Error(data.error ?? "Failed to finalize upload");
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to finalize upload" };
  }

  // Only clear chunk-level progress once the file is genuinely,
  // fully done — the whole-file fingerprint (handled by the caller)
  // is what the batch-level resume logic checks separately.
  clearMultipartProgress(fingerprint);
  return { ok: true };
}

/**
 * Adds a new named section to a project — the "what are you uploading"
 * flow: pick Images or Videos, name the section in your own words
 * ("Room Renders," "Logo Concepts," "Ceremony Highlights" — whatever
 * fits the actual work), then upload the files for it.
 */
export default function AddMoreFilesButton({
  projectId,
  remaining,
}: {
  projectId: string;
  remaining: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("closed");
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [resumedCount, setResumedCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setStep("closed");
    setMediaType(null);
    setSectionName("");
    setFiles([]);
    setResumedCount(0);
    setStatus(null);
    setError(null);
    setSkippedFiles([]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePickType = (type: MediaType) => {
    setMediaType(type);
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
      const completed = getCompletedFingerprints(projectId, sectionName);
      const alreadyDoneCount = selectedFiles.filter((f) => completed.has(fileFingerprint(f))).length;
      setResumedCount(alreadyDoneCount);
    }

    setFiles(selectedFiles);
  };

  const handleSectionNameChange = (value: string) => {
    setSectionName(value);
    if (files.length > 0 && value.trim()) {
      const completed = getCompletedFingerprints(projectId, value);
      const alreadyDoneCount = files.filter((f) => completed.has(fileFingerprint(f))).length;
      setResumedCount(alreadyDoneCount);
    } else {
      setResumedCount(0);
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const uploadOneFileWithRetry = async (
    file: File,
    sectionId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    // Large files go through multipart, with its own internal
    // per-chunk retry and resume — handled entirely inside
    // uploadLargeFileMultipart, so this branch doesn't need its own
    // retry loop wrapped around it.
    if (file.size > MULTIPART_THRESHOLD_BYTES) {
      return uploadLargeFileMultipart(file, projectId, mediaType!, sectionId, setStatus);
    }

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            filename: file.name,
            contentType: file.type,
            fileSizeMb: file.size / (1024 * 1024),
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json();
          throw new Error(data.error ?? "presign failed");
        }
        const { uploadUrl, fileKey } = await presignRes.json();

        await uploadWithProgress(uploadUrl, file, () => {});

        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, fileKey, type: mediaType, sectionId }),
        });
        if (!completeRes.ok) throw new Error("Failed to save file");

        return { ok: true };
      } catch (err) {
        const isLastAttempt = attempt === MAX_RETRIES_PER_FILE;
        if (isLastAttempt) {
          return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
        }
        await sleep(2000 * (attempt + 1));
      }
    }
    return { ok: false, error: "Upload failed" };
  };

  const handleSubmit = async () => {
    if (!mediaType || !sectionName.trim() || files.length === 0) {
      setError("Pick a type, name the section, and choose at least one file.");
      return;
    }

    setUploading(true);
    setError(null);
    setSkippedFiles([]);
    setStatus("Checking your plan...");

    try {
      const batchRes = await fetch(`/api/projects/${projectId}/add-files-batch`, {
        method: "POST",
      });
      if (!batchRes.ok) {
        const data = await batchRes.json();
        throw new Error(data.error ?? "Failed to start this batch");
      }

      setStatus("Creating section...");
      const sectionRes = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName.trim(), mediaType }),
      });
      if (!sectionRes.ok) {
        const data = await sectionRes.json();
        throw new Error(data.error ?? "Failed to create section");
      }
      const { section } = await sectionRes.json();

      const completed = getCompletedFingerprints(projectId, sectionName);
      const filesToUpload = files.filter((f) => !completed.has(fileFingerprint(f)));
      const failedFiles: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setStatus(`Uploading ${i + 1} of ${filesToUpload.length}${resumedCount > 0 ? ` (${resumedCount} already done)` : ""}...`);

        const result = await uploadOneFileWithRetry(file, section.id);

        if (result.ok) {
          markFingerprintCompleted(projectId, sectionName, fileFingerprint(file));
        } else {
          failedFiles.push(file.name);
        }

        await sleep(INTER_FILE_PAUSE_MS);

        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < filesToUpload.length) {
          setStatus(`Pausing briefly before the next batch...`);
          await sleep(INTER_BATCH_PAUSE_MS);
        }
      }

      if (failedFiles.length > 0) {
        setSkippedFiles(failedFiles);
        setStatus(null);
        setError(
          `${filesToUpload.length - failedFiles.length} of ${filesToUpload.length} uploaded. ${failedFiles.length} failed after retrying — re-select the same files to try again for just those.`
        );
        setUploading(false);
        return;
      }

      clearProgress(projectId, sectionName);
      setStatus("Done");
      router.refresh();
      setTimeout(reset, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUploading(false);
      setStatus(null);
    }
  };

  if (step === "closed") {
    return (
      <button
        onClick={() => setStep("type")}
        disabled={remaining <= 0}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        {remaining <= 0 ? "No sessions left" : "+ Add another section"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      {step === "type" && (
        <div>
          <p className="mb-4 text-sm font-semibold text-white">What are you uploading?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handlePickType("PHOTO")}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Images
            </button>
            <button
              onClick={() => handlePickType("VIDEO")}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Videos
            </button>
          </div>
          <button onClick={reset} className="mt-4 text-xs font-semibold text-white/40 hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Section name
            </label>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => handleSectionNameChange(e.target.value)}
              placeholder="e.g. Ceremony Highlights"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Files
            </label>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={mediaType === "VIDEO" ? "video/*" : "image/*"}
              onChange={(e) => handleFileSelection(Array.from(e.target.files ?? []))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
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

          {status && <p className="text-xs" style={{ color: "#2478FF" }}>{status}</p>}
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
              onClick={handleSubmit}
              disabled={uploading}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
            >
              {uploading ? "Uploading..." : skippedFiles.length > 0 ? "Retry remaining" : "Upload"}
            </button>
            <button
              onClick={reset}
              disabled={uploading}
              className="text-xs font-semibold text-white/40 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}