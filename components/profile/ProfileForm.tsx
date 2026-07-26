"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const COLOR = { gold: "#F5C842", black: "#0A0A0A" };

export default function ProfileForm({
  name,
  phone,
  email,
  emailVerified,
  avatarUrl,
  initialsFallback,
}: {
  name: string | null;
  phone: string | null;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  initialsFallback: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameInput, setNameInput] = useState(name ?? "");
  const [phoneInput, setPhoneInput] = useState(phone ?? "");
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);

    try {
      const presignRes = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error ?? "Failed to start upload");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const saveRes = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });
      if (!saveRes.ok) throw new Error("Failed to save avatar");

      setCurrentAvatar(publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput, phone: phoneInput }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      setSaving(false);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {currentAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentAvatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold"
              style={{ background: "rgba(245,200,66,0.18)", color: COLOR.gold }}
            >
              {initialsFallback}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] disabled:opacity-50"
            style={{ background: COLOR.gold, color: COLOR.black }}
            aria-label="Change avatar"
          >
            ✎
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
        </div>
        <p className="text-xs text-white/40">{uploadingAvatar ? "Uploading..." : "Click the pencil to upload a photo"}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Display name
        </label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Email
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-white/60">{email}</span>
          {emailVerified && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
              ✓ Verified
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Phone number
        </label>
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="+2348012345678"
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-fit rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: COLOR.gold, color: COLOR.black }}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}