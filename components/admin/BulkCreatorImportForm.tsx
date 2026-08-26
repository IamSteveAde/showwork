"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkCreatorImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: string[]; skipped: string[]; emailFailed: string[]; totalFound: number } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/creators/bulk-import", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok) {
      setResult(data);
      setFile(null);
      router.refresh();
    } else {
      setError(data.error ?? "Failed to process file");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading}
        className="rounded-md py-2 text-xs font-semibold disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {loading ? "Creating accounts..." : "Create accounts from file"}
      </button>

      {result && (
        <div className="mt-1 flex flex-col gap-1.5 rounded-md p-3 text-xs" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-white/60">
            Found {result.totalFound} email{result.totalFound === 1 ? "" : "s"} —{" "}
            <span style={{ color: "#4ade80" }}>{result.created.length} created</span>,{" "}
            <span className="text-white/40">{result.skipped.length} already existed</span>.
          </p>
          {result.emailFailed.length > 0 && (
            <p className="text-orange-400">
              {result.emailFailed.length} account{result.emailFailed.length === 1 ? "" : "s"} created but the notification email failed to send.
            </p>
          )}
        </div>
      )}
    </div>
  );
}