"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";
import FloatingStartButton from "@/components/FloatingStartButton";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

const COLOR = {
  black: "#0A0A0A",
  blueLight: "#4D9EFF",
  blue: "#2478FF",
  blueDark: "#0052FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  accent: "#FFCC00",
  offWhite: "#F5F1EA",
  offWhiteCard: "#FFFFFF",
  charcoal: "#1A1A1A",
  midGray: "#888786",
  ink: "#161513",
};

const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

// ─────────────────────────────────────────────
// Custom line icons — thin stroke, generous size, always paired with
// a soft blurred glow behind them rather than a flat circular badge.
// The glow is what actually makes these feel crafted instead of
// borrowed from an icon library — it gives each mark real depth.
// ─────────────────────────────────────────────
function IconFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPackage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4 7.5L12 12l8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function IconChat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12.5c0-4.7 3.8-8 8-8s8 3.3 8 8-3.8 8-8 8c-1.1 0-2.1-.2-3-.6L4 21l1.2-4.4A7.6 7.6 0 0 1 4 12.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function IconTag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v6.5c0 .4.15.78.44 1.06l9 9c.58.58 1.53.58 2.12 0l6.5-6.5c.58-.58.58-1.53 0-2.12l-9-9a1.5 1.5 0 0 0-1.06-.44Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M19 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
function IconWrench({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6a1.8 1.8 0 0 0 2.5 2.5l6-6a4 4 0 0 0 5-5.4l-2.6 2.6-2-2 2.5-2.7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 15.5V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="15" r="1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function IconSend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20.5 3.5L10 13.5M20.5 3.5L14 20.5l-4-7-7-4 17.5-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

// The icon treatment used everywhere on the page — a soft blurred
// glow sitting behind a crisp, generously-sized line icon. This one
// detail is what separates "icon library" from "designed" — a flat
// circle badge has no depth; a diffused glow does.
function IconGlow({
  children,
  glowColor = COLOR.blue,
  float = true,
}: {
  children: React.ReactNode;
  glowColor?: string;
  float?: boolean;
}) {
  return (
    <motion.div
      className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center md:h-16 md:w-16"
      animate={float ? { y: [0, -6, 0] } : undefined}
      transition={float ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: glowColor, opacity: 0.22, filter: "blur(16px)" }}
        aria-hidden
      />
      <div className="relative h-8 w-8 md:h-9 md:w-9" style={{ color: glowColor }}>
        {children}
      </div>
    </motion.div>
  );
}

// A subtle magnetic pull toward the cursor within a small radius — the
// button visibly "wants" to follow your mouse, then springs back on
// leave. A small, tactile detail that reads as considered rather than
// a plain hover-scale.
function MagneticButton({
  children,
  className,
  style,
  href,
  external,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href: string;
  external?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    setOffset({ x: relX * 0.25, y: relY * 0.35 });
  };

  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <motion.a
      ref={ref}
      href={href}
      {...props}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
      className={className}
      style={style}
    >
      {children}
    </motion.a>
  );
}

const SLIDES = [
  {
    image: "/images/hero1.png",
    eyebrow: "For creators ready to charge what they're worth",
    headline: "Position yourself like the premium brand you already are.",
    body: "How your work is delivered is part of what a client is paying for. Get that right, and charging more stops feeling like a negotiation.",
    cta: { label: "Deliver a project", href: "/start", external: false },
  },
  {
    image: "/images/hero2.png",
    eyebrow: "First impressions, done right",
    headline: "Premium clients pay for a premium experience.",
    body: "A scattered portfolio and a WeTransfer link undersell you before you've said a word. Showwork is built to say premium before you do.",
    cta: { label: "Create your portfolio", href: "/signup?next=/dashboard/portfolio", external: false },
  },
  {
    image: "/images/hero3.png",
    eyebrow: "You're not figuring this out alone",
    headline: "Built for creators who charge what they're worth.",
    body: "Positioning, pricing, landing better clients — join a community of creators doing exactly that.",
    cta: { label: "Join our community", href: COMMUNITY_URL, external: true },
  },
];

const ROUTES = [
  {
    number: "01",
    Icon: IconFrame,
    title: "Create your portfolio",
    body: "This is a client's first impression of you — before a single message is sent. A real portfolio, not a scattered feed, says premium before you have to argue for it.",
    cta: "Create your portfolio — free",
    href: "/signup?next=/dashboard/portfolio",
    external: false,
  },
  {
    number: "02",
    Icon: IconPackage,
    title: "Deliver a project the right way",
    body: "How you hand off finished work is part of what you're charging for. A branded, password-protected delivery makes the number you're asking for feel obvious, not something you have to defend.",
    cta: "Deliver a project",
    href: "/start",
    external: false,
  },
  {
    number: "03",
    Icon: IconChat,
    title: "Join Creativo",
    body: "Positioning, pricing, and landing premium clients — worked out alongside creators actually doing it, not figured out alone at 1am.",
    cta: "Join the community",
    href: COMMUNITY_URL,
    external: true,
  },
];

const PAIN_POINTS = [
  {
    Icon: IconTag,
    title: "You're pricing like the delivery, not the work",
    body: "A WeTransfer link tells a client this is casual. They'll negotiate accordingly — not because the work isn't premium, but because nothing around it says so.",
  },
  {
    Icon: IconSparkle,
    title: "Premium clients expect a premium moment",
    body: "The clients who pay well are used to being treated well. An ordinary handover makes an extraordinary price feel like a stretch, even when the work justifies it.",
  },
  {
    Icon: IconWrench,
    title: "You became the tech support too",
    body: "You shot it, you edited it — and now you're troubleshooting a broken download link, for the same fee you'd have charged either way.",
  },
];

const STEPS = [
  {
    number: "01",
    Icon: IconUpload,
    title: "Upload the work",
    body: "Add the photos and films for this delivery. Stored full quality, delivered the same way.",
  },
  {
    number: "02",
    Icon: IconLock,
    title: "Set the access code",
    body: "One password per project. Only the client you share it with gets in.",
  },
  {
    number: "03",
    Icon: IconSend,
    title: "Send the link",
    body: "They open it, enter the code, and see the work — and the price — the way you meant them to.",
  },
];

const TESTIMONIALS = [
  {
    quote: "My client thought I'd hired an agency to build a microsite. It was just this link.",
    name: "Tolu A.",
    role: "Videographer",
  },
  {
    quote: "Took five minutes to set up. The client paid the invoice within the hour.",
    name: "Ada O.",
    role: "Photographer",
  },
  {
    quote: "Finally something that looks as good as the work I actually deliver.",
    name: "Chidi E.",
    role: "Content Studio",
  },
];

const PRICING_TIERS = [
  {
    key: "FREE",
    name: "Free",
    price: "₦0",
    priceSuffix: "",
    tagline: "The whole experience, on us.",
    highlight: null,
    features: [
      "1 project a month",
      "Free access to Creativo, our creator community",
      "Your own free portfolio — always on, one link",
      "Password-protected client delivery",
      "Up to 5GB per file — full photo & video quality",
      "No cap on total project size — upload as much as the delivery needs",
      "Custom hero banner with your own tagline",
      "Client email capture before viewing",
      "Client approve / revision flow, with notes",
      "Individual file downloads for your client",
      "Dashboard views & delivery analytics",
      "Shows the Showwork badge",
    ],
    cta: "Start free",
    href: "/start",
    style: "outline" as const,
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "₦5,900",
    priceSuffix: "/mo",
    tagline: "For the creator picking up steady, regular clients.",
    highlight: null,
    features: [
      "Up to 5 projects a month",
      "Free access to Creativo, our creator community",
      "Your own free portfolio — always on, one link",
      "Password-protected client delivery",
      "Up to 5GB per file — full photo & video quality",
      "No cap on total project size — upload as much as the delivery needs",
      "Custom hero banner with your own tagline",
      "Client email capture before viewing",
      "Client approve / revision flow, with notes",
      "Individual + \"download all\" (zip) for clients",
      "Dashboard views & delivery analytics",
      "No Showwork badge",
    ],
    cta: "Choose Starter",
    href: "/dashboard/billing?tier=STARTER",
    style: "solid" as const,
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "₦10,500",
    priceSuffix: "/mo",
    tagline: "For studios booking multiple shoots a week.",
    highlight: "MOST POPULAR",
    features: [
      "Up to 20 projects a month",
      "Free access to Creativo, our creator community",
      "Your own free portfolio — always on, one link",
      "Password-protected client delivery",
      "Up to 5GB per file — full photo & video quality",
      "No cap on total project size — upload as much as the delivery needs",
      "Custom hero banner with your own tagline",
      "Client email capture before viewing",
      "Client approve / revision flow, with notes",
      "Individual + \"download all\" (zip) for clients",
      "Dashboard views & delivery analytics",
      "No Showwork badge",
      "Priority support",
    ],
    cta: "Choose Growth",
    href: "/dashboard/billing?tier=GROWTH",
    style: "solid" as const,
  },
  {
    key: "UNLIMITED",
    name: "Unlimited",
    price: "₦15,000",
    priceSuffix: "/mo",
    tagline: "For teams who stopped counting projects a while ago.",
    highlight: null,
    features: [
      "Unlimited projects",
      "Free access to Creativo, our creator community",
      "Your own free portfolio — always on, one link",
      "Password-protected client delivery",
      "Up to 5GB per file — full photo & video quality",
      "No cap on total project size — upload as much as the delivery needs",
      "Custom hero banner with your own tagline",
      "Client email capture before viewing",
      "Client approve / revision flow, with notes",
      "Individual + \"download all\" (zip) for clients",
      "Dashboard views & delivery analytics",
      "No Showwork badge",
      "Highest priority support",
    ],
    cta: "Go Unlimited",
    href: "/dashboard/billing?tier=UNLIMITED",
    style: "solid" as const,
  },
];

// Wordmark, sized up meaningfully across the board — this is the
// brand's actual identity mark, and it was reading too small and
// quiet before to carry the page.
function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights = { sm: 26, md: 40, lg: 52 };
  return (
    <div
      role="img"
      aria-label="Showwork"
      style={{
        height: heights[size],
        width: heights[size] * 2, // placeholder aspect ratio — adjust
        // to match the real logo's actual proportions once visible.
        backgroundColor: COLOR.blue,
        WebkitMaskImage: "url(/images/logo/sw.svg)",
        maskImage: "url(/images/logo/sw.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

// A plain masked logo mark — used in the Creativo lockup where both
// marks need to sit side by side at a comparable visual weight,
// rather than the wordmark's specific left-aligned proportions.
function LogoMark({ src, size = 28, color = "#FFFFFF" }: { src: string; size?: number; color?: string }) {
  return (
    <div
      role="img"
      style={{
        height: size,
        width: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section
      className="relative h-[94vh] min-h-[680px] w-full overflow-hidden"
      style={{ background: COLOR.black }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt="" className="h-full w-full object-cover" style={{ opacity: 0.55 }} />
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.25) 45%, rgba(10,10,10,0.97) 100%)",
        }}
      />

      {/* Subtle film grain — the difference between "dark photo" and
          "cinematic" is texture. Almost imperceptible consciously, but
          it's what makes the hero feel shot on film rather than a
          flat digital background. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div className="relative z-10 flex items-center justify-between px-6 py-8 md:px-20">
        <Wordmark size="lg" />
        <Link href="/signup" className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
          Sign up
        </Link>
        <Link href="/login" className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
          Log in
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-16 md:px-20 md:pb-24">
        <div className="mx-auto max-w-[1280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <p className="mb-5 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.15em" }}>
                {slide.eyebrow}
              </p>
              <h1 className="max-w-2xl text-[2.1rem] font-bold leading-[1.14] tracking-tight text-white md:text-[3.4rem]">
                {slide.headline}
              </h1>
              <p className="mt-5 max-w-lg text-base font-normal leading-relaxed text-white/60 md:text-lg">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <MagneticButton
                  href={slide.cta.href}
                  external={slide.cta.external}
                  className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(36,120,255,0.35)]"
                  style={{ background: COLOR.gradient }}
                >
                  {slide.cta.label}
                  <span aria-hidden>→</span>
                </MagneticButton>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === active ? 24 : 8, background: i === active ? COLOR.blue : "rgba(255,255,255,0.25)" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeClient() {
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
  const toggleTierExpanded = (key: string) =>
    setExpandedTiers((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const heroVideoSrc = isMobile ? "/images/shm.mov" : "/images/sh.mp4";

  return (
    <main className={`${jakarta.variable}`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <FloatingStartButton />
      <HeroSlider />

      {/* ── ROUTING — editorial rows, but each one anchored by a real
           icon with a soft glow, not a bare numeral. The number
           becomes a quiet supporting label instead of the main mark. ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1080px]">
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.3em" }}>
            Where to start
          </p>
          <h2 className="mb-20 max-w-xl text-3xl font-light leading-tight md:text-5xl" style={{ color: COLOR.ink }}>
            Three ways to start looking like the premium brand you are.
          </h2>

          <div>
            {ROUTES.map((route, i) => {
              const row = (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="group grid cursor-pointer grid-cols-1 items-center gap-5 py-10 md:grid-cols-[64px_60px_1fr_auto] md:gap-8"
                  style={{ borderTop: i === 0 ? "1px solid rgba(22,21,19,0.1)" : undefined, borderBottom: "1px solid rgba(22,21,19,0.1)" }}
                >
                  <IconGlow glowColor={COLOR.blue}>
                    <route.Icon className="h-full w-full" />
                  </IconGlow>
                  <span className="hidden text-sm font-light md:block" style={{ color: "rgba(22,21,19,0.25)" }}>{route.number}</span>
                  <div>
                    <h3 className="text-xl font-semibold transition-colors duration-300 md:text-2xl" style={{ color: COLOR.ink }}>{route.title}</h3>
                    <p className="mt-2 max-w-xl text-base leading-relaxed" style={{ color: "rgba(22,21,19,0.6)" }}>{route.body}</p>
                  </div>
                  <span
                    className="flex items-center gap-2 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1 md:justify-self-end"
                    style={{ color: COLOR.blue }}
                  >
                    {route.cta}
                    <span aria-hidden>→</span>
                  </span>
                </motion.div>
              );
              return route.external ? (
                <a key={route.number} href={route.href} target="_blank" rel="noopener noreferrer" className="block">
                  {row}
                </a>
              ) : (
                <Link key={route.number} href={route.href} className="block">
                  {row}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PAIN POINT — same icon-glow language, stacked editorial,
           no card boxes ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1080px]">
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.3em" }}>
            The part nobody talks about
          </p>
          <h2 className="mb-20 max-w-xl text-3xl font-light leading-tight text-white md:text-5xl">
            Great work still gets charged like average work.
          </h2>

          <div>
            {PAIN_POINTS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="grid grid-cols-1 items-center gap-5 py-10 md:grid-cols-[64px_1fr_1.3fr] md:gap-10"
                style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : undefined, borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <IconGlow glowColor={COLOR.accent}>
                  <p.Icon className="h-full w-full" />
                </IconGlow>
                <h3 className="text-xl font-semibold text-white md:text-2xl">{p.title}</h3>
                <p className="text-base leading-relaxed text-white/55">{p.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 max-w-2xl text-2xl font-light leading-snug md:text-3xl"
            style={{ color: COLOR.accent }}
          >
            Showwork is how premium work finally gets priced like premium work — and stays positioned that way with every project after.
          </motion.p>
        </div>
      </section>

      {/* ── VIDEO — the moment they actually open it ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.3em" }}>
            The moment they open it
          </p>
          <h2 className="mb-6 max-w-xl text-3xl font-light leading-tight text-white md:text-5xl">
            This is what a premium price looks like, before they&apos;ve even asked.
          </h2>
          <p className="mb-12 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
            No loading spinner, no folder icon. The film you delivered, playing,
            the second the page opens.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
            style={{ border: "1px solid rgba(36,120,255,0.15)" }}
          >
            {/* browser chrome */}
            <div className="flex items-center gap-1.5 bg-black px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="ml-3 text-[11px] text-white/25">useshowwork.com/fashion-fest</span>
            </div>

            <div
              onClick={() => setShowFullVideo(true)}
              className="group relative flex w-full cursor-pointer items-center justify-center bg-black"
            >
              {/* Real screen recording — desktop and mobile use different
                  files since a mobile screen recording is usually shot
                  vertically, and a desktop one horizontally. */}
              <video
                key={heroVideoSrc}
                src={heroVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="max-h-[75vh] w-full object-contain"
              />
              <div
                className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-black/10"
              />

              <div className="absolute left-5 top-5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.blue }} />
                <span className="text-[10px] font-semibold uppercase text-white/60" style={{ letterSpacing: "0.15em" }}>
                  Private preview
                </span>
              </div>

              {/* Subtle, always-visible click indicator — not hover-only,
                  since hover doesn't exist on mobile touch devices at all. */}
              <div
                className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 group-hover:scale-105"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
              >
                <div
                  className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
                  style={{ borderLeftColor: COLOR.blue }}
                />
                <span className="text-[10px] font-medium text-white/80">Click to watch</span>
              </div>
            </div>
          </motion.div>

          {/* copy moved below the video — the overlay text was competing
              with the footage itself */}
          <div className="mx-auto mt-6 max-w-4xl text-center">
            <p className="text-xl font-bold text-white md:text-2xl">Three months of work.</p>
            <p className="text-xl font-bold md:text-2xl" style={{ color: COLOR.accent }}>Priced like it.</p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <a
                href="https://useshowwork.com/demo-2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: COLOR.gradient }}
              >
                View the live demo
                <span aria-hidden>→</span>
              </a>
              <p className="text-xs text-white/40">
                Passcode: <span className="rounded px-2 py-0.5 font-mono font-semibold text-white/70" style={{ background: "rgba(255,255,255,0.08)" }}>demo</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMAGE — real photography, the actual gallery treatment ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1280px]">
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.3em" }}>
            Every photo, presented properly
          </p>
          <h2 className="mb-6 max-w-xl text-3xl font-light leading-tight md:text-5xl" style={{ color: COLOR.ink }}>
            A gallery, not a grid of thumbnails.
          </h2>
          <p className="mb-12 max-w-lg text-base leading-relaxed md:text-lg" style={{ color: "rgba(22,21,19,0.55)" }}>
            Full quality, properly laid out — and your client can approve or
            flag each one right there, with a note, so nothing gets lost in a
            comment thread.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
          >
            {[
              { seed: 21, status: "approved" as const },
              { seed: 42, status: "none" as const },
              { seed: 63, status: "revision" as const },
              { seed: 84, status: "approved" as const },
              { seed: 105, status: "none" as const },
              { seed: 126, status: "approved" as const },
            ].map((tile, i) => (
              <motion.div
                key={tile.seed}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="relative aspect-[4/5] overflow-hidden rounded-xl shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${tile.seed}/600/750`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {tile.status === "approved" && (
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "#22C55E", color: "#080808" }}
                  >
                    ✓ Approved
                  </span>
                )}
                {tile.status === "revision" && (
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "#F97316", color: "#080808" }}
                  >
                    ✎ Revision
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
          <p className="mt-6 text-center text-xs" style={{ color: "rgba(22,21,19,0.3)" }}>
            Placeholder photography — shown here purely to demonstrate the gallery and approval treatment.
          </p>
        </div>
      </section>

      {/* ── THREE STEPS — same icon-glow editorial pattern ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1080px]">
          <h2 className="mb-20 max-w-lg text-3xl font-light leading-tight md:text-5xl" style={{ color: COLOR.ink }}>
            How you start looking like a premium brand.
          </h2>

          <div>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="grid grid-cols-1 items-center gap-5 py-10 md:grid-cols-[64px_60px_1fr] md:gap-8"
                style={{ borderTop: i === 0 ? "1px solid rgba(22,21,19,0.1)" : undefined, borderBottom: "1px solid rgba(22,21,19,0.1)" }}
              >
                <IconGlow glowColor={COLOR.blue}>
                  <step.Icon className="h-full w-full" />
                </IconGlow>
                <span className="hidden text-sm font-light md:block" style={{ color: "rgba(22,21,19,0.25)" }}>{step.number}</span>
                <div>
                  <h3 className="text-xl font-semibold md:text-2xl" style={{ color: COLOR.ink }}>{step.title}</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed" style={{ color: "rgba(22,21,19,0.55)" }}>{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — large open pull-quotes, no card boxes ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-20 max-w-lg text-3xl font-light leading-tight text-white md:text-5xl">
            Creators are already charging like this.
          </h2>

          <div>
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="py-10 md:grid md:grid-cols-[1fr_220px] md:items-start md:gap-12"
                style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : undefined, borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p className="max-w-xl text-xl font-light leading-relaxed text-white/85 md:text-2xl">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 md:mt-0 md:text-right">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs font-normal" style={{ color: COLOR.midGray }}>{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING — the one place a real card grid still earns its
           keep, since comparing tiers genuinely benefits from a
           side-by-side structure. Kept visually quieter than before:
           thinner borders, more air, no unnecessary chrome. ── */}
      <section className="px-6 py-24 md:px-20 md:py-32" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.3em" }}>
            Pricing
          </p>
          <h2 className="max-w-2xl text-3xl font-light leading-tight text-white md:text-5xl">
            Your first delivery is free.
            <br />
            Everything after scales with your studio.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
            No contracts, no hidden fees, cancel anytime. Whether you deliver
            once a month or every week, there's a plan built for exactly that.
          </p>

          <div className="mt-16 grid gap-8 lg:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.key}
                className="relative flex flex-col rounded-2xl border p-8"
                style={{
                  borderColor: tier.highlight ? COLOR.accent : "rgba(255,255,255,.08)",
                  background: COLOR.charcoal,
                  boxShadow: tier.highlight ? "0 20px 60px rgba(255,204,0,.18)" : undefined,
                }}
              >
                {tier.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold"
                    style={{ background: COLOR.accent, color: COLOR.black }}
                  >
                    {tier.highlight}
                  </div>
                )}

                <p
                  className="text-sm font-semibold"
                  style={{ color: tier.key === "FREE" ? "rgba(255,255,255,0.5)" : tier.highlight ? COLOR.accent : COLOR.blue }}
                >
                  {tier.name}
                </p>
                <h3 className="mt-3 text-4xl font-bold text-white">
                  {tier.price}
                  {tier.priceSuffix && <span className="text-sm font-normal text-white/40">{tier.priceSuffix}</span>}
                </h3>
                <p className="mt-2 text-sm text-white/50">{tier.tagline}</p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/70">
                  {(expandedTiers[tier.key] ? tier.features : tier.features.slice(0, 4)).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: COLOR.blue }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.features.length > 4 && (
                  <button
                    type="button"
                    onClick={() => toggleTierExpanded(tier.key)}
                    className="mt-3 text-left text-xs font-semibold underline"
                    style={{ color: COLOR.blue }}
                  >
                    {expandedTiers[tier.key] ? "Show less" : `View all ${tier.features.length} features`}
                  </button>
                )}

                <Link
                  href={tier.href}
                  className={
                    tier.style === "outline"
                      ? "mt-10 flex justify-center rounded-lg border py-3 font-semibold text-white transition hover:bg-white hover:text-black"
                      : "mt-10 flex justify-center rounded-lg py-3 font-semibold"
                  }
                  style={
                    tier.style === "outline"
                      ? { borderColor: "rgba(255,255,255,.15)" }
                      : tier.highlight
                      ? { background: COLOR.accent, color: COLOR.black }
                      : { background: COLOR.gradient, color: "#FFFFFF" }
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-white/40">
            All plans include secure hosting, password protection, and full-quality delivery. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── CREATIVO — a quiet, editorial introduction with real
           atmosphere: two soft floating color orbs behind the lockup
           instead of a single flat glow, both logos large and
           confident, one honest thought, one door in. ── */}
      <section className="relative overflow-hidden px-6 py-32 text-center md:px-20 md:py-48" style={{ background: COLOR.black }}>
        <motion.div
          className="pointer-events-none absolute left-[15%] top-[20%] h-72 w-72 rounded-full"
          style={{ background: COLOR.blue, opacity: 0.16, filter: "blur(90px)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute right-[15%] bottom-[15%] h-64 w-64 rounded-full"
          style={{ background: COLOR.accent, opacity: 0.1, filter: "blur(90px)" }}
          animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        {/* the same quiet film-grain texture as the hero — keeps this
            moment feeling shot, not designed */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04] mix-blend-overlay" aria-hidden>
          <filter id="grain-creativo">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-creativo)" />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-xl"
        >
          <div className="mb-14 flex items-center justify-center gap-8">
            <LogoMark src="/images/logo/sw.svg" size={100} />
            <div className="h-14 w-px" style={{ background: "rgba(255,255,255,0.15)" }} aria-hidden />
            <LogoMark src="/images/logo/creativo.svg" size={100} />
          </div>

          <p className="mb-5 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.3em" }}>
            Introducing Creativo
          </p>
          <h2 className="mb-6 text-3xl font-light leading-snug tracking-tight text-white md:text-5xl">
            You don&apos;t have to figure this out alone.
          </h2>
          <p className="mx-auto max-w-md text-base leading-relaxed text-white/55 md:text-lg">
            Creativo is a free community for creators — not just Showwork users.
            Positioning, pricing, landing better clients, and the parts of this
            job nobody else teaches you, worked out alongside people actually
            doing it.
          </p>

          <div className="mt-10">
            <MagneticButton
              href={COMMUNITY_URL}
              external
              className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(36,120,255,0.3)]"
              style={{ background: COLOR.gradient }}
            >
              Join Creativo, it&apos;s free
              <span aria-hidden>→</span>
            </MagneticButton>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-16 md:px-20" style={{ background: COLOR.black, borderTop: "1px solid rgba(248,247,244,0.08)" }}>
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-10 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div>
            <Wordmark size="md" />
            <p className="mt-4 max-w-xs text-sm font-normal leading-relaxed" style={{ color: COLOR.midGray }}>
              Positioned like the premium brand you are.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
              Contact
            </p>
            <a href="mailto:hello@useshowwork.com" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              hello@useshowwork.com
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
              Product
            </p>
            <Link href="/start" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Deliver a project
            </Link>
            <Link href="/signup?next=/dashboard/portfolio" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Create your portfolio
            </Link>
            <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Join Creativo
            </a>
            <Link href="/login" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Log in
            </Link>
          </div>
        </div>

        <p className="mt-14 text-center text-xs font-normal" style={{ color: "rgba(248,247,244,0.2)" }}>
          © {new Date().getFullYear()} Showwork. All rights reserved.
        </p>
      </footer>

      {/* full-video modal, opened by clicking the "moment they open it" video */}
      <AnimatePresence>
        {showFullVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 py-8"
            onClick={() => setShowFullVideo(false)}
          >
            <button
              onClick={() => setShowFullVideo(false)}
              aria-label="Close"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
            >
              ✕
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-[92vw] overflow-hidden rounded-2xl bg-black"
            >
              <video
                key={heroVideoSrc}
                src={heroVideoSrc}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[85vh] max-w-[92vw] object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}