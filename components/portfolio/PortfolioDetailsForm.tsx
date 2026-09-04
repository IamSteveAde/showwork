"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BannerCandidate {
  id: string;
  url: string;
  type: "PHOTO" | "VIDEO";
}

export default function PortfolioDetailsForm({
  companyName,
  heroTagline,
  heroMediaId,
    heroBannerDesktopUrl: initialBannerDesktopUrl,
  heroBannerDesktopType: initialBannerDesktopType,
  heroBannerMobileUrl: initialBannerMobileUrl,
  heroBannerMobileType: initialBannerMobileType,
  bannerCandidates,
  contactEmail,
  whatsappNumber,
  ctaText,
  instagramUrl,
  twitterUrl,
  linkedinUrl,
  tiktokUrl,
  facebookUrl,
  youtubeUrl,
  bioText: initialBioText,
  bioSkills: initialBioSkills,
  bioStat: initialBioStat,
  bioPhotoUrl: initialBioPhotoUrl,
}: {
   companyName: string;
  heroTagline: string | null;
  heroMediaId: string | null;
    heroBannerDesktopUrl: string | null;
  heroBannerDesktopType: string | null;
  heroBannerMobileUrl: string | null;
  heroBannerMobileType: string | null;
  bannerCandidates: BannerCandidate[];
  contactEmail: string | null;
  whatsappNumber: string | null;
  ctaText: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  bioText?: string | null;
  bioSkills?: string[];
  bioStat?: string | null;
  bioPhotoUrl?: string | null;
}) {
  const router = useRouter();

   const [name, setName] = useState(companyName);
  const [tagline, setTagline] = useState(heroTagline ?? "");
  const [selectedHero, setSelectedHero] = useState(heroMediaId);
    const [bannerDesktopUrl, setBannerDesktopUrl] = useState(initialBannerDesktopUrl ?? "");
  const [bannerDesktopType, setBannerDesktopType] = useState<"IMAGE" | "VIDEO">((initialBannerDesktopType as "IMAGE" | "VIDEO") ?? "IMAGE");
  const [bannerMobileUrl, setBannerMobileUrl] = useState(initialBannerMobileUrl ?? "");
  const [bannerMobileType, setBannerMobileType] = useState<"IMAGE" | "VIDEO">((initialBannerMobileType as "IMAGE" | "VIDEO") ?? "IMAGE");
  const [uploadingDesktopBanner, setUploadingDesktopBanner] = useState(false);
  const [uploadingMobileBanner, setUploadingMobileBanner] = useState(false);
  const [email, setEmail] = useState(contactEmail ?? "");
  const [whatsapp, setWhatsapp] = useState(whatsappNumber ?? "");
  const [cta, setCta] = useState(ctaText ?? "");
  const [instagram, setInstagram] = useState(instagramUrl ?? "");
  const [twitter, setTwitter] = useState(twitterUrl ?? "");
  const [linkedin, setLinkedin] = useState(linkedinUrl ?? "");
  const [tiktok, setTiktok] = useState(tiktokUrl ?? "");
  const [facebook, setFacebook] = useState(facebookUrl ?? "");
  const [youtube, setYoutube] = useState(youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Intro / bio section — shown before the portfolio's own sections
  // on the public page. Separate state from everything above, but
  // saved together in the same save() call below. ──
  const [bioText, setBioText] = useState(initialBioText ?? "");
  const [bioSkills, setBioSkills] = useState<string[]>(initialBioSkills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [bioStat, setBioStat] = useState(initialBioStat ?? "");
  const [bioPhotoUrl, setBioPhotoUrl] = useState(initialBioPhotoUrl ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const uploadBioPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const presignRes = await fetch("/api/portfolio/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      // A profile photo isn't gallery work, so this deliberately never
      // calls /api/portfolio/upload/complete — that route creates a
      // PortfolioMedia row meant for actual portfolio pieces, which
      // isn't what a bio photo is. presignData.publicUrl is what gets
      // saved directly.
      setBioPhotoUrl(presignData.publicUrl);
    } catch {
      // silently ignored — matches how this form already handles
      // upload-adjacent actions without an inline error state
    } finally {
      setUploadingPhoto(false);
    }
  };

     const uploadBanner = async (
    file: File,
    setUrl: (url: string) => void,
    setType: (type: "IMAGE" | "VIDEO") => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const presignRes = await fetch("/api/portfolio/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, fileSizeMb: file.size / (1024 * 1024) }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to start upload");

      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      // Same reasoning as the bio photo above — a banner isn't a
      // gallery piece, so this never calls /api/portfolio/upload/
      // complete; the public URL is saved directly. The type is
      // recorded alongside it so the public page knows whether to
      // render this as an <img> or a <video>.
      setUrl(presignData.publicUrl);
      setType(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    } catch {
      // silently ignored, matching how uploadBioPhoto already handles this
    } finally {
      setUploading(false);
    }
  };
  const addSkill = () => {
    const trimmed = skillDraft.trim();
    if (trimmed && !bioSkills.includes(trimmed)) {
      setBioSkills([...bioSkills, trimmed]);
    }
    setSkillDraft("");
  };

  const removeSkill = (skill: string) => {
    setBioSkills(bioSkills.filter((s) => s !== skill));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
               companyName: name,
        heroTagline: tagline,
        heroMediaId: selectedHero,
                heroBannerDesktopUrl: bannerDesktopUrl,
        heroBannerDesktopType: bannerDesktopType,
        heroBannerMobileUrl: bannerMobileUrl,
        heroBannerMobileType: bannerMobileType,
        contactEmail: email,
        whatsappNumber: whatsapp,
        ctaText: cta,
        instagramUrl: instagram,
        twitterUrl: twitter,
        linkedinUrl: linkedin,
        tiktokUrl: tiktok,
        facebookUrl: facebook,
        youtubeUrl: youtube,
        bioText,
        bioSkills,
        bioStat,
        bioPhotoUrl,
      }),
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
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Tagline
        </label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="e.g. Director & Cinematographer"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

            {/* ── Banner — two dedicated uploads, one per screen shape.
          A single image can't look right on both a wide desktop
          screen and a tall phone screen at once: a landscape photo
          either gets awkwardly cropped on mobile, or shrinks down
          with empty space above and below it. Two purpose-shot
          images, each matching the screen it's actually for, is what
          lets the banner genuinely fill the screen properly on both. ── */}
      <div className="rounded-xl p-5" style={{ background: "rgba(36,120,255,0.05)", border: "1px solid rgba(36,120,255,0.2)" }}>
        <h3 className="mb-1 text-sm font-semibold text-white">Your portfolio's banner</h3>
        <p className="mb-4 text-xs leading-relaxed text-white/45">
          Upload two versions of your banner — one shaped for wide desktop screens, one shaped for tall phone screens.
          Visitors automatically see whichever one actually fits their screen.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Desktop banner
            </label>
            <p className="mb-2 text-[11px] text-white/35">
              Landscape — wider than it is tall. Recommended around 1920×1080px. Image or video.
            </p>
            {bannerDesktopUrl && (
              bannerDesktopType === "VIDEO" ? (
                <video src={bannerDesktopUrl} muted className="mb-2 aspect-video w-full rounded-lg object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerDesktopUrl} alt="" className="mb-2 aspect-video w-full rounded-lg object-cover" />
              )
            )}
            <label className="block cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-center text-xs text-white/50 hover:border-white/25">
              {uploadingDesktopBanner ? "Uploading..." : bannerDesktopUrl ? "Change desktop banner" : "Upload desktop banner"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="hidden"
                disabled={uploadingDesktopBanner}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBanner(file, setBannerDesktopUrl, setBannerDesktopType, setUploadingDesktopBanner);
                }}
              />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Mobile banner
            </label>
            <p className="mb-2 text-[11px] text-white/35">
              Portrait — taller than it is wide. Recommended around 1080×1350px. Image or video.
            </p>
            {bannerMobileUrl && (
              bannerMobileType === "VIDEO" ? (
                <video src={bannerMobileUrl} muted className="mb-2 aspect-[4/5] w-full rounded-lg object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerMobileUrl} alt="" className="mb-2 aspect-[4/5] w-full rounded-lg object-cover" />
              )
            )}
            <label className="block cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-center text-xs text-white/50 hover:border-white/25">
              {uploadingMobileBanner ? "Uploading..." : bannerMobileUrl ? "Change mobile banner" : "Upload mobile banner"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="hidden"
                disabled={uploadingMobileBanner}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBanner(file, setBannerMobileUrl, setBannerMobileType, setUploadingMobileBanner);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Legacy option — picks one already-uploaded section photo as
          the banner instead. Kept for anyone who set this up before
          the two dedicated uploads above existed; the two above take
          priority whenever they're set. */}
      {bannerCandidates.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Or, pick from your existing photos <span className="normal-case text-white/25">(used only if no banner is uploaded above)</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {bannerCandidates.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedHero(b.id)}
                className="relative aspect-square overflow-hidden rounded-lg"
                style={{ border: selectedHero === b.id ? "2px solid #F5C842" : "2px solid rgba(255,255,255,0.08)" }}
              >
                {b.type === "VIDEO" ? (
                  <video src={b.url} muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Contact email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          WhatsApp number
        </label>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Call-to-action text
        </label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          placeholder="e.g. Let's work together"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Instagram
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Twitter / X
          </label>
          <input
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            LinkedIn
          </label>
          <input
            type="text"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            TikTok
          </label>
          <input
            type="text"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Facebook
          </label>
          <input
            type="text"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            YouTube
          </label>
          <input
            type="text"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
      </div>

      {/* ── Intro / about section — shown before the portfolio's own
          sections on the public page. Its own visually distinct block
          so it reads as a deliberate addition, not just another field
          in the list above. ── */}
      <div className="mt-2 rounded-xl p-5" style={{ background: "rgba(245,200,66,0.05)", border: "1px solid rgba(245,200,66,0.2)" }}>
        <h3 className="mb-4 text-sm font-semibold text-white">Introduce yourself</h3>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Photo
          </label>
          <div className="flex items-center gap-3">
            {bioPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bioPhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            )}
            <label
              className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs text-white/50 hover:border-white/25"
            >
              {uploadingPhoto ? "Uploading..." : bioPhotoUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBioPhoto(file);
                }}
              />
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            About you
          </label>
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            rows={4}
            placeholder="A short introduction — who you are, what you do, what you care about in your work."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Skills / specialties
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {bioSkills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842" }}
              >
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="text-white/40 hover:text-white">
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Type a skill and press Enter"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Stat <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="text"
            value={bioStat}
            onChange={(e) => setBioStat(e.target.value)}
            placeholder="e.g. 50+ projects delivered"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-2 w-fit rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
      </button>
    </div>
  );
}