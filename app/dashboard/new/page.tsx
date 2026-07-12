"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

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
  type: "PHOTO" | "VIDEO";
  localId: string;
}

type FileStatus = "pending" | "uploading" | "done" | "error";

/**
 * Uploads a file with real byte-level progress. Plain `fetch` doesn't
 * reliably expose upload progress across browsers — XMLHttpRequest does,
 * via the `upload.onprogress` event, so we use it just for this PUT.
 */
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

export default function NewProjectPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "uploading" | "done">("form");

  const [clientName, setClientName] = useState("");
  const [password, setPassword] = useState("");
  const [tagline, setTagline] = useState("");
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [heroLocalId, setHeroLocalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Progress tracking, keyed by localId
  const [statusMap, setStatusMap] = useState<Record<string, FileStatus>>({});
  const [loadedMap, setLoadedMap] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (selected: File[]) => {
    const queued: QueuedFile[] = selected.map((file) => ({
      file,
      type: file.type.startsWith("video") ? "VIDEO" : "PHOTO",
      localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
    }));
    setFiles((prev) => {
      const next = [...prev, ...queued];
      if (!heroLocalId && next.length > 0) {
        const firstVideo = next.find((f) => f.type === "VIDEO");
        setHeroLocalId((firstVideo ?? next[0]).localId);
      }
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const removeFile = (localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
    if (heroLocalId === localId) setHeroLocalId(null);
  };

  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);
  const loadedBytes = files.reduce((sum, f) => sum + (loadedMap[f.localId] ?? 0), 0);
  const overallPercent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
  const doneCount = files.filter((f) => statusMap[f.localId] === "done").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName || !password) {
      setError("Client name and password are required");
      return;
    }

    setPhase("uploading");
    setStatusMap(Object.fromEntries(files.map((f) => [f.localId, "pending" as FileStatus])));
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

      for (const { file, type, localId } of files) {
        setStatusMap((prev) => ({ ...prev, [localId]: "uploading" }));

        try {
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
            body: JSON.stringify({ projectId: project.id, fileKey, type }),
          });
          if (!completeRes.ok) throw new Error("failed to save media record");
          const { media } = await completeRes.json();

          if (localId === heroLocalId) heroMediaId = media.id;

          setStatusMap((prev) => ({ ...prev, [localId]: "done" }));
          setLoadedMap((prev) => ({ ...prev, [localId]: file.size }));
        } catch (err) {
          setStatusMap((prev) => ({ ...prev, [localId]: "error" }));
          throw err;
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
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              {phase === "done" ? "All set" : "Uploading your project"}
            </p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {phase === "done" ? "Everything's in place." : `${doneCount} of ${files.length} files sent`}
            </h1>
          </div>

          {/* overall progress bar */}
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

          {/* per-file rows */}
          <div className="flex flex-col gap-2.5">
            {files.map((f) => {
              const status = statusMap[f.localId] ?? "pending";
              const loaded = loadedMap[f.localId] ?? 0;
              const percent = f.file.size > 0 ? Math.round((loaded / f.file.size) * 100) : 0;
              const isDone = status === "done" || phase === "done";
              const isError = status === "error";

              return (
                <div key={f.localId} className="rounded-lg p-3.5" style={{ background: COLOR.charcoal }}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-white/70">
                      {f.type === "VIDEO" ? "🎬" : "🖼️"}
                      <span className="max-w-[220px] truncate">{f.file.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {isDone ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <circle cx="6.5" cy="6.5" r="6.5" fill={COLOR.green} />
                            <path d="M3.5 6.5l2 2 4-4.5" stroke={COLOR.black} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ color: COLOR.green }}>Done</span>
                        </>
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
                </div>
              );
            })}
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
        <h1 className="mb-10 text-3xl font-bold text-white">Set up this project</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* client details card */}
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />

            <div className="flex flex-col gap-4">
              <div>
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                  Access password
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="What you'll share with your client"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                />
              </div>

              <div>
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
            </div>
          </div>

          {/* upload card */}
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
            <label className="mb-3 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Photos & videos
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors"
              style={{
                borderColor: dragActive ? COLOR.gold : "rgba(255,255,255,0.15)",
                background: dragActive ? "rgba(245,200,66,0.05)" : "transparent",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M14 4v14M14 18l-5-5M14 18l5-5M5 22h18"
                  stroke={dragActive ? COLOR.gold : "rgba(255,255,255,0.3)"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm font-medium text-white/70">
                Drag files here, or <span style={{ color: COLOR.gold }}>browse</span>
              </p>
              <p className="text-xs text-white/30">JPEG, PNG, WEBP, MP4, MOV — up to 2GB each</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <>
                <p className="mt-4 text-xs text-white/30">
                  {files.some((f) => f.type === "VIDEO")
                    ? "A video is always the banner. Click one below to choose which."
                    : "Click a photo to make it the banner."}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {files.map((f) => {
                    const anyVideo = files.some((x) => x.type === "VIDEO");
                    const selectable = !anyVideo || f.type === "VIDEO";
                    return (
                      <li
                        key={f.localId}
                        onClick={() => selectable && setHeroLocalId(f.localId)}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                          selectable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                        }`}
                        style={{
                          background: f.localId === heroLocalId ? "rgba(245,200,66,0.12)" : "rgba(255,255,255,0.05)",
                          border: f.localId === heroLocalId ? "1px solid rgba(245,200,66,0.4)" : "1px solid transparent",
                        }}
                      >
                        <span className="text-white/70">
                          {f.type === "VIDEO" ? "🎬" : "🖼️"} {f.file.name}
                          {f.localId === heroLocalId && (
                            <span className="ml-2 font-medium" style={{ color: COLOR.gold }}>
                              · Banner
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(f.localId); }}
                          className="text-white/40 hover:text-white"
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

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