"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

export default function AddMoreFilesButton({
  projectId,
  remaining,
}: {
  projectId: string;
  remaining: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    try {
      // Uses one of the 3 total "add more" sessions for this project,
      // checked and reserved before any file starts uploading.
      const batchRes = await fetch(`/api/projects/${projectId}/add-files-batch`, {
        method: "POST",
      });
      if (!batchRes.ok) {
        const data = await batchRes.json();
        throw new Error(data.error ?? "Couldn't start this upload session");
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = file.type.startsWith("video") ? "VIDEO" : "PHOTO";
        setStatus(`Uploading ${i + 1} of ${files.length}...`);

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
          body: JSON.stringify({ projectId, fileKey, type }),
        });
        if (!completeRes.ok) throw new Error("Failed to save file");
      }

      setStatus("Done");
      router.refresh();
      setTimeout(() => setStatus(null), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (remaining <= 0) {
    return (
      <p className="text-xs text-white/30">
        You&apos;ve used all 3 add-more-files sessions for this project.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={handleFiles}
        className="hidden"
        id={`add-files-${projectId}`}
      />
      <label
        htmlFor={`add-files-${projectId}`}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
        style={{ background: "rgba(245,200,66,0.12)", color: "#F5C842" }}
      >
        {status ?? "+ Add more files"}
      </label>
      <p className="mt-1.5 text-xs text-white/30">
        {Number.isFinite(remaining) ? `${remaining} of 3 sessions remaining` : "Unlimited — subscription active"}
      </p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}