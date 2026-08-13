"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "type" | "details";

function IconImage({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVideo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16 10.5l5-2.7v8.4l-5-2.7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconDocument({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.5 13h7M8.5 16.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function uploadWithProgress(
  url: string,
  file: File | Blob,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
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

// Same as uploadWithProgress, but for one chunk of a multipart upload
// — the only real difference is reading back the ETag R2 returns for
// that specific chunk, which is required later to tell R2 how to
// stitch every chunk together into the final file. Reading this
// response header requires R2's CORS config on this bucket to
// explicitly list ETag under Access-Control-Expose-Headers — without
// that, the chunk itself uploads fine (a 200 comes back), but the
// browser silently can't read the header value needed to complete
// the upload.
function uploadPartWithProgress(
  url: string,
  chunk: Blob,
  onProgress: (loaded: number, total: number) => void
): Promise<string> {
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

// ─────────────────────────────────────────────
// RESUMABLE PROGRESS TRACKING — browsers give JavaScript no way to
// hold onto an actual File reference across a crash, tab close, or
// page reload; the moment that happens, the real file data is gone
// and can only come back if the person re-selects it from disk. What
// *can* survive is a record of which files (and, for large files,
// which individual chunks) already succeeded, so when someone
// re-opens this after a crash and re-selects the same batch, whatever
// already made it through gets recognized and skipped automatically.
//
// A file has no stable ID across sessions, so this uses a fingerprint
// (name + size + last-modified time) as a good-enough proxy for "this
// is probably the same file."
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

// Chunk-level progress for large (multipart) files specifically —
// separate storage from the whole-file tracking above, since a large
// file needs to remember the R2 uploadId/fileKey it was assigned
// (resuming a multipart session has to reuse the exact same one, not
// start a new session) plus exactly which part numbers already
// succeeded.
interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function multipartStorageKey(projectId: string, sectionName: string, fingerprint: string): string {
  return `showwork-multipart-progress:${projectId}:${sectionName.trim().toLowerCase()}:${fingerprint}`;
}
function getMultipartProgress(projectId: string, sectionName: string, fingerprint: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(projectId, sectionName, fingerprint));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(projectId: string, sectionName: string, fingerprint: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(projectId, sectionName, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore — same reasoning as markFingerprintCompleted above
  }
}
function clearMultipartProgress(projectId: string, sectionName: string, fingerprint: string) {
  try {
    localStorage.removeItem(multipartStorageKey(projectId, sectionName, fingerprint));
  } catch {
    // ignore
  }
}

// Files at or above this size go through the multipart path instead
// of a single PUT — chosen well under R2's own ~5.37GB hard ceiling
// for a single-part upload, so anything that could plausibly bump
// into that limit takes the chunked route instead.
const MULTIPART_THRESHOLD_MB = 100;
const CHUNK_SIZE_MB = 200;
// How many chunks upload simultaneously, rather than one at a time —
// a real, deliberate trade-off: this pushes closer to someone's
// actual available bandwidth (a single connection often doesn't
// saturate it), at the cost of more concurrently in-flight data than
// the fully sequential approach. Kept modest on purpose rather than
// maximized, since this is the same class of resource pressure that
// caused the original crash this whole upload rework was built to fix.
const CHUNK_CONCURRENCY = 2;

// Detects each file's real type from its actual content-type, rather
// than assuming every file in a "Documents" section is the same kind
// — someone uploading a Documents section might genuinely mix PDFs
// and Word files together, and each needs its correct type recorded
// individually, not whatever was picked upfront for the section as a
// whole.
function detectFileType(file: File, fallback: MediaType): MediaType {
  if (file.type === "application/pdf") return "PDF";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCUMENT";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("image/")) return "PHOTO";
  return fallback;
}

const BATCH_SIZE = 3;
const INTER_FILE_PAUSE_MS = 150;
const INTER_BATCH_PAUSE_MS = 3000;
const MAX_RETRIES_PER_FILE = 2;
const MAX_RETRIES_PER_CHUNK = 3;

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
  const [folderName, setFolderName] = useState("");
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

  // ── Small/normal files — the existing single-PUT path, unchanged ──
  const uploadOneFileWithRetry = async (
    file: File,
    sectionId: string,
    folderId: string | null
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
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
          body: JSON.stringify({ projectId, fileKey, type: detectFileType(file, mediaType!), sectionId, folderId }),
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

  // ── Large files — the chunked multipart path, with per-chunk resume ──
  const uploadLargeFileMultipart = async (
    file: File,
    sectionId: string,
    folderId: string | null,
    onChunkStatus: (msg: string) => void
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    // Resume an existing session for this exact file if one exists —
    // reusing the same fileKey/uploadId is required; R2 has no notion
    // of "continuing" under a brand-new session.
    let progress = getMultipartProgress(projectId, sectionName, fingerprint);

    if (!progress) {
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
        return { ok: false, error: data.error ?? "Failed to start large-file upload" };
      }
      const { uploadId, fileKey } = await startRes.json();
      progress = { fileKey, uploadId, completedParts: [] };
      // Saved immediately, before a single chunk has uploaded — so
      // even a crash on chunk 1 still has a session to resume into,
      // rather than starting an entirely new one on retry.
      saveMultipartProgress(projectId, sectionName, fingerprint, progress);
    }

    const completedPartNumbers = new Set(progress.completedParts.map((p) => p.partNumber));
    const remainingPartNumbers: number[] = [];
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      if (!completedPartNumbers.has(partNumber)) remainingPartNumbers.push(partNumber);
    }

    let completedCount = totalChunks - remainingPartNumbers.length;
    let firstError: string | null = null;

    const uploadOneChunk = async (partNumber: number): Promise<void> => {
      if (firstError) return; // a different chunk already failed hard — stop starting new work

      onChunkStatus(`chunk ${completedCount + 1} of ${totalChunks}`);

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
            body: JSON.stringify({
              projectId,
              fileKey: progress!.fileKey,
              uploadId: progress!.uploadId,
              partNumber,
            }),
          });
          if (!signRes.ok) {
            const data = await signRes.json();
            throw new Error(data.error ?? "Failed to sign chunk");
          }
          const { uploadUrl } = await signRes.json();

          const etag = await uploadPartWithProgress(uploadUrl, chunk, () => {});

          progress!.completedParts.push({ partNumber, etag });
          // Persisted after every single chunk, not just at the end —
          // this is what makes a crash mid-upload only cost whichever
          // chunks were actively in flight at that moment, rather than
          // the whole file. Safe under concurrency: each push+save
          // here runs as one uninterrupted synchronous step even
          // though multiple chunk uploads are in flight together.
          saveMultipartProgress(projectId, sectionName, fingerprint, progress!);
          completedCount++;

          chunkSucceeded = true;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Upload failed";
          if (attempt < MAX_RETRIES_PER_CHUNK) {
            await sleep(2000 * (attempt + 1));
          }
        }
      }

      if (!chunkSucceeded && !firstError) {
        firstError = `${lastError} (chunk ${partNumber} of ${totalChunks})`;
      }
    };

    // A small worker pool — CHUNK_CONCURRENCY workers pull from the
    // same shared queue, so at most that many chunks are ever actively
    // uploading (and held in memory as sliced Blobs) at the same time,
    // rather than firing every remaining chunk at once.
    const queue = [...remainingPartNumbers];
    const workers = Array.from({ length: CHUNK_CONCURRENCY }, async () => {
      while (queue.length > 0 && !firstError) {
        const partNumber = queue.shift();
        if (partNumber !== undefined) await uploadOneChunk(partNumber);
      }
    });
    await Promise.all(workers);

    if (firstError) {
      return { ok: false, error: firstError };
    }

    const completeRes = await fetch("/api/upload/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        type: detectFileType(file, mediaType!),
        sectionId,
        folderId,
      }),
    });
    if (!completeRes.ok) {
      const data = await completeRes.json();
      return { ok: false, error: data.error ?? "Failed to finalize large file" };
    }

    // Only cleared once the file is genuinely, fully done — the
    // per-chunk record above stays intact through every retry until
    // this exact point.
    clearMultipartProgress(projectId, sectionName, fingerprint);
    return { ok: true };
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

      // A named folder for this whole batch is entirely optional —
      // created once, right after the section, and reused for every
      // file in this upload. Leaving this blank keeps files sitting
      // directly in the section with no extra grouping, same as
      // before folders existed at all.
      let folderId: string | null = null;
      if (folderName.trim()) {
        const folderRes = await fetch(`/api/sections/${section.id}/folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: folderName.trim() }),
        });
        if (folderRes.ok) {
          const folderData = await folderRes.json();
          folderId = folderData.folder.id;
        }
        // A failed folder creation isn't treated as fatal — the
        // section itself is already real at this point, and files
        // are still perfectly valid sitting directly in it with no
        // folder, rather than aborting the whole upload over this.
      }

      const completed = getCompletedFingerprints(projectId, sectionName);
      const filesToUpload = files.filter((f) => !completed.has(fileFingerprint(f)));
      const failedFiles: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

        setStatus(`Uploading ${i + 1} of ${filesToUpload.length}${resumedCount > 0 ? ` (${resumedCount} already done)` : ""}...`);

        const result = isLarge
          ? await uploadLargeFileMultipart(file, section.id, folderId, (chunkMsg) =>
              setStatus(`Uploading ${i + 1} of ${filesToUpload.length} — ${chunkMsg}...`)
            )
          : await uploadOneFileWithRetry(file, section.id, folderId);

        if (result.ok) {
          markFingerprintCompleted(projectId, sectionName, fileFingerprint(file));
        } else {
          failedFiles.push(`${file.name} (${result.error})`);
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
          `${filesToUpload.length - failedFiles.length} of ${filesToUpload.length} uploaded. ${failedFiles.length} failed — re-select the same files to resume just those (large files pick up from the exact chunk they stopped at).`
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
          <p className="mb-5 text-sm font-semibold text-white">What are you uploading?</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: "PHOTO" as const, label: "Images", desc: "Photos, JPG, PNG", Icon: IconImage },
              { type: "VIDEO" as const, label: "Videos", desc: "MP4, MOV, WebM", Icon: IconVideo },
              { type: "PDF" as const, label: "Documents", desc: "PDF, Word", Icon: IconDocument },
            ].map(({ type, label, desc, Icon }) => (
              <button
                key={type}
                onClick={() => handlePickType(type)}
                className="group flex flex-col items-center gap-3 rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "#2478FF", filter: "blur(14px)" }}
                    aria-hidden
                  />
                  <div
                    className="relative flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300"
                    style={{ background: "rgba(36,120,255,0.12)", border: "1px solid rgba(36,120,255,0.25)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#2478FF" }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={reset} className="mt-5 text-xs font-semibold text-white/40 hover:text-white">
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
              Folder <span className="normal-case text-white/25">(optional)</span>
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Sonos Campaign — leave blank for no folder"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
            <p className="mt-1.5 text-[11px] text-white/30">
              Groups these files as a sub-section your client can browse separately — useful if this section will hold more than one distinct set of work.
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
              accept={
                mediaType === "VIDEO"
                  ? "video/*"
                  : mediaType === "PHOTO"
                    ? "image/*"
                    : ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              }
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