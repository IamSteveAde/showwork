"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_META: Record<string, { text: string; color: string; bg: string; description: string }> = {
  BUILDING: {
    text: "Building",
    color: "#888786",
    bg: "rgba(136,135,134,0.15)",
    description: "Your client can't see this yet — lay out the plan, then publish it for their approval.",
  },
  AWAITING_APPROVAL: {
    text: "Awaiting client approval",
    color: "#FFCC00",
    bg: "rgba(255,204,0,0.12)",
    description: "Your client has been sent the plan and is reviewing it.",
  },
  PLAN_APPROVED: {
    text: "Plan approved",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.15)",
    description: "The plan is approved — you can now create the actual content for each post.",
  },
  PLAN_NEEDS_CHANGES: {
    text: "Plan needs changes",
    color: "#F97316",
    bg: "rgba(249,115,22,0.15)",
    description: "Your client asked for changes — update the plan, then publish it again.",
  },
};

function HeaderBannerModal({
  calendarId,
  initialTitle,
  initialDescription,
  initialDesktopUrl,
  initialMobileUrl,
  onClose,
  onSaved,
}: {
  calendarId: string;
  initialTitle: string;
  initialDescription: string;
  initialDesktopUrl: string | null;
  initialMobileUrl: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [desktopUrl, setDesktopUrl] = useState(initialDesktopUrl);
  const [mobileUrl, setMobileUrl] = useState(initialMobileUrl);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadBanner = async (file: File, variant: "desktop" | "mobile") => {
    const setUploading = variant === "desktop" ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);
    setError(null);
    try {
      const presignRes = await fetch(`/api/calendars/${calendarId}/banner-upload-presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, variant }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const publicUrl = presignData.fileKey;
      if (variant === "desktop") setDesktopUrl(publicUrl);
      else setMobileUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_header",
          headerTitle: title,
          headerDescription: description,
          headerBannerDesktopUrl: desktopUrl,
          headerBannerMobileUrl: mobileUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      if (publish) {
        await fetch(`/api/calendars/${calendarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border"
        style={{ background: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex-shrink-0 border-b px-6 py-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-semibold text-white">Set up how your client sees this</h2>
          <p className="mt-1 text-xs text-white/40">Optional — a banner, title, and short description shown at the top of their view. Skip this and publish plain if you&apos;d rather.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chuchin — September content"
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A short note about what this month's content is about"
                style={{ fontSize: "16px" }}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Desktop banner
              </label>
              <p className="mb-2 text-[11px] text-white/30">Landscape works best — wide, roughly 1920×720.</p>
              <label className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 text-xs text-white/50 hover:border-white/30">
                {uploadingDesktop ? (
                  "Uploading..."
                ) : desktopUrl ? (
                  <span className="text-green-400">✓ Banner set — tap to replace</span>
                ) : (
                  "Tap to upload a landscape image"
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingDesktop}
                  onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0], "desktop")}
                />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Mobile banner
              </label>
              <p className="mb-2 text-[11px] text-white/30">Portrait works best — taller than wide, roughly 1080×1350.</p>
              <label className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 text-xs text-white/50 hover:border-white/30">
                {uploadingMobile ? (
                  "Uploading..."
                ) : mobileUrl ? (
                  <span className="text-green-400">✓ Banner set — tap to replace</span>
                ) : (
                  "Tap to upload a portrait image"
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingMobile}
                  onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0], "mobile")}
                />
              </label>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button onClick={onClose} className="text-xs font-semibold text-white/40 underline">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-xs font-semibold text-white/70 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              Save only
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
            >
              {saving ? "Publishing..." : "Save & publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPlanStatus({
  calendarId,
  planStatus,
  planApprovalNote,
  headerTitle,
  headerDescription,
  headerBannerDesktopUrl,
  headerBannerMobileUrl,
}: {
  calendarId: string;
  planStatus: string;
  planApprovalNote: string | null;
  headerTitle: string | null;
  headerDescription: string | null;
  headerBannerDesktopUrl: string | null;
  headerBannerMobileUrl: string | null;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const meta = STATUS_META[planStatus] ?? STATUS_META.BUILDING;
  const canPublish = planStatus === "BUILDING" || planStatus === "PLAN_NEEDS_CHANGES";

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between" style={{ background: "#1A1A1A" }}>
        <div>
          <span className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ color: meta.color, background: meta.bg }}>
            {meta.text}
          </span>
          <p className="text-sm text-white/50">{meta.description}</p>
          {planStatus === "PLAN_NEEDS_CHANGES" && planApprovalNote && (
            <p className="mt-2 rounded-lg p-3 text-sm text-white/70" style={{ background: "rgba(249,115,22,0.08)" }}>
              &ldquo;{planApprovalNote}&rdquo;
            </p>
          )}
          <button onClick={() => setShowHeaderModal(true)} className="mt-2 text-xs font-semibold underline" style={{ color: "#2478FF" }}>
            {headerTitle || headerBannerDesktopUrl ? "Edit banner & header" : "Add a banner & header"}
          </button>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowHeaderModal(true)}
            disabled={publishing}
            className="flex-shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
          >
            Publish for approval
          </button>
        )}
      </div>

      {showHeaderModal && (
        <HeaderBannerModal
          calendarId={calendarId}
          initialTitle={headerTitle ?? ""}
          initialDescription={headerDescription ?? ""}
          initialDesktopUrl={headerBannerDesktopUrl}
          initialMobileUrl={headerBannerMobileUrl}
          onClose={() => setShowHeaderModal(false)}
          onSaved={() => {
            setShowHeaderModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}