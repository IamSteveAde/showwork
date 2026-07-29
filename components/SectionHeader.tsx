"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";

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

function acceptFor(mediaType: MediaType): string {
  if (mediaType === "VIDEO") return "video/mp4,video/quicktime,video/webm";
  if (mediaType === "PHOTO") return "image/jpeg,image/png,image/webp,image/svg+xml,image/avif";
  if (mediaType === "PDF") return "application/pdf";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export default function SectionHeader({
  projectId,
  sectionId,
  name,
  mediaType,
  fileCount,
  uploadSessionsRemaining,
}: {
  projectId: string;
  sectionId: string;
  name: string;
  mediaType: MediaType;
  fileCount: number;
  uploadSessionsRemaining: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!value.trim() || value.trim() === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    await fetch(`/api/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  // Adds files directly into this already-existing section — no need
  // to re-choose a type or re-name anything, since both are already
  // fixed for this section. Still uses one of the same 3 total
  // add-more-files sessions as creating a brand-new section would.
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    try {
      const batchRes = await fetch(`/api/projects/${projectId}/add-files-batch`, { method: "POST" });
      if (!batchRes.ok) {
        const data = await batchRes.json();
        throw new Error(data.error ?? "Couldn't start this upload session");
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading ${i + 1} of ${files.length}...`);

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
      }

      setUploadStatus("Done");
      router.refresh();
      setTimeout(() => setUploadStatus(null), 1200);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong");
      setUploadStatus(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteSection = async () => {
    setDeleting(true);
    const res = await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setConfirmingDelete(false);
    }
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
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "#F5C842", color: "#0A0A0A" }}
        >
          {saving ? "..." : "Save"}
        </button>
        <button onClick={() => { setEditing(false); setValue(name); }} className="text-xs text-white/40 underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
          {name} ({fileCount})
        </h2>
        <button
          onClick={() => setEditing(true)}
          aria-label="Rename section"
          className="text-xs text-white/30 underline hover:text-white/60"
        >
          Rename
        </button>

        <span className="text-white/15">·</span>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptFor(mediaType)}
          onChange={handleAddFiles}
          className="hidden"
          id={`add-to-section-${sectionId}`}
        />
        {uploadSessionsRemaining > 0 ? (
          <label
            htmlFor={`add-to-section-${sectionId}`}
            className="cursor-pointer text-xs font-semibold underline"
            style={{ color: "#F5C842" }}
          >
            {uploading ? (uploadStatus ?? "Uploading...") : "+ Add files"}
          </label>
        ) : (
          <span className="text-xs text-white/20">Add-more limit reached</span>
        )}

        <span className="text-white/15">·</span>

        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-white/50">
              Permanently delete this section and every file inside it? This can&apos;t be undone.
            </span>
            <button
              onClick={handleDeleteSection}
              disabled={deleting}
              className="rounded-md bg-red-500 px-2 py-1 font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "..." : "Confirm"}
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-white/40 underline">
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-red-400/70 underline hover:text-red-400"
          >
            Delete section
          </button>
        )}
      </div>
      {uploadError && <p className="mt-1.5 text-xs text-red-400">{uploadError}</p>}
    </div>
  );
}