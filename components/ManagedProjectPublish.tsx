"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const COLOR = { blue: "#2478FF", gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" };

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
      <circle cx="7" cy="7" r="6.5" stroke="#2478FF" strokeWidth="1.3" />
      <path d="M4.5 7.2l1.7 1.7L9.7 5" stroke="#2478FF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const publish = async () => {
    setPublishing(true);
    setError(null);
    setPublishResult(null);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to publish");
      setPublishResult(`Published ${data.publishedCount} file${data.publishedCount === 1 ? "" : "s"} to the client.`);
      setShowConfirm(false);
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
          onClick={() => setShowConfirm(true)}
          disabled={publishing}
          className="w-fit rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: COLOR.gradient }}
        >
          {publishedAt ? "Publish new approved work" : "Publish to client"}
        </button>
        {publishResult && <p className="text-xs" style={{ color: "#4ade80" }}>{publishResult}</p>}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {/* A real modal instead of a browser confirm() — clear about
          exactly what changes once this happens, since a plain
          confirm() dialog was leaving people unsure what they were
          actually agreeing to. */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => !publishing && setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-7"
              style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
                {publishedAt ? "Publish new work" : "Ready to publish?"}
              </p>
              <h2 className="mb-5 text-xl font-bold text-white">
                {publishedAt ? "Send this new approved work to your client" : "This is a one-way door"}
              </h2>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-start gap-2.5">
                  <CheckIcon />
                  <p className="text-sm leading-relaxed text-white/70">
                    Your client will see the <strong className="text-white">finished files</strong> instead of the progress view they&apos;ve been looking at.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckIcon />
                  <p className="text-sm leading-relaxed text-white/70">
                    You <strong className="text-white">won&apos;t be able to add new tasks</strong> to this project anymore — the scope of work locks in at this point.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckIcon />
                  <p className="text-sm leading-relaxed text-white/70">
                    Existing tasks can still be finished and approved — you can publish that work in a later round too.
                  </p>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

              <div className="mt-7 flex items-center gap-3">
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="flex-1 rounded-lg py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: COLOR.gradient }}
                >
                  {publishing ? "Publishing..." : "Yes, publish"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={publishing}
                  className="rounded-lg px-5 py-3 text-sm font-semibold text-white/50 transition-colors hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}