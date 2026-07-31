"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR = { gold: "#F5C842", black: "#0A0A0A", orange: "#E8881A", charcoal: "#1A1A1A" };

export default function CreatePortfolioForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, heroTagline, contactEmail, whatsappNumber, ctaText }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
        Your portfolio
      </p>
      <h1 className="mb-2 text-3xl font-bold text-white">Set up your showcase</h1>
      <p className="mb-8 text-sm text-white/50">
        One link, always on — free on every plan. Unlike a project delivery, this isn&apos;t a one-time
        thing: add to it whenever you finish new work, no expiry, no client password.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl p-8"
        style={{ background: COLOR.charcoal }}
      >
        <div className="mb-1 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Company / brand name
          </label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Ada Obi Photography"
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
          <p className="mt-1 text-xs text-white/30">This becomes your link: useshowwork.com/p/your-name</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Banner headline <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="text"
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
            placeholder="e.g. Photography that remembers the moment, not just the frame."
            maxLength={80}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
        </div>

        <div className="my-1 h-px bg-white/5" />
        <p className="text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: "0.08em" }}>
          How clients reach you
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Contact email <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="hello@yourstudio.com"
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            WhatsApp number <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+2348012345678"
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
          <p className="mt-1 text-xs text-white/30">Clients tap a button and it opens WhatsApp with a message already started.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Call-to-action text <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="Let's create something worth remembering — reach out and let's deliver the best for your next project."
            maxLength={140}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
          <p className="mt-1 text-xs text-white/30">Leave blank to use the default shown above.</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
          style={{ background: COLOR.gold, color: COLOR.black }}
        >
          {loading ? "Creating..." : "Create my portfolio"}
        </button>
      </form>
    </div>
  );
}