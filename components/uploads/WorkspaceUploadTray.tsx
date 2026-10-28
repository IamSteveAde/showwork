"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Pause, Play,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  workspaceUploadQueue as queue,
  type UploadRow,
} from "@/lib/workspaceUploadQueue";
const empty: UploadRow[] = [];
const labels = {
  queued: "Queued",
  paused: "Paused · chunks saved",
  uploading: "Uploading",
  saving: "Saving / processing",
  failed: "Needs retry",
  cancelled: "Cancelled",
  complete: "Uploaded",
};
export default function WorkspaceUploadTray({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const rows = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    () => empty,
  ).filter((row) => row.workspaceId === workspaceId);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!rows.some((row) => !["complete", "cancelled"].includes(row.state)))
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [rows]);
  if (!mounted || !rows.length) return null;
  const pending = rows.filter(
    (row) => !["complete", "cancelled"].includes(row.state),
  ).length;
  return createPortal(
    <section
      aria-label="Workspace uploads"
      style={{
        position: "fixed",
        zIndex: 2147483000,
        bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
        right: 12,
        width: "min(360px, calc(100vw - 24px))",
        borderRadius: 20,
        background: "#fff",
        color: "#173456",
        boxShadow: "0 16px 60px #102c5140",
        border: "1px solid #d5e4fa",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-2 bg-blue-600 px-4 py-3 text-white">
        <UploadCloud size={18} />
        <strong className="flex-1 text-sm">
          Uploads {pending ? `· ${pending} remaining` : "complete"}
        </strong>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline focus-visible:outline-2"
          aria-label={collapsed ? "Expand uploads" : "Minimize uploads"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {!pending && (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline focus-visible:outline-2"
            aria-label="Dismiss completed uploads"
            onClick={() => queue.clearFinished(workspaceId)}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {!collapsed && (
        <div style={{ maxHeight: "min(350px, 45dvh)", overflowY: "auto" }}>
          {rows.map((row) => (
            <div key={row.id} className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate text-sm font-medium"
                  title={row.name}
                >
                  {row.name}
                </span>
                {row.state === "complete" && (
                  <Check size={16} className="text-green-600" />
                )}
                {row.resumable && ["uploading", "queued", "paused"].includes(row.state) && (
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600" aria-label={`${row.state === "paused" ? "Resume" : "Pause"} ${row.name}`} onClick={() => row.state === "paused" ? queue.resume(row.id) : queue.pause(row.id)}>
                    {row.state === "paused" ? <Play size={16}/> : <Pause size={16}/>}
                  </button>
                )}
                {row.state === "failed" && (
                  <button
                    type="button"
                    className="min-h-8 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline"
                    onClick={() => queue.retry(row.id)}
                  >
                    <RotateCcw size={13} className="mr-1 inline" />
                    {row.resumable ? "Resume" : "Retry"}
                  </button>
                )}
                {["queued", "uploading", "failed", "paused"].includes(row.state) && (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline"
                    aria-label={`Cancel ${row.name}`}
                    onClick={() => queue.cancel(row.id)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500" role="status">
                {labels[row.state]}
                {row.state === "uploading"
                  ? ` · ${Math.floor(row.percent)}%`
                  : ""}
              </p>
              {["uploading", "saving"].includes(row.state) && (
                <progress
                  aria-label={`${row.name} transfer`}
                  value={row.percent}
                  max={100}
                  className="mt-2 h-1 w-full accent-blue-600"
                />
              )}
              {row.resumable && !["complete", "cancelled"].includes(row.state) && <p className="mt-1 text-xs text-slate-500">After refreshing, select this same video on this post to resume. Sessions last 8 hours.</p>}
              {row.error && (
                <p className="mt-1 text-xs text-red-600">{row.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>,
    document.body,
  );
}
