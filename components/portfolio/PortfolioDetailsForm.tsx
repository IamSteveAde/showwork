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
  contactEmail,
  whatsappNumber,
  ctaText,
  instagramUrl,
  twitterUrl,
  linkedinUrl,
  tiktokUrl,
  facebookUrl,
  youtubeUrl,
}: {
  companyName: string;
  heroTagline: string | null;
  heroMediaId: string | null;
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
}) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [tagline, setTagline] = useState(heroTagline ?? "");
  const [selectedHero, setSelectedHero] = useState(heroMediaId);
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

  const anyVideo = bannerCandidates.some((b) => b.type === "VIDEO");

  const save = async () => {
    setSaving(true);
    await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: name,
        heroTagline: tagline,
        heroMediaId: selectedHero,
        contactEmail: email,
        whatsappNumber: whatsapp,
        ctaText: cta,
        instagramUrl: instagram,
        twitterUrl: twitter,
        linkedinUrl: linkedin,
        tiktokUrl: tiktok,
        facebookUrl: facebook,
        youtubeUrl: youtube,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-white/40";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Company / brand name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
      </div>

      <div>
        <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Banner headline</label>
        <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} style={{ fontSize: "16px" }} className={inputClass} />
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

      <div className="my-1 h-px bg-white/5" />
      <p className="text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: "0.08em" }}>How clients reach you</p>

      <div>
        <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Contact email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@yourstudio.com" style={{ fontSize: "16px" }} className={inputClass} />
      </div>

      <div>
        <label className={labelClass} style={{ letterSpacing: "0.08em" }}>WhatsApp number</label>
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+2348012345678" style={{ fontSize: "16px" }} className={inputClass} />
      </div>

      <div>
        <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Call-to-action text</label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          placeholder="Let's create something worth remembering — reach out and let's deliver the best for your next project."
          maxLength={140}
          style={{ fontSize: "16px" }}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/30">Leave blank to use the default.</p>
      </div>

      <div className="my-1 h-px bg-white/5" />
      <p className="text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: "0.08em" }}>
        Social media <span className="normal-case text-white/25">(only shown in the footer if filled in)</span>
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Instagram</label>
          <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>X / Twitter</label>
          <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/yourhandle" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>LinkedIn</label>
          <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourname" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>TikTok</label>
          <input type="url" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@yourhandle" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>Facebook</label>
          <input type="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} style={{ letterSpacing: "0.08em" }}>YouTube</label>
          <input type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" style={{ fontSize: "16px" }} className={inputClass} />
        </div>
      </div>

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