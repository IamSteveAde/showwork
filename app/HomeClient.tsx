"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";
import FloatingStartButton from "@/components/FloatingStartButton";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

// Reduced to three real colors — offwhite, black, blue — plus a single
// yellow used ONLY for glows, thin outlines, and tiny one-off accents
// (a badge, a quote mark, a toggle chip). Nothing else gets color.
const COLOR = {
  black: "#080808",
  charcoal: "#151515",
  ink: "#101010",
  offWhite: "#F7F4EC",
  offWhiteCard: "#FFFDF8",
  blue: "#2478FF",
  blueDark: "#0052FF",
  blueLight: "#68B2FF",
  yellow: "#FFCC00",
  midGray: "#888786",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
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
function IconUpload({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
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
function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}
function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMusicNote({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 18V5.5l10-2v12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
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
    priceMonthly: 0,
    priceAnnual: 0,
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
    priceMonthly: 5900,
    priceAnnual: 67260,
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
    priceMonthly: 10500,
    priceAnnual: 119700,
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
    priceMonthly: 15000,
    priceAnnual: 171000,
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
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden px-4 pb-5 pt-4 sm:px-6 md:min-h-[94vh] md:px-10 lg:px-16"
      style={{ background: COLOR.black }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="h-full w-full object-cover opacity-75" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(8,8,8,.96) 0%, rgba(8,8,8,.68) 42%, rgba(8,8,8,.12) 100%), linear-gradient(0deg, rgba(8,8,8,.96), transparent 45%)" }} />
        {/* Single glow color across all slides — one calm blue wash instead
            of a different hue firing per slide. */}
        <div className="absolute -left-[12%] bottom-[-25%] h-[70vw] w-[70vw] rounded-full opacity-25 blur-[120px]" style={{ background: COLOR.blue }} />
        <div className="absolute right-[8%] top-[18%] h-40 w-40 rounded-full border border-white/15 md:h-64 md:w-64" />
      </div>

      <Navbar />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1500px] items-end pb-14 pt-32 sm:pb-16 sm:pt-40 md:min-h-[90vh] md:pb-24">
        <div className="max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-2 backdrop-blur-xl sm:mb-7">
                <span className="h-2 w-2 rounded-full" style={{ background: active === 1 ? COLOR.yellow : COLOR.blueLight }} />
                <p className="text-[10px] font-bold uppercase text-white/70 sm:text-xs" style={{ letterSpacing: "0.16em" }}>{slide.eyebrow}</p>
              </div>

              <h1 className="max-w-5xl text-[clamp(2.2rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white sm:leading-[0.9] sm:tracking-[-0.07em]">
                {slide.headline}
              </h1>

              <div className="mt-6 grid max-w-2xl gap-5 sm:mt-8 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-6">
                <p className="text-sm leading-relaxed text-white/62 sm:text-base md:text-lg">{slide.body}</p>
                <MagneticButton
                  href={slide.cta.href}
                  external={slide.cta.external}
                  className="inline-flex w-fit items-center gap-3 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-2xl sm:px-6 sm:py-4"
                  style={{ background: COLOR.blue }}
                >
                  {slide.cta.label}<IconArrowUpRight className="h-4 w-4" />
                </MagneticButton>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-5 sm:mt-12">
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`} className="group h-2 overflow-hidden rounded-full bg-white/20" style={{ width: i === active ? 48 : 10 }}>
                  <motion.span className="block h-full rounded-full" animate={{ width: i === active ? "100%" : "0%" }} style={{ background: COLOR.blueLight }} transition={{ duration: 0.4 }} />
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-white/35">0{active + 1} / 03</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeClient() {
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [showMotionFull, setShowMotionFull] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);
  const [motionAudioMode, setMotionAudioMode] = useState<"muted" | "once">("muted");
  const motionVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
  // Defaults to Annual, not Monthly — the real industry pattern isn't
  // just labeling annual as "recommended," it's making it the thing
  // someone has to actively opt out of, since most people never touch
  // a toggle that's already showing them the better deal.
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
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

  const startMotionWithSound = async () => {
    setShowAudioPrompt(false);
    setMotionAudioMode("once");

    const video = motionVideoRef.current;
    if (video) {
      video.loop = false;
      video.muted = false;
      video.currentTime = 0;
      try {
        await video.play();
      } catch {
        setMotionAudioMode("muted");
        video.muted = true;
        video.loop = true;
        video.play().catch(() => {});
      }
    }
  };

  const keepMotionMuted = () => {
    setShowAudioPrompt(false);
    setMotionAudioMode("muted");
    const video = motionVideoRef.current;
    if (video) {
      video.muted = true;
      video.loop = true;
      video.play().catch(() => {});
    }
  };

  const handleMotionEnded = () => {
    if (motionAudioMode === "once") {
      const video = motionVideoRef.current;
      setMotionAudioMode("muted");
      if (video) {
        video.muted = true;
        video.loop = true;
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }
  };

  return (
    <main className={`${jakarta.variable}`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <FloatingStartButton />
      <HeroSlider />

      <AnimatePresence>
        {showAudioPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-[#0B0B0B] p-6 shadow-2xl sm:p-10"
            >
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl" style={{ background: COLOR.blue, opacity: 0.4 }} />
              <div className="absolute -bottom-28 -left-20 h-56 w-56 rounded-full blur-3xl" style={{ background: COLOR.yellow, opacity: 0.16 }} />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-black" style={{ background: COLOR.yellow }}>
                    <IconMusicNote className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-white/40" style={{ letterSpacing: ".2em" }}>A better first impression</p>
                    <p className="mt-1 text-sm font-semibold text-white">Showwork is ready.</p>
                  </div>
                </div>

                <h2 className="mt-7 text-3xl font-bold leading-[1] tracking-[-0.04em] text-white sm:mt-9 sm:text-4xl sm:leading-[0.95] sm:tracking-[-0.055em] md:text-5xl">
                  Want to experience it <span style={{ color: COLOR.blueLight }}>with sound?</span>
                </h2>

                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55 sm:mt-5 sm:text-base">
                  We&apos;ll play the opening motion with audio once, then return to silent playback. You can always open the film later and watch the complete experience with sound.
                </p>

                <div className="mt-7 grid gap-3 sm:mt-9 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startMotionWithSound}
                    className="rounded-full px-5 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] sm:px-6 sm:py-4"
                    style={{ background: COLOR.blue }}
                  >
                    Yes, play with sound
                  </button>
                  <button
                    type="button"
                    onClick={keepMotionMuted}
                    className="rounded-full border border-white/15 px-5 py-3.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:px-6 sm:py-4"
                  >
                    No, keep it muted
                  </button>
                </div>

                <p className="mt-5 text-center text-[10px] font-semibold uppercase text-white/25" style={{ letterSpacing: ".15em" }}>
                  Your choice only affects this visit
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOTION — the new opening statement. A single thin blue-to-yellow
          hairline border is the one "signature" gradient moment on the
          whole page; everything else stays flat. */}
      <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-8 md:min-h-0 md:block md:px-10 md:py-12 lg:px-16" style={{ background: COLOR.black }}>
        <div className="relative mx-auto flex w-full max-w-[1500px] flex-col overflow-hidden rounded-[1.5rem] p-[1px] md:rounded-[3rem]" style={{ background: `linear-gradient(115deg, ${COLOR.blue} 0%, ${COLOR.blueDark} 55%, ${COLOR.yellow} 100%)` }}>
          <div className="relative flex flex-col overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0A0A0A] md:rounded-[calc(3rem-1px)]">
            <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 8% 12%, ${COLOR.blue}55, transparent 26%), radial-gradient(circle at 90% 80%, ${COLOR.yellow}33, transparent 28%)` }} />
            <div className="relative flex flex-col justify-center gap-6 p-6 sm:gap-8 sm:p-8 md:grid md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-8 md:p-12 lg:p-16">
              <div>
                <p className="text-xs font-bold uppercase" style={{ color: COLOR.yellow, letterSpacing: ".24em" }}>Showwork in motion</p>
                <h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] text-white sm:mt-5 sm:text-4xl sm:leading-[.95] sm:tracking-[-.06em] md:text-6xl xl:text-7xl">
                  Work this good deserves to be <span style={{ color: COLOR.blueLight }}>experienced.</span>
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55 sm:mt-6 sm:text-base md:text-lg">
                  The delivery is no longer the last step. It is part of the creative work.
                </p>
                <div className="mt-5 flex items-center gap-3 sm:mt-10">
                  <span className="h-3 w-3 animate-pulse rounded-full" style={{ background: COLOR.blue }} />
                  <span className="text-[10px] font-semibold uppercase text-white/45 sm:text-xs" style={{ letterSpacing: ".18em" }}>Press play on the experience</span>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: .96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: .8 }}
                className="relative"
              >
                <div className="absolute -inset-3 rounded-[1.5rem] opacity-30 blur-2xl sm:-inset-5 sm:rounded-[2rem]" style={{ background: `linear-gradient(135deg, ${COLOR.blue}, ${COLOR.yellow})` }} />
                <button
                  type="button"
                  onClick={() => setShowMotionFull(true)}
                  className="group relative block w-full overflow-hidden rounded-[1.25rem] border border-white/15 bg-black text-left shadow-2xl sm:rounded-[1.5rem]"
                  aria-label="Watch the complete Showwork motion film"
                >
                  <video
                    ref={motionVideoRef}
                    src="/images/motion.mp4"
                    autoPlay
                    muted={motionAudioMode !== "once"}
                    loop={motionAudioMode !== "once"}
                    playsInline
                    preload="auto"
                    onEnded={handleMotionEnded}
                    className="aspect-[4/5] w-full object-cover sm:aspect-video"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/10 to-transparent p-4 sm:p-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-white/45" style={{ letterSpacing: ".2em" }}>The complete experience</p>
                      <p className="mt-1 text-sm font-semibold text-white">Click to watch with sound.</p>
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-black transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11" style={{ background: COLOR.yellow }}>
                      <IconPlay className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE DOORS */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:gap-10">
            <div><p className="text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: ".24em" }}>Choose your starting point</p><h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] sm:mt-5 sm:text-5xl sm:leading-[.92] sm:tracking-[-.06em] md:text-7xl" style={{ color: COLOR.ink }}>There is more than one way to <span style={{ color: COLOR.blue }}>show up.</span></h2></div>
            <div className="grid gap-4">
              {ROUTES.map((route, i) => {
                const accent = i === 1 ? COLOR.yellow : COLOR.blue;
                const content = <motion.div whileHover={{ y: -5, scale: 1.005 }} className="group relative overflow-hidden rounded-[1.5rem] p-6 sm:rounded-[1.75rem] sm:p-7 md:p-9" style={{ background: i === 1 ? COLOR.ink : COLOR.offWhiteCard, border: `1px solid ${i === 1 ? "transparent" : "rgba(16,16,16,.1)"}` }}>
                  <div className="absolute right-0 top-0 text-[4rem] font-bold leading-none opacity-[.06] sm:text-[6rem] md:text-[8rem]" style={{ color: i === 1 ? "#fff" : COLOR.ink }}>{route.number}</div>
                  <div className="relative flex flex-col gap-5 sm:gap-7 md:flex-row md:items-start">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16" style={{ background: i === 1 ? "rgba(255,255,255,.08)" : COLOR.blue, color: i === 1 ? COLOR.yellow : "#fff", border: i === 1 ? `1px solid ${COLOR.yellow}55` : "none" }}><route.Icon className="h-7 w-7 sm:h-8 sm:w-8" /></div>
                    <div className="flex-1"><p className="text-xs font-bold uppercase" style={{ color: accent, letterSpacing: ".18em" }}>0{i + 1}</p><h3 className="mt-2 text-xl font-bold sm:text-2xl md:text-3xl" style={{ color: i === 1 ? "#fff" : COLOR.ink }}>{route.title}</h3><p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: i === 1 ? "rgba(255,255,255,.58)" : "rgba(16,16,16,.58)" }}>{route.body}</p><div className="mt-5 inline-flex items-center gap-2 text-sm font-bold sm:mt-6" style={{ color: accent }}>{route.cta} <IconArrowUpRight className="h-4 w-4" /></div></div>
                  </div>
                </motion.div>;
                return route.external ? <a key={route.number} href={route.href} target="_blank" rel="noopener noreferrer" className="block">{content}</a> : <Link key={route.number} href={route.href} className="block">{content}</Link>;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.black }}>
        <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full border-[70px] opacity-30" style={{ borderColor: `${COLOR.blue}33` }} />
        <div className="relative mx-auto max-w-[1500px]">
          <p className="text-xs font-bold uppercase text-white/45" style={{ letterSpacing: ".24em" }}>The uncomfortable truth</p>
          <h2 className="mt-4 max-w-5xl text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-white sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.065em] md:text-7xl xl:text-8xl">Great work still gets delivered like an afterthought.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] bg-white/10 sm:mt-16 sm:rounded-[2rem] md:grid-cols-3">
            {PAIN_POINTS.map((p, i) => <div key={p.title} className="min-h-[260px] p-7 sm:min-h-[320px] sm:p-8 md:p-10" style={{ background: i === 1 ? COLOR.blue : "rgba(255,255,255,.04)" }}><div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: i === 1 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.1)", color: "#fff" }}><p.Icon className="h-7 w-7" /></div><h3 className="mt-8 text-xl font-bold leading-tight sm:mt-10 sm:text-2xl text-white">{p.title}</h3><p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: "rgba(255,255,255,.6)" }}>{p.body}</p></div>)}
          </div>
          <p className="mt-8 max-w-3xl text-xl font-bold leading-tight text-white sm:mt-10 sm:text-2xl md:text-4xl">The way you present the work changes the way the work is perceived.</p>
        </div>
      </section>

      {/* PRODUCT DEMO */}
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.blueDark }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <div className="relative mx-auto max-w-[1500px]">
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end lg:gap-10">
            <div><p className="text-xs font-bold uppercase" style={{ color: COLOR.yellow, letterSpacing: ".24em" }}>The moment they open it</p><h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] text-white sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-7xl">Make the handover feel like the work was worth waiting for.</h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:mt-6 sm:text-lg">No generic folder. No awkward download page. Your work takes over the screen.</p><a href="https://useshowwork.com/demo-2" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-3 rounded-full border-2 px-5 py-3.5 text-sm font-bold text-white sm:mt-9 sm:px-6 sm:py-4" style={{ borderColor: "rgba(255,255,255,.4)" }}>View live demo <IconArrowUpRight className="h-4 w-4" /></a></div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-[1.4rem] border border-white/20 bg-black shadow-[30px_30px_0_rgba(0,0,0,.2)] sm:rounded-[1.8rem]"><div className="flex items-center gap-2 border-b border-white/10 px-5 py-4"><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/30" /><span className="h-2.5 w-2.5 rounded-full bg-white/40" /><span className="ml-4 text-[10px] text-white/30">useshowwork.com/fashion-fest</span></div><div onClick={() => setShowFullVideo(true)} className="relative cursor-pointer"><video key={heroVideoSrc} src={heroVideoSrc} autoPlay muted loop playsInline className="max-h-[75vh] w-full object-contain" /><div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-black" style={{ background: COLOR.yellow }}>WATCH FULL <IconArrowUpRight className="h-3.5 w-3.5" /></div></div></motion.div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: ".24em" }}>Every photo, presented properly</p><h2 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.02] tracking-[-0.03em] sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-7xl" style={{ color: COLOR.ink }}>A gallery should feel like entering the work.</h2></div><p className="max-w-sm text-sm leading-relaxed sm:text-base" style={{ color: "rgba(16,16,16,.6)" }}>Full quality. Approval and revision built in. Nothing lost in another message thread.</p></div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 md:grid-cols-6">
            {[21,42,63,84,105,126].map((seed, i) => <motion.div key={seed} whileHover={{ y: -10 }} className={`relative overflow-hidden rounded-[1.2rem] sm:rounded-[1.4rem] ${i === 0 || i === 5 ? "md:mt-12" : i === 2 ? "md:-mt-10" : ""}`}><img src={`https://picsum.photos/seed/${seed}/600/750`} alt="" className="aspect-[4/5] w-full object-cover" /><span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: i === 2 ? COLOR.yellow : COLOR.offWhiteCard, color: COLOR.black }}>{i === 2 ? "REVISION" : i % 2 === 0 ? "APPROVED" : "PREVIEW"}</span></motion.div>)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.offWhite }}>
        <div className="mx-auto max-w-[1500px]"><p className="text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: ".24em" }}>Ridiculously simple</p><h2 className="mt-4 max-w-4xl text-3xl font-bold leading-[1.02] tracking-[-0.03em] sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-7xl" style={{ color: COLOR.ink }}>Three steps. One better way to deliver.</h2>
          <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-5 md:grid-cols-3">{STEPS.map((step, i) => <motion.div key={step.number} whileHover={{ y: -8 }} className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] p-7 sm:min-h-[350px] sm:rounded-[2rem] sm:p-8 md:p-10 text-white" style={{ background: [COLOR.blue, COLOR.black, COLOR.blueDark][i] }}><span className="text-[3.5rem] font-bold leading-none opacity-15 sm:text-[6rem]">{step.number}</span><div className="absolute bottom-0 left-0 right-0 p-7 sm:p-8 md:p-10"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full sm:mb-8" style={{ background: i === 1 ? `1px solid ${COLOR.yellow}` : "rgba(255,255,255,.18)", border: i === 1 ? `1px solid ${COLOR.yellow}` : "none" }}><step.Icon className="h-7 w-7" style={{ color: i === 1 ? COLOR.yellow : "#fff" }} /></div><h3 className="text-xl font-bold sm:text-2xl">{step.title}</h3><p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: "rgba(255,255,255,.62)" }}>{step.body}</p></div></motion.div>)}</div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1500px]"><div className="flex items-end justify-between gap-8"><div><p className="text-xs font-bold uppercase" style={{ color: COLOR.blueLight, letterSpacing: ".24em" }}>Creators are already here</p><h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] text-white sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-7xl">The work speaks.<br/><span style={{ color: COLOR.blueLight }}>The experience agrees.</span></h2></div><div className="hidden h-20 w-20 rounded-full md:block" style={{ background: COLOR.blue }} /></div>
          <div className="mt-10 grid gap-4 sm:mt-16 md:grid-cols-3">{TESTIMONIALS.map((t,i) => <motion.div key={t.name} whileHover={{ rotate: i === 0 ? -1 : i === 2 ? 1 : 0, y: -6 }} className="rounded-[1.5rem] p-7 sm:rounded-[1.75rem] sm:p-8" style={{ background: i === 0 ? COLOR.blue : i === 1 ? COLOR.charcoal : COLOR.offWhite, color: i === 2 ? COLOR.ink : "#fff" }}><span className="text-4xl font-bold sm:text-5xl" style={{ color: COLOR.yellow }}>&ldquo;</span><p className="mt-6 text-lg font-semibold leading-relaxed sm:mt-8 sm:text-xl">{t.quote}</p><div className="mt-10 border-t pt-5 sm:mt-12" style={{ borderColor: i === 2 ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.12)" }}><p className="font-bold">{t.name}</p><p className="mt-1 text-sm opacity-50">{t.role}</p></div></motion.div>)}</div>
        </div>
      </section>

      {/* PRICING */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.offWhite }}>
        <div className="absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full" style={{ background: COLOR.blue, opacity: .08 }} />
        <div className="relative mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: ".24em" }}>Pricing</p><h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] text-black sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-7xl">Start free.<br/>Grow when you&apos;re ready.</h2></div><div className="relative inline-flex w-fit rounded-full bg-black p-1"><button onClick={() => setBillingCycle("MONTHLY")} className="relative z-10 rounded-full px-4 py-2.5 text-xs font-bold sm:px-5 sm:py-3 sm:text-sm" style={{ color: billingCycle === "MONTHLY" ? COLOR.black : "#fff" }}>Monthly</button><button onClick={() => setBillingCycle("ANNUAL")} className="relative z-10 rounded-full px-4 py-2.5 text-xs font-bold sm:px-5 sm:py-3 sm:text-sm" style={{ color: billingCycle === "ANNUAL" ? COLOR.black : "#fff" }}>Annual · Save 5%</button><motion.div className="absolute inset-y-1 rounded-full" style={{ background: COLOR.yellow, width: "50%" }} animate={{ left: billingCycle === "MONTHLY" ? 4 : "50%" }} /></div></div>
          <div className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-4">{PRICING_TIERS.map((tier,i) => <div key={tier.key} className="relative flex flex-col overflow-hidden rounded-[1.5rem] p-6 sm:rounded-[1.75rem] sm:p-7" style={{ background: i === 2 ? COLOR.black : COLOR.offWhiteCard, color: i === 2 ? "#fff" : COLOR.ink, border: i === 2 ? `2px solid ${COLOR.blue}` : "1px solid rgba(0,0,0,.08)" }}>{tier.highlight && <div className="absolute right-0 top-0 rounded-bl-2xl px-4 py-2 text-[10px] font-bold" style={{ background: COLOR.yellow, color: COLOR.black }}>{tier.highlight}</div>}<p className="text-xs font-bold uppercase" style={{ color: i === 2 ? COLOR.blueLight : COLOR.blue, letterSpacing: ".15em" }}>{tier.name}</p><h3 className="mt-4 text-3xl font-bold sm:mt-5 sm:text-4xl">{tier.key === "FREE" ? "₦0" : `₦${(billingCycle === "ANNUAL" ? Math.round(tier.priceAnnual/12) : tier.priceMonthly).toLocaleString()}`}<span className="text-sm font-normal opacity-50">/mo</span></h3><p className="mt-3 min-h-[40px] text-sm opacity-55 sm:min-h-[48px]">{tier.tagline}</p><ul className="mt-6 flex-1 space-y-3 text-sm sm:mt-7">{(expandedTiers[tier.key] ? tier.features : tier.features.slice(0,5)).map(f => <li key={f} className="flex gap-2"><span className="mt-0.5 flex-shrink-0" style={{ color: i === 2 ? COLOR.blueLight : COLOR.blue }}><IconCheck className="h-4 w-4" /></span><span className="opacity-75">{f}</span></li>)}</ul>{tier.features.length > 5 && <button onClick={() => toggleTierExpanded(tier.key)} className="mt-5 text-left text-xs font-bold underline opacity-60">{expandedTiers[tier.key] ? "Show less" : "View all features"}</button>}<Link href={tier.key === "FREE" ? tier.href : `${tier.href}&cycle=${billingCycle}`} className="mt-7 flex justify-center rounded-full px-5 py-3.5 text-sm font-bold sm:mt-8 sm:py-4" style={{ background: i === 0 ? COLOR.black : COLOR.blue, color: "#fff" }}>{tier.cta}</Link></div>)}</div>
        </div>
      </section>

      {/* CREATIVO */}
      <section className="relative overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-28 md:px-10 md:py-44 lg:px-16" style={{ background: `linear-gradient(135deg, ${COLOR.blue} 0%, ${COLOR.blueDark} 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(135deg, transparent 48%, rgba(255,255,255,.55) 49%, transparent 50%)", backgroundSize: "90px 90px" }} />
        <div className="relative mx-auto max-w-4xl"><div className="mb-8 flex items-center justify-center gap-5 sm:mb-12 sm:gap-8"><LogoMark src="/images/logo/sw.svg" size={56} color="#FFFFFF" /><span className="h-10 w-px bg-white/30 sm:h-14" /><LogoMark src="/images/logo/creativo.svg" size={56} color="#FFFFFF" /></div><p className="text-xs font-bold uppercase text-white/60" style={{ letterSpacing: ".24em" }}>Introducing Creativo</p><h2 className="mt-4 text-3xl font-bold leading-[1.02] tracking-[-0.03em] text-white sm:mt-5 sm:text-5xl sm:leading-[.9] sm:tracking-[-.06em] md:text-8xl">You don&apos;t have to build your creative career alone.</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:mt-7 sm:text-lg">Positioning, pricing, landing better clients and figuring out what comes next — alongside creators who are actually doing the work.</p><MagneticButton href={COMMUNITY_URL} external className="mt-8 inline-flex items-center gap-3 rounded-full bg-black px-6 py-4 text-sm font-bold text-white shadow-2xl sm:mt-10 sm:px-8 sm:py-5">Join Creativo, it&apos;s free <IconArrowUpRight className="h-4 w-4" /></MagneticButton></div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 py-12 sm:px-6 sm:py-14 md:px-10 lg:px-16" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-10 sm:gap-14 sm:pb-14 md:flex-row"><div><Wordmark size="md" /><p className="mt-4 max-w-sm text-base text-white/45 sm:mt-5 sm:text-lg">Positioned like the premium brand you already are.</p></div><div className="grid grid-cols-2 gap-8 text-sm sm:gap-10"><div><p className="mb-4 text-xs font-bold uppercase text-white/30" style={{ letterSpacing: ".16em" }}>Contact</p><a href="mailto:hello@useshowwork.com" className="text-white/70 hover:text-white">hello@useshowwork.com</a></div><div className="flex flex-col gap-3"><p className="mb-1 text-xs font-bold uppercase text-white/30" style={{ letterSpacing: ".16em" }}>Explore</p><Link href="/start" className="text-white/70 hover:text-white">Deliver a project</Link><Link href="/signup?next=/dashboard/portfolio" className="text-white/70 hover:text-white">Create portfolio</Link><a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">Join Creativo</a><Link href="/login" className="text-white/70 hover:text-white">Log in</Link></div></div></div><div className="flex flex-col justify-between gap-4 pt-6 text-xs text-white/25 sm:gap-5 sm:pt-7 md:flex-row"><span>© {new Date().getFullYear()} Showwork. All rights reserved.</span><span style={{ color: COLOR.yellow }}>PREMIUM WORK. PRESENTED PROPERLY.</span></div></div>
      </footer>

      {/* Complete Showwork motion film */}
      <AnimatePresence>
        {showMotionFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 px-4 py-6 backdrop-blur-xl"
            onClick={() => setShowMotionFull(false)}
          >
            <button
              onClick={() => setShowMotionFull(false)}
              aria-label="Close complete video"
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-xl transition-colors hover:bg-white/15"
            >
              <IconClose className="h-4 w-4" />
            </button>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-2xl"
            >
              <video
                src="/images/motion.mp4"
                controls
                autoPlay
                playsInline
                className="max-h-[82vh] w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <IconClose className="h-4 w-4" />
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