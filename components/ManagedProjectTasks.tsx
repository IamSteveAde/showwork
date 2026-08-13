"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import UploadPatienceBanner from "@/components/UploadPatienceBanner";
import AddTaskSubSection from "@/components/AddTaskSubSection";

const COLOR = { blue: "#2478FF", gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" };

const STATUS_LABELS: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  TODO: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)" },
  IN_PROGRESS: { bg: "rgba(36,120,255,0.15)", text: "#2478FF" },
  DONE: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "rgba(255,255,255,0.3)",
  MEDIUM: "rgba(255,255,255,0.5)",
  HIGH: "#F97316",
  URGENT: "#EF4444",
};
const REVIEW_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "rgba(245,200,66,0.15)", text: "#F5C842", label: "Awaiting your review" },
  APPROVED: { bg: "rgba(34,197,94,0.15)", text: "#4ade80", label: "Approved" },
  NEEDS_CHANGES: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Needs changes" },
};

interface TaskAssetRow {
  id: string;
  filename: string | null;
  url: string;
  internalReviewStatus: "PENDING" | "APPROVED" | "NEEDS_CHANGES";
  internalReviewNote: string | null;
  promotedToMediaId: string | null;
  uploadedByCreatorId: string;
  folderId: string | null;
}
interface TaskFolderRow {
  id: string;
  name: string;
}
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignedTo: { id: string; name: string | null; email: string; avatarUrl: string | null };
  createdBy: { id: string; name: string | null; email: string };
  linkedAssets: TaskAssetRow[];
  folders: TaskFolderRow[];
}
interface AssigneeOption {
  id: string;
  name: string | null;
  email: string;
}

// ── Upload helpers — same pattern used in AddMoreFilesButton, the
// new-project page, and SectionHeader: real progress via XHR, plus a
// second version for multipart chunks that reads back the ETag R2
// returns for that chunk. ──
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

// Resumable chunk-level progress for a task upload — keyed by taskId
// + a fingerprint of the specific file, since browsers give JS no way
// to hold a real File reference across a crash or reload.
function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
interface TaskMultipartProgress {
  fileKey: string;
  uploadId: string;
  completedParts: { partNumber: number; etag: string }[];
}
function taskMultipartKey(taskId: string, fingerprint: string): string {
  return `showwork-task-multipart:${taskId}:${fingerprint}`;
}
function getTaskMultipartProgress(taskId: string, fingerprint: string): TaskMultipartProgress | null {
  try {
    const raw = localStorage.getItem(taskMultipartKey(taskId, fingerprint));
    return raw ? (JSON.parse(raw) as TaskMultipartProgress) : null;
  } catch {
    return null;
  }
}
function saveTaskMultipartProgress(taskId: string, fingerprint: string, progress: TaskMultipartProgress) {
  try {
    localStorage.setItem(taskMultipartKey(taskId, fingerprint), JSON.stringify(progress));
  } catch {
    // ignore — resuming just won't work this time
  }
}
function clearTaskMultipartProgress(taskId: string, fingerprint: string) {
  try {
    localStorage.removeItem(taskMultipartKey(taskId, fingerprint));
  } catch {
    // ignore
  }
}

const TASK_MULTIPART_THRESHOLD_MB = 100;
const TASK_CHUNK_SIZE_MB = 200;
const TASK_CHUNK_CONCURRENCY = 2;
const TASK_MAX_RETRIES = 2;
const TASK_MAX_RETRIES_PER_CHUNK = 3;
const taskSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One task's upload control plus its list of attached files — each
// with the owner's internal review state shown and, for the owner
// only, the approve/request-changes buttons.
function TaskAssets({
  taskId,
  assets,
  folders,
  canUpload,
  isOwner,
  onChanged,
}: {
  taskId: string;
  assets: TaskAssetRow[];
  folders: TaskFolderRow[];
  canUpload: boolean;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [chunkStatus, setChunkStatus] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const detectType = (file: File): string => {
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type === "application/pdf") return "PDF";
    if (file.type.startsWith("image/")) return "PHOTO";
    return "DOCUMENT";
  };

  // ── Small files — single PUT, with retry ──
  const uploadSmallFile = async (file: File, type: string): Promise<void> => {
    for (let attempt = 0; attempt <= TASK_MAX_RETRIES; attempt++) {
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
          body: JSON.stringify({ fileKey: presignData.fileKey, filename: file.name, type }),
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to save upload");
        return;
      } catch (err) {
        if (attempt === TASK_MAX_RETRIES) throw err;
        await taskSleep(2000 * (attempt + 1));
      }
    }
  };

  // ── Large files — chunked multipart, 2 chunks concurrently, with
  //    per-chunk resume ──
  const uploadLargeFile = async (file: File, type: string): Promise<void> => {
    const fingerprint = fileFingerprint(file);
    const chunkSizeBytes = TASK_CHUNK_SIZE_MB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);

    let progress = getTaskMultipartProgress(taskId, fingerprint);
    if (!progress) {
      const startRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-multipart-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error ?? "Failed to start large-file upload");
      progress = { fileKey: startData.fileKey, uploadId: startData.uploadId, completedParts: [] };
      saveTaskMultipartProgress(taskId, fingerprint, progress);
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

      for (let attempt = 0; attempt <= TASK_MAX_RETRIES_PER_CHUNK; attempt++) {
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
          saveTaskMultipartProgress(taskId, fingerprint, progress!);
          completedCount++;
          setChunkStatus(`${completedCount} of ${totalChunks} chunks done`);

          chunkSucceeded = true;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Upload failed";
          if (attempt < TASK_MAX_RETRIES_PER_CHUNK) await taskSleep(2000 * (attempt + 1));
        }
      }
      if (!chunkSucceeded && !firstError) {
        firstError = `${lastError} (chunk ${partNumber} of ${totalChunks})`;
      }
    };

    const queue = [...remainingPartNumbers];
    const workers = Array.from({ length: TASK_CHUNK_CONCURRENCY }, async () => {
      while (queue.length > 0 && !firstError) {
        const partNumber = queue.shift();
        if (partNumber !== undefined) await uploadOneChunk(partNumber);
      }
    });
    await Promise.all(workers);

    if (firstError) throw new Error(firstError);

    const completeRes = await fetch(`/api/managed-projects/tasks/${taskId}/upload-multipart-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: progress.fileKey,
        uploadId: progress.uploadId,
        parts: progress.completedParts,
        filename: file.name,
        type,
      }),
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to finalize large file");

    clearTaskMultipartProgress(taskId, fingerprint);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setChunkStatus(null);
    try {
      const type = detectType(file);
      const isLarge = file.size >= TASK_MULTIPART_THRESHOLD_MB * 1024 * 1024;

      if (isLarge) {
        await uploadLargeFile(file, type);
      } else {
        await uploadSmallFile(file, type);
      }

      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setChunkStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submitReview = async (assetId: string, status: "APPROVED" | "NEEDS_CHANGES") => {
    await fetch(`/api/managed-projects/task-assets/${assetId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: status === "NEEDS_CHANGES" ? reviewNote : undefined }),
    });
    setReviewingId(null);
    setReviewNote("");
    onChanged();
  };

  // One asset's full row — pulled out as its own function rather than
  // inlined twice, since it needs to render identically whether it's
  // sitting in the ungrouped list or inside a named sub-section below.
  const renderAssetRow = (asset: TaskAssetRow) => {
    const review = REVIEW_COLORS[asset.internalReviewStatus];
    return (
      <div key={asset.id} className="rounded-md p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between gap-2">
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-xs font-medium underline" style={{ color: COLOR.blue }}>
            {asset.filename || "View file"}
          </a>
          <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: review.bg, color: review.text }}>
            {asset.promotedToMediaId ? "Published" : review.label}
          </span>
        </div>
        {asset.internalReviewNote && (
          <p className="mt-1.5 text-xs italic text-white/50">&ldquo;{asset.internalReviewNote}&rdquo;</p>
        )}
        {isOwner && asset.internalReviewStatus === "PENDING" && !asset.promotedToMediaId && (
          <div className="mt-2">
            {reviewingId === asset.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="What needs to change?"
                  rows={2}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/25"
                />
                <div className="flex gap-2">
                  <button onClick={() => submitReview(asset.id, "NEEDS_CHANGES")} className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                    Send request
                  </button>
                  <button onClick={() => setReviewingId(null)} className="text-[11px] text-white/40 hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => submitReview(asset.id, "APPROVED")} className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                  Approve
                </button>
                <button onClick={() => setReviewingId(asset.id)} className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                  Request changes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Direct uploads first (no sub-section), each named sub-section
  // shown after — same ordering and visual treatment as sections and
  // sub-sections on the delivery side.
  const ungroupedAssets = assets.filter((a) => !a.folderId);

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {ungroupedAssets.length > 0 && (
        <div className="flex flex-col gap-2">
          {ungroupedAssets.map(renderAssetRow)}
        </div>
      )}

      {folders.map((folder) => {
        const folderAssets = assets.filter((a) => a.folderId === folder.id);
        if (folderAssets.length === 0) return null;
        return (
          <div
            key={folder.id}
            className="mt-4 border-l-2 pl-3"
            style={{ borderColor: "rgba(36,120,255,0.25)" }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
              {folder.name}
            </p>
            <div className="flex flex-col gap-2">
              {folderAssets.map(renderAssetRow)}
            </div>
          </div>
        );
      })}

      {canUpload && (
        <div className="mt-2">
          {uploading && <UploadPatienceBanner active={uploading} />}
          {chunkStatus && <p className="mb-1.5 mt-1.5 text-[11px] text-white/40">{chunkStatus}</p>}
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" id={`file-${taskId}`} disabled={uploading} />
          <label
            htmlFor={`file-${taskId}`}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
            style={{ color: COLOR.blue, opacity: uploading ? 0.5 : 1 }}
          >
            {uploading ? "Uploading..." : "+ Upload file"}
          </label>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

          <div className="mt-2.5">
            <AddTaskSubSection taskId={taskId} onChanged={onChanged} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagedProjectTasks({
  managedProjectId,
  isOwner,
  currentCreatorId,
  assigneeOptions,
}: {
  managedProjectId: string;
  isOwner: boolean;
  currentCreatorId: string;
  assigneeOptions: AssigneeOption[];
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToCreatorId, setAssignedToCreatorId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } finally {
      setLoading(false);
    }
  }, [managedProjectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedToCreatorId) {
      setFormError("Choose who this is assigned to");
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assignedToCreatorId, priority, dueDate: dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create task");
      setTitle("");
      setDescription("");
      setAssignedToCreatorId("");
      setPriority("MEDIUM");
      setDueDate("");
      setShowForm(false);
      loadTasks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as TaskRow["status"] } : t)));
    const res = await fetch(`/api/managed-projects/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;
    const res = await fetch(`/api/managed-projects/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) loadTasks();
  };

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Tasks</p>
          {tasks.length > 0 && (
            <p className="mt-0.5 text-xs text-white/40">
              {doneCount} of {tasks.length} done · {progressPercent}%
            </p>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: COLOR.gradient }}
          >
            {showForm ? "Cancel" : "+ New task"}
          </button>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: COLOR.blue }} />
        </div>
      )}

      {showForm && (
        <form onSubmit={createTask} className="mb-6 flex flex-col gap-3 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            />
            {/* Not just an internal label — once this task's work is
                published, this exact title becomes the section
                heading your client sees on their delivery page. Worth
                a real, client-facing name, not shorthand only your
                team would understand. */}
            <p className="mt-1.5 text-[11px] text-white/30">
              Becomes the section name your client sees once this is published — name it accordingly.
            </p>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={assignedToCreatorId}
              onChange={(e) => setAssignedToCreatorId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            >
              <option value="">Assign to...</option>
              {assigneeOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id === currentCreatorId ? "Me" : a.name || a.email}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              style={{ colorScheme: "dark" }}
            />
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="w-fit rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: COLOR.gradient }}
          >
            {creating ? "Creating..." : "Create task"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-white/30">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-white/30">No tasks yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const canUpdateStatus = isOwner || task.assignedTo.id === currentCreatorId;
            const canUpload = isOwner || task.assignedTo.id === currentCreatorId;
            return (
              <div key={task.id} className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[task.priority] }} title={task.priority} />
                      <p className="text-sm font-medium text-white">{task.title}</p>
                    </div>
                    {task.description && <p className="mt-1 text-xs text-white/50">{task.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                      <span>{task.assignedTo.id === currentCreatorId ? "Assigned to you" : `Assigned to ${task.assignedTo.name || task.assignedTo.email}`}</span>
                      {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => deleteTask(task.id)} className="flex-shrink-0 text-xs text-white/25 transition-colors hover:text-red-400">
                      Delete
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {(["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => canUpdateStatus && updateStatus(task.id, s)}
                      disabled={!canUpdateStatus}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold transition-opacity disabled:cursor-default"
                      style={{
                        background: task.status === s ? STATUS_COLORS[s].bg : "transparent",
                        color: task.status === s ? STATUS_COLORS[s].text : "rgba(255,255,255,0.25)",
                        border: task.status === s ? "none" : "1px solid rgba(255,255,255,0.08)",
                        opacity: canUpdateStatus ? 1 : 0.5,
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                <TaskAssets
                  taskId={task.id}
                  assets={task.linkedAssets}
                  folders={task.folders}
                  canUpload={canUpload}
                  isOwner={isOwner}
                  onChanged={loadTasks}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}