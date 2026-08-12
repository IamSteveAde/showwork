"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
  green: "#22C55E",
};

interface QueuedFile {
  file: File;
  localId: string;
}

interface PendingSection {
  sectionLocalId: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  files: QueuedFile[];
}

type FileStatus = "pending" | "uploading" | "done" | "error";
type BuilderStep = "closed" | "type" | "details";

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
// Same as uploadWithProgress, but for one chunk of a multipart upload
// — reads back the ETag R2 returns for that specific chunk, required
// to tell R2 how to stitch every chunk together at the end. Requires
// R2's CORS config on this bucket to expose ETag under
// Access-Control-Expose-Headers, or this fails at the read step even
// though the chunk itself uploaded fine.
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
          reject(new Error("R2 didn't return an ETag for this chunk — check ETag is listed under Access-Control-Expose-Headers in your R2 bucket's CORS settings."));
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

// Resumable progress — keyed by localId (already stable per file in
// this component's own state) rather than a fingerprint, since a
// stable id already exists here.
function multipartStorageKey(localId: string): string {
  return `showwork-newproject-multipart:${localId}`;
}
interface MultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function getMultipartProgress(localId: string): MultipartProgress | null {
  try {
    const raw = localStorage.getItem(multipartStorageKey(localId));
    return raw ? (JSON.parse(raw) as MultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveMultipartProgress(localId: string, progress: MultipartProgress) {
  try {
    localStorage.setItem(multipartStorageKey(localId), JSON.stringify(progress));
  } catch {
    // ignore — resuming just won't work this time
  }
}
function clearMultipartProgress(localId: string) {
  try {
    localStorage.removeItem(multipartStorageKey(localId));
  } catch {
    // ignore
  }
}

const MULTIPART_THRESHOLD_MB = 100;
const CHUNK_SIZE_MB = 200;
const CHUNK_CONCURRENCY = 2;
const MAX_RETRIES_PER_CHUNK = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Uploads one large file via multipart, chunked with 2 concurrent
// workers, reporting progress back through the exact same
// setLoadedMap callback pattern the existing small-file path already
// uses — so the UI's progress bar keeps working identically whether
// a file went through the simple or chunked path.
async function uploadLargeFileMultipart(
  file: File,
  localId: string,
  projectId: string,
  sectionId: string,
  mediaType: string,
  onLoaded: (loaded: number) => void,
  onChunkStatus: (msg: string) => void
): Promise<{ fileKey: string }> {
  const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSizeBytes);

  let progress = getMultipartProgress(localId);
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
      throw new Error(data.error ?? "Failed to start large-file upload");
    }
    const { uploadId, fileKey } = await startRes.json();
    progress = { fileKey, uploadId, completedParts: [] };
    saveMultipartProgress(localId, progress);
  }

  const completedPartNumbers = new Set(progress.completedParts.map((p) => p.partNumber));
  const remainingPartNumbers: number[] = [];
  for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
    if (!completedPartNumbers.has(partNumber)) remainingPartNumbers.push(partNumber);
  }

  // Total bytes already accounted for by previously-completed chunks
  // (on a resumed upload) — the progress bar should start from here,
  // not from zero, if some chunks already succeeded in a prior attempt.
  let loadedBytes = completedPartNumbers.size * chunkSizeBytes;
  onLoaded(loadedBytes);

  let completedChunkCount = completedPartNumbers.size;
  let firstError: string | null = null;

const uploadOneChunk = async (partNumber: number): Promise<void> => {
    if (firstError) return;
    onChunkStatus(`Uploading chunk ${completedChunkCount + 1} of ${totalChunks}`);
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
        if (!signRes.ok) {
          const data = await signRes.json();
          throw new Error(data.error ?? "Failed to sign chunk");
        }
        const { uploadUrl } = await signRes.json();

        const etag = await uploadPartWithProgress(uploadUrl, chunk, () => {});

      progress!.completedParts.push({ partNumber, etag });
        saveMultipartProgress(localId, progress!);
        loadedBytes += chunk.size;
        completedChunkCount++;
        onLoaded(loadedBytes);
        onChunkStatus(`${completedChunkCount} of ${totalChunks} chunks done`);

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
    }),
  });
  if (!completeRes.ok) {
    const data = await completeRes.json();
    throw new Error(data.error ?? "Failed to finalize large file");
  }
  const { media } = await completeRes.json();

  clearMultipartProgress(localId);
  return { fileKey: media.id };
}

const CODE_WORDS = [
  "sunrise", "harbor", "velvet", "cobalt", "willow", "ember",
  "quartz", "meadow", "cipher", "lantern", "orbit", "maple",
];

function suggestCode() {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const number = Math.floor(10 + Math.random() * 90);
  return `${word}${number}`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "uploading" | "done">("form");

  const [clientName, setClientName] = useState("");
  const [password, setPassword] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroLocalId, setHeroLocalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The list of sections the creator has built up so far — each with
  // its own name, type, and files. Replaces the old single flat dropzone.
  const [sections, setSections] = useState<PendingSection[]>([]);

  // The in-progress "add a section" builder — its own small step flow.
  const [builderStep, setBuilderStep] = useState<BuilderStep>("closed");
  const [builderType, setBuilderType] = useState<"PHOTO" | "VIDEO" | "DOCUMENT" | "PDF" | null>(null);
  const [builderName, setBuilderName] = useState("");
  const [builderFiles, setBuilderFiles] = useState<QueuedFile[]>([]);
  const builderFileInputRef = useRef<HTMLInputElement>(null);

  const [statusMap, setStatusMap] = useState<Record<string, FileStatus>>({});
  const [loadedMap, setLoadedMap] = useState<Record<string, number>>({});
  const [chunkStatusMap, setChunkStatusMap] = useState<Record<string, string>>({});

  interface UsageInfo {
    planName: string;
    used: number;
    limit: number | null;
    remaining: number | null;
    nearCap: boolean;
    atCap: boolean;
    nextTier: { name: string; priceNgnMonthly: number; limit: number | null } | null;
  }
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    fetch("/api/subscription/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUsage(data))
      .catch(() => {});
  }, []);

  // ── section builder logic ──
  const startBuilder = () => {
    setBuilderStep("type");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
  };

  const chooseBuilderType = (type: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF") => {
    setBuilderType(type);
    setBuilderStep("details");
  };

  const handleBuilderFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).map((file) => ({
      file,
      localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
    }));
    setBuilderFiles(selected);
  };

  const confirmSection = () => {
    if (!builderType) return;
    if (!builderName.trim()) {
      setError("Give this section a name");
      return;
    }
    if (builderFiles.length === 0) {
      setError("Choose at least one file");
      return;
    }
    setError(null);

    const newSection: PendingSection = {
      sectionLocalId: `section-${Math.random().toString(36).slice(2)}`,
      name: builderName.trim(),
      mediaType: builderType,
      files: builderFiles,
    };

    setSections((prev) => {
      const next = [...prev, newSection];
      if (!heroLocalId) {
        setHeroLocalId(newSection.files[0].localId);
      }
      return next;
    });

    setBuilderStep("closed");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
    if (builderFileInputRef.current) builderFileInputRef.current.value = "";
  };

  const cancelBuilder = () => {
    setBuilderStep("closed");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
    setError(null);
  };

  const removeSection = (sectionLocalId: string) => {
    setSections((prev) => {
      const removed = prev.find((s) => s.sectionLocalId === sectionLocalId);
      const next = prev.filter((s) => s.sectionLocalId !== sectionLocalId);
      if (removed && removed.files.some((f) => f.localId === heroLocalId)) {
        const firstRemaining = next.flatMap((s) => s.files)[0];
        setHeroLocalId(firstRemaining ? firstRemaining.localId : null);
      }
      return next;
    });
  };

  // ── add more files to a section you've already saved, or remove a
  // single file from one — the two gaps that previously meant "forgot
  // one file" required starting the whole project over. One shared
  // hidden input is reused for every section; `addingToSectionId`
  // tracks which one a click is currently targeting.
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const addMoreFilesInputRef = useRef<HTMLInputElement>(null);

  const triggerAddMoreFiles = (sectionLocalId: string) => {
    setAddingToSectionId(sectionLocalId);
    // The ref's onChange fires after the state above is committed, so
    // by the time a file is actually chosen, addingToSectionId is set.
    setTimeout(() => addMoreFilesInputRef.current?.click(), 0);
  };

  const handleAddMoreFilesToSection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!addingToSectionId) return;
    const newFiles: QueuedFile[] = Array.from(e.target.files ?? []).map((file) => ({
      file,
      localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
    }));
    setSections((prev) =>
      prev.map((s) =>
        s.sectionLocalId === addingToSectionId ? { ...s, files: [...s.files, ...newFiles] } : s
      )
    );
    setAddingToSectionId(null);
    if (addMoreFilesInputRef.current) addMoreFilesInputRef.current.value = "";
  };

  const removeFileFromSection = (sectionLocalId: string, fileLocalId: string) => {
    setSections((prev) => {
      const next = prev
        .map((s) =>
          s.sectionLocalId === sectionLocalId
            ? { ...s, files: s.files.filter((f) => f.localId !== fileLocalId) }
            : s
        )
        // A section with nothing left in it doesn't make sense to keep around.
        .filter((s) => s.files.length > 0);

      if (heroLocalId === fileLocalId) {
        const firstRemaining = next.flatMap((s) => s.files)[0];
        setHeroLocalId(firstRemaining ? firstRemaining.localId : null);
      }
      return next;
    });
  };

  const addingToSection = sections.find((s) => s.sectionLocalId === addingToSectionId);

  const anyVideoSection = sections.some((s) => s.mediaType === "VIDEO" && s.files.length > 0);
  const allFilesForPreview = sections.flatMap((s) => s.files);
  const previewFileKey = allFilesForPreview.map((f) => f.localId).join(",");

  // Real local thumbnails for the banner picker — generated from the
  // files themselves (no upload needed yet). Regenerated whenever the
  // actual set of files changes, and properly revoked both then and on
  // unmount so they don't leak memory.
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const newUrls: Record<string, string> = {};
    allFilesForPreview.forEach((f) => {
      newUrls[f.localId] = URL.createObjectURL(f.file);
    });
    setPreviewUrls(newUrls);
    return () => {
      Object.values(newUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFileKey]);
  const allFiles = sections.flatMap((s) => s.files);
  // Documents and PDFs aren't sensible banner candidates — a banner is
  // meant to be the visual first impression, so only photo/video
  // sections are offered here, even though docs/PDFs upload normally.
  const bannerEligibleSections = sections.filter((s) => s.mediaType === "PHOTO" || s.mediaType === "VIDEO");
  const totalBytes = allFiles.reduce((sum, f) => sum + f.file.size, 0);
  const loadedBytes = allFiles.reduce((sum, f) => sum + (loadedMap[f.localId] ?? 0), 0);
  const overallPercent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
  const doneCount = allFiles.filter((f) => statusMap[f.localId] === "done").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName || !password) {
      setError("Client name and an access code are required");
      return;
    }

    setPhase("uploading");
    setStatusMap(Object.fromEntries(allFiles.map((f) => [f.localId, "pending" as FileStatus])));
    setLoadedMap({});

    try {
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, password }),
      });
      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error ?? "Failed to create project");
      }
      const { project } = await createRes.json();

      let heroMediaId: string | null = null;

      for (const section of sections) {
        const sectionRes = await fetch(`/api/projects/${project.id}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: section.name, mediaType: section.mediaType }),
        });
        if (!sectionRes.ok) {
          const data = await sectionRes.json();
          throw new Error(data.error ?? "Couldn't create section");
        }
        const { section: createdSection } = await sectionRes.json();

        for (const { file, localId } of section.files) {
          setStatusMap((prev) => ({ ...prev, [localId]: "uploading" }));
          try {
            const isLarge = file.size >= MULTIPART_THRESHOLD_MB * 1024 * 1024;

            if (isLarge) {
              const { fileKey: mediaId } = await uploadLargeFileMultipart(
                file,
                localId,
                project.id,
                createdSection.id,
                section.mediaType,
                (loaded) => setLoadedMap((prev) => ({ ...prev, [localId]: loaded })),
                (msg) => setChunkStatusMap((prev) => ({ ...prev, [localId]: msg }))
              );
              if (localId === heroLocalId) heroMediaId = mediaId;
            } else {
              const presignRes = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId: project.id,
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
              await uploadWithProgress(uploadUrl, file, (loaded) => {
                setLoadedMap((prev) => ({ ...prev, [localId]: loaded }));
              });
              const completeRes = await fetch("/api/upload/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId: project.id,
                  fileKey,
                  type: section.mediaType,
                  sectionId: createdSection.id,
                }),
              });
              if (!completeRes.ok) throw new Error("failed to save media record");
              const { media } = await completeRes.json();
              if (localId === heroLocalId) heroMediaId = media.id;
            }
            setStatusMap((prev) => ({ ...prev, [localId]: "done" }));
            setLoadedMap((prev) => ({ ...prev, [localId]: file.size }));
          } catch (err) {
            setStatusMap((prev) => ({ ...prev, [localId]: "error" }));
            throw err;
          }
        }
      }

      if (heroMediaId || tagline) {
        await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(heroMediaId ? { heroMediaId } : {}),
            ...(tagline ? { heroTagline: tagline } : {}),
          }),
        });
      }

      setPhase("done");
      setTimeout(() => router.push(`/dashboard/${project.id}`), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("form");
    }
  };

  // ─────────────────────────────────────────────
  // UPLOAD PROGRESS SCREEN
  // ─────────────────────────────────────────────
  if (phase === "uploading" || phase === "done") {
    
    return (
      <main
        className={`${jakarta.variable} flex min-h-screen items-center justify-center px-6`}
        style={{ background: COLOR.black, fontFamily: "var(--font-jakarta)" }}
     >
        <div className="w-full max-w-lg">
          <UploadPatienceBanner active={phase === "uploading"} />
          <div className="mb-8 mt-4 text-center">
            <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              {phase === "done" ? "All set" : "Uploading your project"}
            </p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {phase === "done" ? "Everything's in place." : `${doneCount} of ${allFiles.length} files sent`}
            </h1>
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-white/50">
              <span>{phase === "done" ? "Complete" : "Overall progress"}</span>
              <span>{phase === "done" ? "100%" : `${overallPercent}%`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${phase === "done" ? 100 : overallPercent}%`,
                  background: phase === "done" ? COLOR.green : COLOR.gold,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.sectionLocalId}>
                <p className="mb-1.5 text-xs font-semibold uppercase text-white/40">
                  {section.mediaType === "VIDEO" ? "🎬" : "🖼️"} {section.name}
                </p>
                <div className="flex flex-col gap-2">
                  {section.files.map((f) => {
                    const status = statusMap[f.localId] ?? "pending";
                    const loaded = loadedMap[f.localId] ?? 0;
                    const percent = f.file.size > 0 ? Math.round((loaded / f.file.size) * 100) : 0;
                    const isDone = status === "done" || phase === "done";
                    const isError = status === "error";

                    return (
                      <div key={f.localId} className="rounded-lg p-3.5" style={{ background: COLOR.charcoal }}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="max-w-[220px] truncate text-white/70">{f.file.name}</span>
                          <span className="flex items-center gap-1.5 font-medium">
                            {isDone ? (
                              <span style={{ color: COLOR.green }}>✓ Done</span>
                            ) : isError ? (
                              <span className="text-red-400">Failed</span>
                            ) : (
                              <span className="text-white/50">{percent}%</span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-200 ease-out"
                            style={{
                              width: `${isDone ? 100 : isError ? 100 : percent}%`,
                              background: isDone ? COLOR.green : isError ? "#f87171" : COLOR.gold,
                            }}
                          />
                        </div>
                        {chunkStatusMap[f.localId] && !isDone && (
                          <p className="mt-1.5 text-[11px] text-white/40">{chunkStatusMap[f.localId]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-6 text-center text-xs text-red-400">{error}</p>}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // FORM
  // ─────────────────────────────────────────────
  return (
    <main
      className={`${jakarta.variable} relative min-h-screen`}
      style={{ background: COLOR.black, fontFamily: "var(--font-jakarta)" }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,200,66,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white">
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          New delivery
        </p>

        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Set up this project</h1>
          <Link
            href="/dashboard/billing"
            className="text-xs font-semibold text-white/40 underline transition-colors hover:text-white"
          >
            View plan
          </Link>
        </div>

        {usage && usage.nextTier && (usage.nearCap || usage.atCap) && (
          <div
            className="mb-8 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: usage.atCap ? "rgba(249,115,22,0.1)" : "rgba(245,200,66,0.08)",
              border: usage.atCap ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(245,200,66,0.25)",
            }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: usage.atCap ? "#fdba74" : COLOR.gold, letterSpacing: "0.08em" }}
              >
                {usage.atCap ? "You've reached your limit" : "Almost there"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {usage.atCap
                  ? `You've used all ${usage.limit} projects on ${usage.planName} this cycle.`
                  : `Only ${usage.remaining} project${usage.remaining === 1 ? "" : "s"} left on ${usage.planName}.`}
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Move up to {usage.nextTier.name}
                {usage.nextTier.limit === null ? " for unlimited projects" : ` for up to ${usage.nextTier.limit} a month`} — ₦{usage.nextTier.priceNgnMonthly.toLocaleString()}/mo.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:scale-[1.03]"
              style={{ background: COLOR.gold, color: COLOR.black }}
            >
              Upgrade to {usage.nextTier.name}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Client name
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Soundhous"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.25)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke={COLOR.gold} strokeWidth="1.4" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke={COLOR.gold} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Client access code</h2>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-white/50">
              This is the code your client will type in to unlock this delivery.
              Without it, no one can view the files — even if they have the link.
            </p>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Access code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. sunrise42"
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setPassword(suggestCode())}
                className="flex-shrink-0 whitespace-nowrap rounded-lg px-3.5 py-3 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
              >
                🎲 Suggest
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Banner headline <span className="normal-case text-white/25">(optional)</span>
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Three months of work. One night to remember."
              maxLength={80}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          {/* SECTIONS — replaces the old single flat dropzone */}
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 flex items-center gap-2">
              <div className="h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
              <label className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Sections{sections.length > 0 ? ` (${sections.length})` : ""}
              </label>
            </div>

            {/* Shared hidden input for "add more files to this section" —
                one input, reused for whichever section triggered it. */}
            <input
              ref={addMoreFilesInputRef}
              type="file"
              multiple
              accept={
                addingToSection?.mediaType === "VIDEO"
                  ? "video/mp4,video/quicktime"
                  : "image/jpeg,image/png,image/webp"
              }
              onChange={handleAddMoreFilesToSection}
              className="hidden"
            />

            {/* existing sections — each expanded to show every file with
                its own remove button, plus a way to add more to this
                exact section without needing to start a new one */}
            {sections.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                {sections.map((section) => (
                  <div
                    key={section.sectionLocalId}
                    className="rounded-lg p-3.5"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-white/80">
                        {section.mediaType === "VIDEO" ? "🎬" : "🖼️"} {section.name}
                        <span className="ml-2 text-xs text-white/30">
                          {section.files.length} file{section.files.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => triggerAddMoreFiles(section.sectionLocalId)}
                          className="text-xs font-semibold"
                          style={{ color: COLOR.gold }}
                        >
                          + Add files
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(section.sectionLocalId)}
                          className="text-xs text-white/40 hover:text-white"
                        >
                          Remove section
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {section.files.map((f) => {
                        const previewUrl = previewUrls[f.localId];
                        return (
                          <div
                            key={f.localId}
                            className="relative aspect-square overflow-hidden rounded-md bg-black/40"
                          >
                            {previewUrl &&
                              (section.mediaType === "VIDEO" ? (
                                <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                              ))}
                            <button
                              type="button"
                              onClick={() => removeFileFromSection(section.sectionLocalId, f.localId)}
                              aria-label="Remove file"
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white/80 transition-colors hover:bg-red-500/90 hover:text-white"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Big, always-visible call to action — impossible to miss,
                and wording changes once at least one section exists so
                it's obvious you're adding another, not repeating one. */}
            {/* First section: a big, unmissable primary action — this is
                the thing you actually need to do to get started. */}
            {builderStep === "closed" && sections.length === 0 && (
              <button
                type="button"
                onClick={startBuilder}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors hover:border-white/30"
                style={{ borderColor: "rgba(245,200,66,0.3)", background: "rgba(245,200,66,0.04)" }}
              >
                <span className="text-sm font-semibold" style={{ color: COLOR.gold }}>
                  + Add your first section
                </span>
                <span className="max-w-sm text-xs text-white/40">
                  A section is whatever you're delivering — "Room Renders," "Logo Concepts," "Ceremony Highlights." Add as many as this project needs.
                </span>
              </button>
            )}

            {/* Once at least one section exists, this is deliberately a
                small, secondary prompt — not a repeat of the primary
                action above. You already finished that one; this is an
                optional invitation to add a *different* kind of content,
                not "do the same thing again." */}
            {builderStep === "closed" && sections.length > 0 && (
              <button
                type="button"
                onClick={startBuilder}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold transition-transform hover:scale-[1.01]"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                + Have something else to include? Add a different section
              </button>
            )}

            {/* builder */}
            {builderStep === "type" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-white/70">What are you uploading?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("PHOTO")}
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-2xl">🖼️</span>
                    <span className="text-sm font-semibold text-white">Images</span>
                    <span className="text-xs text-white/40">Photos, renders, mockups</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("VIDEO")}
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-2xl">🎬</span>
                    <span className="text-sm font-semibold text-white">Videos</span>
                    <span className="text-xs text-white/40">Films, walkthroughs, reels</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("DOCUMENT")}
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-2xl">📄</span>
                    <span className="text-sm font-semibold text-white">Documents</span>
                    <span className="text-xs text-white/40">Word docs (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("PDF")}
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-2xl">📕</span>
                    <span className="text-sm font-semibold text-white">PDFs</span>
                    <span className="text-xs text-white/40">Proposals, contracts, decks</span>
                  </button>
                </div>
                <button type="button" onClick={cancelBuilder} className="text-left text-xs text-white/40 underline">
                  Cancel
                </button>
              </div>
            )}

            {builderStep === "details" && (
              <div className="flex flex-col gap-3 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-xs font-semibold text-white/70">
                  {builderType === "VIDEO"
                    ? "🎬 Videos"
                    : builderType === "PHOTO"
                      ? "🖼️ Images"
                      : builderType === "PDF"
                        ? "📕 PDFs"
                        : "📄 Documents"} — name this section
                </p>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder={
                    builderType === "VIDEO"
                      ? "e.g. Ceremony Highlights"
                      : builderType === "PHOTO"
                        ? "e.g. Room Renders"
                        : builderType === "PDF"
                          ? "e.g. Signed Contract"
                          : "e.g. Brand Guidelines"
                  }
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                />

                <input
                  ref={builderFileInputRef}
                  type="file"
                  multiple
                  accept={
                    builderType === "VIDEO"
                      ? "video/mp4,video/quicktime,video/webm"
                      : builderType === "PHOTO"
                        ? "image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
                        : builderType === "PDF"
                          ? "application/pdf"
                          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  }
                  onChange={handleBuilderFileSelect}
                  className="hidden"
                  id="builder-files"
                />
                <label
                  htmlFor="builder-files"
                  className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-white/50 hover:border-white/25"
                >
                  {builderFiles.length > 0
                    ? `${builderFiles.length} file${builderFiles.length === 1 ? "" : "s"} selected — click to change`
                    : "Choose files"}
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={confirmSection}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                    style={{ background: COLOR.gold, color: COLOR.black }}
                  >
                    ✓ Save section
                  </button>
                  <button type="button" onClick={cancelBuilder} className="text-xs text-white/40 underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CHOOSE YOUR BANNER — its own dedicated, unmissable card */}
          {bannerEligibleSections.flatMap((s) => s.files).length > 0 && (
            <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
                <label className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                  Choose your banner
                </label>
              </div>
              <p className="mb-5 text-xs text-white/50">
                {anyVideoSection
                  ? "This is the first thing your client sees when they open the link. A video is always used as the banner — tap one below to choose which."
                  : "This is the first thing your client sees when they open the link. Tap a photo below to lead with it."}
              </p>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {bannerEligibleSections.map((section) =>
                  section.files.map((f) => {
                    const selectable = !anyVideoSection || section.mediaType === "VIDEO";
                    const isSelected = f.localId === heroLocalId;
                    const previewUrl = previewUrls[f.localId];
                    return (
                      <div key={f.localId} className="relative">
                        <button
                          type="button"
                          disabled={!selectable}
                          onClick={() => setHeroLocalId(f.localId)}
                          className="relative aspect-square w-full overflow-hidden rounded-lg bg-black/40 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                          style={{
                            border: isSelected ? `2px solid ${COLOR.gold}` : "2px solid rgba(255,255,255,0.08)",
                            boxShadow: isSelected ? "0 0 0 3px rgba(245,200,66,0.2)" : undefined,
                          }}
                        >
                          {previewUrl && (
                            section.mediaType === "VIDEO" ? (
                              <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                            )
                          )}
                          {section.mediaType === "VIDEO" && (
                            <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                              🎬
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <span
                                className="rounded-full px-2 py-1 text-[10px] font-bold"
                                style={{ background: COLOR.gold, color: COLOR.black }}
                              >
                                ✓ Banner
                              </span>
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFileFromSection(section.sectionLocalId, f.localId)}
                          aria-label="Remove file"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white/80 transition-colors hover:bg-red-500/90 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01]"
            style={{ background: COLOR.gold, color: COLOR.black }}
          >
            Create project
          </button>
        </form>
      </div>
    </main>
  );
}