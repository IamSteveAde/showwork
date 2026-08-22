import Link from "next/link";

const COLOR = { blue: "#2478FF", blueDark: "#0052FF", lime: "#B8FF35", orange: "#FF8A1F", ink: "#101010" };

const VARIANTS = {
  deliver: {
    eyebrow: "Try it on your next project",
    headline: "Deliver like the premium brand you already are.",
    body: "A branded, password-protected handover — not another WeTransfer link. Your first delivery is free.",
    cta: "Deliver your first project",
    href: "/start",
    background: `linear-gradient(135deg, ${COLOR.blue} 0%, ${COLOR.blueDark} 100%)`,
    accent: COLOR.lime,
  },
  portfolio: {
    eyebrow: "Your work deserves a real home",
    headline: "Create a portfolio for your brand.",
    body: "A real, always-on portfolio — not a scattered feed. Free to start, live in minutes.",
    cta: "Create your portfolio",
    href: "/signup?next=/dashboard/portfolio",
    background: `linear-gradient(135deg, #101010 0%, #1A1A1A 100%)`,
    accent: COLOR.orange,
  },
};

export default function BlogPromoCTA({ variant }: { variant: "deliver" | "portfolio" }) {
  const v = VARIANTS[variant];
  return (
    <div
      className="not-prose my-12 overflow-hidden rounded-3xl p-8 text-center md:p-12"
      style={{ background: v.background }}
    >
      <p className="text-xs font-bold uppercase" style={{ color: v.accent, letterSpacing: "0.22em" }}>
        {v.eyebrow}
      </p>
      <h3 className="mx-auto mt-4 max-w-lg text-2xl font-bold leading-tight text-white md:text-3xl">
        {v.headline}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60 md:text-base">
        {v.body}
      </p>
      <Link
        href={v.href}
        className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.03]"
        style={{ background: v.accent }}
      >
        {v.cta}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}