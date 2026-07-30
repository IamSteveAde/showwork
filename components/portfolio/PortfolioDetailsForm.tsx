"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR = { gold: "#F5C842", black: "#0A0A0A" };

interface BannerCandidate {
  id: string;
  url: string;
  type: "PHOTO" | "VIDEO";
}

export default function PortfolioDetailsForm({
  companyName,
  heroTagline,
  heroMediaId,
  bannerCandidates,
}: {
  companyName: string;
  heroTagline: string | null;
  heroMediaId: string | null;
  bannerCandidates: BannerCandidate[];
}) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [tagline, setTagline] = useState(heroTagline ?? "");
  const [selectedHero, setSelectedHero] = useState(heroMediaId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const anyVideo = bannerCandidates.some((b) => b.type === "VIDEO");

  const save = async () => {
    setSaving(true);
    await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: name, heroTagline: tagline, heroMediaId: selectedHero }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Company / brand name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Banner headline
        </label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={80}
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      {bannerCandidates.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Choose your banner
          </label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {bannerCandidates.map((b) => {
              const selectable = !anyVideo || b.type === "VIDEO";
              const isSelected = b.id === selectedHero;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => setSelectedHero(b.id)}
                  className="relative aspect-square overflow-hidden rounded-lg bg-black/40 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ border: isSelected ? `2px solid ${COLOR.gold}` : "2px solid rgba(255,255,255,0.08)" }}
                >
                  {b.type === "VIDEO" ? (
                    <video src={b.url} muted className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.url} alt="" className="h-full w-full object-cover" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: COLOR.gold, color: COLOR.black }}>
                        ✓
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-fit rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: COLOR.gold, color: COLOR.black }}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}