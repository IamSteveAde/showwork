"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "type" | "details";

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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setStep("closed");
    setMediaType(null);
    setSectionName("");
    setFiles([]);
    setStatus(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const chooseType = (type: MediaType) => {
    setMediaType(type);
    setError(null);
    setStep("details");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []));
  };

  const handleUpload = async () => {
    if (!mediaType) return;
    if (!sectionName.trim()) {
      setError("Give this section a name");
      return;
    }
    if (files.length === 0) {
      setError("Choose at least one file");
      return;
    }
    setError(null);
    setUploading(true);

    try {
      // Reserves one of the 3 total add-more sessions for this project
      // before anything starts uploading.
      const batchRes = await fetch(`/api/projects/${projectId}/add-files-batch`, {
        method: "POST",
      });
      if (!batchRes.ok) {
        const data = await batchRes.json();
        throw new Error(data.error ?? "Couldn't start this upload session");
      }

      // Create the named section first, then attach every file in this
      // batch to it.
      const sectionRes = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName, mediaType }),
      });
      if (!sectionRes.ok) {
        const data = await sectionRes.json();
        throw new Error(data.error ?? "Couldn't create the section");
      }
      const { section } = await sectionRes.json();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
          body: JSON.stringify({ projectId, fileKey, type: mediaType, sectionId: section.id }),
        });
        if (!completeRes.ok) throw new Error("Failed to save file");
      }

      setStatus("Done");
      router.refresh();
      setTimeout(reset, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus(null);
    } finally {
      setUploading(false);
    }
  };

  if (remaining <= 0) {
    return (
      <p className="text-xs text-white/30">
        You&apos;ve used all 3 add-more-files sessions for this project.
      </p>
    );
  }

  if (step === "closed") {
    return (
      <div>
        <button
          onClick={() => setStep("type")}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: "rgba(245,200,66,0.12)", color: "#F5C842" }}
        >
          + Add section
        </button>
        <p className="mt-1.5 text-xs text-white/30">
          {Number.isFinite(remaining) ? `${remaining} of 3 sessions remaining` : "Unlimited — subscription active"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
      {step === "type" && (
        <>
          <p className="text-sm font-semibold text-white/70">What are you uploading?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => chooseType("PHOTO")}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-sm font-semibold text-white">Images</span>
              <span className="text-xs text-white/40">Photos, renders, mockups</span>
            </button>
            <button
              onClick={() => chooseType("VIDEO")}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-2xl">🎬</span>
              <span className="text-sm font-semibold text-white">Videos</span>
              <span className="text-xs text-white/40">Films, walkthroughs, reels</span>
            </button>
            <button
              onClick={() => chooseType("DOCUMENT")}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-semibold text-white">Documents</span>
              <span className="text-xs text-white/40">Word docs (.docx)</span>
            </button>
            <button
              onClick={() => chooseType("PDF")}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-6 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-2xl">📕</span>
              <span className="text-sm font-semibold text-white">PDFs</span>
              <span className="text-xs text-white/40">Proposals, contracts, decks</span>
            </button>
          </div>
          <button onClick={reset} className="text-left text-xs text-white/40 underline">
            Cancel
          </button>
        </>
      )}

      {step === "details" && (
        <>
          <p className="text-xs font-semibold text-white/70">
            {mediaType === "VIDEO"
              ? "🎬 Videos"
              : mediaType === "PHOTO"
                ? "🖼️ Images"
                : mediaType === "PDF"
                  ? "📕 PDFs"
                  : "📄 Documents"} — name this section
          </p>
          <input
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            placeholder={
              mediaType === "VIDEO"
                ? "e.g. Ceremony Highlights"
                : mediaType === "PHOTO"
                  ? "e.g. Room Renders"
                  : mediaType === "PDF"
                    ? "e.g. Signed Contract"
                    : "e.g. Brand Guidelines"
            }
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
          />

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={
              mediaType === "VIDEO"
                ? "video/mp4,video/quicktime,video/webm"
                : mediaType === "PHOTO"
                  ? "image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
                  : mediaType === "PDF"
                    ? "application/pdf"
                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
            onChange={handleFileSelect}
            className="hidden"
            id={`section-files-${projectId}`}
          />
          <label
            htmlFor={`section-files-${projectId}`}
            className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-white/50 hover:border-white/25"
          >
            {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} selected — click to change` : "Choose files"}
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "#F5C842", color: "#0A0A0A" }}
            >
              {uploading ? (status ?? "Uploading...") : "Upload"}
            </button>
            <button onClick={reset} className="text-xs text-white/40 underline">
              Cancel
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}