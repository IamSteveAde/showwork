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

export default function ReplaceFileButton({
  mediaId,
  type,
  label,
}: {
  mediaId: string;
  type: "PHOTO" | "VIDEO";
  label: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept =
    type === "VIDEO" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus("Uploading 0%");

    try {
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

      setStatus("Done — refreshing...");
      router.refresh();
      setTimeout(() => setStatus(null), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-2">
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