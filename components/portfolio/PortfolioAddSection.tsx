"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MediaType = "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
type Step = "closed" | "type" | "details";

function uploadWithProgress(url: string, file: File, onProgress: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export default function PortfolioAddSection({ hasSections }: { hasSections: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    if (!mediaType) return;
    if (!sectionName.trim()) { setError("Give this section a name"); return; }
    if (files.length === 0) { setError("Choose at least one file"); return; }
    setError(null);
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

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Uploading ${i + 1} of ${files.length}...`);

        const presignRes = await fetch("/api/portfolio/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json();
          throw new Error(data.error ?? "presign failed");
        }
        const { uploadUrl, fileKey } = await presignRes.json();

        await uploadWithProgress(uploadUrl, file, () => {});

        const completeRes = await fetch("/api/portfolio/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey, type: mediaType, sectionId: section.id }),
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
            onChange={(e) => setSectionName(e.target.value)}
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
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="hidden"
            id="portfolio-builder-files"
          />
          <label htmlFor="portfolio-builder-files" className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-white/50 hover:border-white/25">
            {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} selected — click to change` : "Choose files"}
          </label>
          <div className="flex items-center gap-3">
            <button onClick={handleUpload} disabled={uploading} className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: "#F5C842", color: "#0A0A0A" }}>
              {uploading ? (status ?? "Uploading...") : "✓ Save section"}
            </button>
            <button onClick={reset} className="text-xs text-white/40 underline">Cancel</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}