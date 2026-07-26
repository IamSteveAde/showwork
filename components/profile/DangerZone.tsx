"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DangerZone() {
  const router = useRouter();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setLoading("deactivate");
    const res = await fetch("/api/account/deactivate", { method: "POST" });
    if (res.ok) {
      router.push("/login");
    } else {
      setError("Failed to deactivate account");
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete account");
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Deactivate */}
      <div>
        <p className="text-sm font-medium text-white">Deactivate account</p>
        <p className="mt-1 text-xs text-white/40">
          Pauses your account and logs you out. Nothing is deleted — reversible by contacting support.
        </p>
        {confirmingDeactivate ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleDeactivate}
              disabled={loading === "deactivate"}
              className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading === "deactivate" ? "Deactivating..." : "Confirm deactivation"}
            </button>
            <button onClick={() => setConfirmingDeactivate(false)} className="text-xs text-white/40 underline">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDeactivate(true)}
            className="mt-3 rounded-lg px-4 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/10"
          >
            Deactivate account
          </button>
        )}
      </div>

      {/* Delete */}
      <div className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-sm font-medium text-white">Delete account</p>
        <p className="mt-1 text-xs text-white/40">
          Permanently deletes your account and every project, file, and record tied to it. This can&apos;t be undone.
        </p>
        {confirmingDelete ? (
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
              style={{ fontSize: "16px" }}
              className="max-w-xs rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={loading === "delete" || !deletePassword}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loading === "delete" ? "Deleting..." : "Permanently delete"}
              </button>
              <button onClick={() => { setConfirmingDelete(false); setDeletePassword(""); setError(null); }} className="text-xs text-white/40 underline">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 rounded-lg px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}