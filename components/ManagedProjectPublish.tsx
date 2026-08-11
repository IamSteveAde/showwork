"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR = { blue: "#2478FF", gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" };

// Owner-only: publish approved task work to the client portal. Every
// managed project already has its own delivery from the moment it
// was created — there's no linking step anymore, just publish.
export default function ManagedProjectPublish({
  managedProjectId,
  publishedAt,
}: {
  managedProjectId: string;
  publishedAt: string | null;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const publish = async () => {
    if (!window.confirm("Publish approved work to the client now? This can't be undone for the files that go out.")) return;
    setPublishing(true);
    setError(null);
    setPublishResult(null);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to publish");
      setPublishResult(`Published ${data.publishedCount} file${data.publishedCount === 1 ? "" : "s"} to the client.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      <p className="mb-4 text-sm font-semibold text-white">Publish to client</p>

      <div className="flex flex-col gap-4">
        {publishedAt ? (
          <p className="text-xs" style={{ color: "#4ade80" }}>
            Published {new Date(publishedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} —
            the client portal now shows the finished files.
          </p>
        ) : (
          <p className="text-xs text-white/40">
            Before publishing, the client portal shows task progress. Once you publish, it switches to showing
            every approved file.
          </p>
        )}
        <button
          onClick={publish}
          disabled={publishing}
          className="w-fit rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: COLOR.gradient }}
        >
          {publishing ? "Publishing..." : publishedAt ? "Publish new approved work" : "Publish to client"}
        </button>
        {publishResult && <p className="text-xs" style={{ color: "#4ade80" }}>{publishResult}</p>}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}