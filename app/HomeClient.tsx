"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import FloatingStartButton from "@/components/FloatingStartButton";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

// ─────────────────────────────────────────────
// TOKENS — a deliberately small system. Black, one paper white (cool,
// not cream), ink for body copy, and a single deep blue used as the
// one accent in the whole page. No gradients, no second accent color
// (the hero headline gradient is the one deliberate exception).
// ─────────────────────────────────────────────
const COLOR = {
  black: "#0A0A0B",
  ink: "#121214",
  white: "#FFFFFF",
  paper: "#F4F5F7",
  paperCard: "#FBFBFC",
  line: "rgba(18,18,20,0.12)",
  lineOnDark: "rgba(255,255,255,0.14)",
  muted: "rgba(18,18,20,0.56)",
  mutedOnDark: "rgba(255,255,255,0.56)",
  blue: "#1D3ED8",
  blueDeep: "#15309E",
};

const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

// ─────────────────────────────────────────────
// Icons — thin single-weight line icons, no drop-shadow, no glow.
// Sit inside a plain hairline circle. Consistency here reads as
// intentional; the previous blurred-glow treatment read as decoration.
// ─────────────────────────────────────────────
function IconFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8.5" cy="9.5" r="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPackage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 7.5L12 12l8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconChat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12.5c0-4.7 3.8-8 8-8s8 3.3 8 8-3.8 8-8 8c-1.1 0-2.1-.2-3-.6L4 21l1.2-4.4A7.6 7.6 0 0 1 4 12.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconTag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v6.5c0 .4.15.78.44 1.06l9 9c.58.58 1.53.58 2.12 0l6.5-6.5c.58-.58.58-1.53 0-2.12l-9-9a1.5 1.5 0 0 0-1.06-.44Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconWrench({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6a1.8 1.8 0 0 0 2.5 2.5l6-6a4 4 0 0 0 5-5.4l-2.6 2.6-2-2 2.5-2.7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 15.5V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="15" r="1.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function IconSend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20.5 3.5L10 13.5M20.5 3.5L14 20.5l-4-7-7-4 17.5-6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A quiet hairline-circle icon frame. No blur, no float. Used exactly
// the same way everywhere it appears, so it reads as a system rather
// than a one-off flourish.
function IconRing({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark" | "accent";
}) {
  const styles = {
    light: { border: `1px solid ${COLOR.line}`, color: COLOR.ink },
    dark: { border: `1px solid ${COLOR.lineOnDark}`, color: COLOR.white },
    accent: { border: `1px solid ${COLOR.blue}`, color: COLOR.blue },
  }[tone];
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14"
      style={styles}
    >
      <div className="h-5 w-5 sm:h-6 sm:w-6">{children}</div>
    </div>
  );
}

// A quiet eyebrow label: small italic serif word mark + a short hairline.
// Replaces the uppercase-letterspaced-pill eyebrow used everywhere
// before — one recognizable device instead of a badge-shaped default.
function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  const color = tone === "dark" ? COLOR.mutedOnDark : COLOR.muted;
  const line = tone === "dark" ? COLOR.lineOnDark : COLOR.line;
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8" style={{ background: line }} />
      <p className="font-[var(--font-fraunces)] text-sm italic" style={{ color }}>
        {children}
      </p>
    </div>
  );
}

function ArrowLink({
  href,
  external,
  children,
  tone = "light",
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
  tone?: "light" | "dark" | "accent";
}) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const color = tone === "dark" ? COLOR.white : tone === "accent" ? COLOR.blue : COLOR.ink;
  return (
    <motion.a
      href={href}
      {...props}
      whileHover={{ gap: "14px" }}
      className="inline-flex items-center gap-2 text-sm font-semibold"
      style={{ color }}
    >
      {children}
      <IconArrow className="h-4 w-4" />
    </motion.a>
  );
}

function SolidButton({
  href,
  external,
  children,
  tone = "dark",
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
  tone?: "dark" | "light" | "blue";
}) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const styles = {
    dark: { background: COLOR.black, color: COLOR.white },
    light: { background: COLOR.white, color: COLOR.black },
    blue: { background: COLOR.blue, color: COLOR.white },
  }[tone];
  return (
    <motion.a
      href={href}
      {...props}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold"
      style={styles}
    >
      {children}
      <IconArrow className="h-4 w-4" />
    </motion.a>
  );
}

const SLIDES = [
  {
    image: "/images/del.png",
    eyebrow: "Client delivery, done properly",
    headline: "The way premium work should arrive.",
    body: "A branded, password-protected delivery for your photography and film — so the client feels the value before a single file downloads.",
    cta: { label: "Deliver a project", href: "/start", external: false },
  },
  {
    image: "/images/ports.png",
    eyebrow: "Your work, in one place",
    headline: "A portfolio built to be taken seriously.",
    body: "One considered link that shows a client exactly what you do — and why it costs what it does. Free, always.",
    cta: { label: "Create your portfolio", href: "/signup?next=/dashboard/portfolio", external: false },
  },
  {
    image: "/images/coms.png",
    eyebrow: "You're not building this alone",
    headline: "For creators who charge what they're worth.",
    body: "Positioning, pricing, and better clients — worked out alongside people doing the same work you are.",
    cta: { label: "Join Creativo", href: COMMUNITY_URL, external: true },
  },
];

const ROUTES = [
  {
    number: "01",
    Icon: IconPackage,
    title: "Deliver a project",
    body: "How you hand a client their finished work is part of what you're charging for. A considered, password-protected delivery makes the price feel settled, not something to negotiate.",
    cta: "Start free",
    href: "/start",
    external: false,
  },
  {
    number: "02",
    Icon: IconFrame,
    title: "Create your portfolio",
    body: "The first impression, before a single message is sent. Free on every plan — how you're introduced shouldn't depend on what you're paying.",
    cta: "Create your portfolio — free",
    href: "/signup?next=/dashboard/portfolio",
    external: false,
  },
  {
    number: "03",
    Icon: IconChat,
    title: "Join Creativo",
    body: "Pricing, positioning, and better clients — figured out alongside creators already working at the level you're aiming for.",
    cta: "Join the community",
    href: COMMUNITY_URL,
    external: true,
  },
];

const PAIN_POINTS = [
  {
    Icon: IconTag,
    title: "You're pricing the delivery, not the work",
    body: "A file-transfer link says casual. A client will negotiate accordingly — not because the work is worth less, but because nothing around it says otherwise.",
  },
  {
    Icon: IconSparkle,
    title: "Premium clients expect a premium moment",
    body: "The clients who pay well are used to being treated well. An ordinary handover makes a strong price feel like a stretch, however good the work is.",
  },
  {
    Icon: IconWrench,
    title: "You became the delivery's tech support",
    body: "You shot it, you edited it — and now you're chasing a broken download link, for the same fee either way.",
  },
];

const STEPS = [
  {
    number: "01",
    Icon: IconUpload,
    title: "Upload the work",
    body: "Add the photographs and film for this project. Stored at full quality, delivered the same way.",
  },
  {
    number: "02",
    Icon: IconLock,
    title: "Set the access code",
    body: "One code, one project. Only the client you choose gets in.",
  },
  {
    number: "03",
    Icon: IconSend,
    title: "Send the link",
    body: "They open it, enter the code, and see the work — and the price — exactly as you meant them to.",
  },
];

const TESTIMONIALS = [
  { quote: "My client assumed I'd hired an agency to build this. It was just the link.", name: "Tolu A.", role: "Videographer" },
  { quote: "Set up in five minutes. The invoice was paid within the hour.", name: "Ada O.", role: "Photographer" },
  { quote: "Finally, a delivery that looks as considered as the work itself.", name: "Chidi E.", role: "Content Studio" },
];

const PRICING_TIERS = [
  {
    key: "FREE",
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    tagline: "Everything you need to begin, at no cost.",
    highlight: false,
    features: [
      "Your portfolio — always free",
      "1 project a month",
      "Free access to Creativo",
      "Password-protected delivery",
      "Up to 5GB per file",
      "No cap on total project size",
      "Custom hero banner",
      "Client email capture",
      "Approve / revision flow",
      "Individual file downloads",
      "Dashboard views & analytics",
      "Shows the Showwork badge",
    ],
    cta: "Start free",
    href: "/start",
  },
  {
    key: "STARTER",
    name: "Starter",
    priceMonthly: 5900,
    priceAnnual: 67260,
    tagline: "For the creator taking on clients steadily.",
    highlight: false,
    features: [
      "Your portfolio — always free",
      "Up to 5 projects a month",
      "Free access to Creativo",
      "Password-protected delivery",
      "Up to 5GB per file",
      "No cap on total project size",
      "Custom hero banner",
      "Client email capture",
      "Approve / revision flow",
      "Individual + zip downloads",
      "Dashboard views & analytics",
      "No Showwork badge",
    ],
    cta: "Choose Starter",
    href: "/dashboard/billing?tier=STARTER",
  },
  {
    key: "GROWTH",
    name: "Growth",
    priceMonthly: 10500,
    priceAnnual: 119700,
    tagline: "For studios that shoot every week.",
    highlight: true,
    features: [
      "Your portfolio — always free",
      "Up to 20 projects a month",
      "Free access to Creativo",
      "Password-protected delivery",
      "Up to 5GB per file",
      "No cap on total project size",
      "Custom hero banner",
      "Client email capture",
      "Approve / revision flow",
      "Individual + zip downloads",
      "Dashboard views & analytics",
      "Priority support",
    ],
    cta: "Choose Growth",
    href: "/dashboard/billing?tier=GROWTH",
  },
  {
    key: "UNLIMITED",
    name: "Unlimited",
    priceMonthly: 15000,
    priceAnnual: 171000,
    tagline: "For teams who no longer count projects.",
    highlight: false,
    features: [
      "Your portfolio — always free",
      "Unlimited projects",
      "Free access to Creativo",
      "Password-protected delivery",
      "Up to 5GB per file",
      "No cap on total project size",
      "Custom hero banner",
      "Client email capture",
      "Approve / revision flow",
      "Individual + zip downloads",
      "Dashboard views & analytics",
      "Highest priority support",
    ],
    cta: "Go Unlimited",
    href: "/dashboard/billing?tier=UNLIMITED",
  },
];

function Wordmark({ size = "md", color = COLOR.black }: { size?: "sm" | "md" | "lg"; color?: string }) {
  const heights = { sm: 22, md: 32, lg: 44 };
  return (
    <div
      role="img"
      aria-label="Showwork"
      style={{
        height: heights[size],
        width: heights[size] * 2,
        backgroundColor: color,
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

function LogoMark({ src, size = 26, color = "#FFFFFF" }: { src: string; size?: number; color?: string }) {
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

// ─────────────────────────────────────────────
// HERO — full-bleed photography, pinned to the viewport (bg-fixed) on
// every screen size, so the page glides over one still frame per
// slide. A single scrim sits over the whole image so the centered
// white type holds contrast regardless of what's in the photo, and
// the headline itself carries a quiet white-to-blue gradient — the
// one deliberate flourish on an otherwise flat, minimal hero.
// ─────────────────────────────────────────────
function HeroSlider({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;

    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full-bleed photography, pinned to the viewport on every screen
          size — background-attachment: fixed, unconditionally. */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <div
              className="h-full w-full bg-fixed bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* One scrim across the whole frame so the centered text holds
          contrast against any photo — darker at the edges, lightest
          where the eye actually needs to read the image, but never so
          light the headline loses its footing. */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,7,10,.62) 0%, rgba(6,7,10,.42) 42%, rgba(6,7,10,.4) 60%, rgba(6,7,10,.66) 100%)",
        }}
      />

      {/* Slightly deeper gradient behind the navbar specifically, so
          nav links stay legible over a bright sky or highlight. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

           <div className="relative z-20">
        <Navbar isLoggedIn={isLoggedIn} />
      </div>

      {/* Minimal hero copy */}
      <div className="relative z-10 flex h-full items-center justify-center px-5 pt-20 sm:px-8 lg:px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl text-center"
          >
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/85 sm:mb-7 sm:text-xs">
              {slide.eyebrow}
            </p>

            <h1
              className="mx-auto max-w-4xl bg-clip-text font-[var(--font-fraunces)] text-[clamp(2.7rem,7vw,6.5rem)] font-normal leading-[0.98] tracking-[-0.035em] text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, #FFFFFF 0%, #FFFFFF 45%, #C9D8FF 75%, ${COLOR.blue} 115%)`,
              }}
            >
              {slide.headline}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/90 sm:mt-7 sm:text-base lg:text-lg">
              {slide.body}
            </p>

            <div className="mt-8 flex justify-center sm:mt-10">
              <SolidButton
                href={slide.cta.href}
                external={slide.cta.external}
                tone="blue"
              >
                {slide.cta.label}
              </SolidButton>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quiet slide navigation */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 sm:bottom-10">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-px overflow-hidden bg-white/45 transition-all duration-300"
              style={{ width: i === active ? 34 : 12 }}
            >
              <motion.span
                className="block h-full bg-white"
                animate={{ width: i === active ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </button>
          ))}
        </div>

        <span className="text-[10px] font-medium tracking-[0.14em] text-white/75">
          0{active + 1} / 03
        </span>
      </div>
    </section>
  );
}

function CommunityCounter() {
  const [count, setCount] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        const duration = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(100 * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );
    const node = sectionRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white px-4 py-24 sm:px-6 sm:py-32 md:px-10 md:py-40 lg:px-16">
      <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1fr_.75fr] lg:items-center lg:gap-20">
        <div>
          <Eyebrow>Creativo community</Eyebrow>
          <h2
            className="mt-6 max-w-2xl font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl"
            style={{ color: COLOR.ink }}
          >
            You don't have to build your creative career alone.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: COLOR.muted }}>
            A community for creators refining pricing, positioning, and the clients they choose to take on — together.
          </p>
          <div className="mt-8">
            <ArrowLink href={COMMUNITY_URL} external tone="accent">
              Join Creativo, it&apos;s free
            </ArrowLink>
          </div>
        </div>

        <div className="flex min-h-[260px] flex-col justify-center border-t pt-10 lg:min-h-[380px] lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0" style={{ borderColor: COLOR.line }}>
          <div className="flex items-end leading-none">
            <span className="font-[var(--font-fraunces)] text-[clamp(6rem,14vw,11rem)] font-normal tracking-[-0.02em]" style={{ color: COLOR.ink }}>
              {count}
            </span>
            <span className="mb-4 ml-2 font-[var(--font-fraunces)] text-5xl italic sm:text-7xl lg:mb-6" style={{ color: COLOR.blue }}>
              +
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase" style={{ color: COLOR.muted, letterSpacing: ".16em" }}>
            creators in Creativo, and counting
          </p>
        </div>
      </div>
    </section>
  );
}

export default function HomeClient({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [showMotionFull, setShowMotionFull] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const toggleTierExpanded = (key: string) => setExpandedTiers((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const heroVideoSrc = isMobile ? "/images/shm.mov" : "/images/sh.mp4";

  return (
    <main className={`${jakarta.variable} ${fraunces.variable}`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <FloatingStartButton />
            <HeroSlider isLoggedIn={isLoggedIn} />

      {/* THE FILM — one plain card, hairline border, no glow, no pattern.
          The video itself is the only thing drawing attention. */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-2xl border bg-white" style={{ borderColor: COLOR.line }}>
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-10 md:p-14">
            <div>
              <Eyebrow>See it for yourself</Eyebrow>
              <h2 className="mt-6 font-[var(--font-fraunces)] text-3xl font-normal leading-[1.08] tracking-[-0.01em] sm:text-5xl" style={{ color: COLOR.ink }}>
                Work like this deserves to be seen, not just sent.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: COLOR.muted }}>
                The delivery is a client's last impression of the work. Make it count as much as the work itself.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMotionFull(true)}
              className="group relative block w-full overflow-hidden rounded-xl border text-left"
              style={{ borderColor: COLOR.line }}
              aria-label="Watch the complete Showwork motion film"
            >
              <video src="/images/motion.mp4" autoPlay muted loop playsInline preload="metadata" className="aspect-[4/5] w-full object-cover sm:aspect-video" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/5 to-transparent p-5">
                <p className="text-sm font-semibold text-white">Watch the full film</p>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition-transform duration-300 group-hover:scale-110">
                  <IconPlay className="h-4 w-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* THREE DOORS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-[.6fr_1.4fr] lg:gap-12">
            <div>
              <Eyebrow>Choose your starting point</Eyebrow>
              <h2 className="mt-6 font-[var(--font-fraunces)] text-4xl font-normal leading-[1.06] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
                There is more than one way to show up.
              </h2>
            </div>
            <div className="grid gap-4">
              {ROUTES.map((route, i) => {
                const primary = i === 0;
                const content = (
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="group relative overflow-hidden rounded-2xl border p-7 sm:p-9"
                    style={{
                      background: primary ? COLOR.black : COLOR.paperCard,
                      borderColor: primary ? "transparent" : COLOR.line,
                    }}
                  >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                      <IconRing tone={primary ? "dark" : "light"}>
                        <route.Icon className="h-full w-full" />
                      </IconRing>
                      <div className="flex-1">
                        <p className="font-[var(--font-fraunces)] text-sm italic" style={{ color: primary ? "rgba(255,255,255,.5)" : COLOR.muted }}>
                          {route.number}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold sm:text-2xl" style={{ color: primary ? COLOR.white : COLOR.ink }}>
                          {route.title}
                        </h3>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: primary ? "rgba(255,255,255,.6)" : COLOR.muted }}>
                          {route.body}
                        </p>
                        <div className="mt-5">
                          <ArrowLink href={route.href} external={route.external} tone={primary ? "dark" : "accent"}>
                            {route.cta}
                          </ArrowLink>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
                return route.external ? (
                  <a key={route.number} href={route.href} target="_blank" rel="noopener noreferrer" className="block">
                    {content}
                  </a>
                ) : (
                  <Link key={route.number} href={route.href} className="block">
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1400px]">
          <Eyebrow tone="dark">Worth saying plainly</Eyebrow>
          <h2 className="mt-6 max-w-4xl font-[var(--font-fraunces)] text-4xl font-normal leading-[1.06] tracking-[-0.01em] text-white sm:text-6xl">
            Good work still gets handed over like an afterthought.
          </h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl sm:mt-16 md:grid-cols-3" style={{ background: COLOR.lineOnDark }}>
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="min-h-[260px] p-8 sm:min-h-[300px] sm:p-10" style={{ background: COLOR.black }}>
                <IconRing tone="dark">
                  <p.Icon className="h-full w-full" />
                </IconRing>
                <h3 className="mt-8 text-xl font-semibold leading-tight text-white sm:mt-10 sm:text-2xl">{p.title}</h3>
                <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: COLOR.mutedOnDark }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl font-[var(--font-fraunces)] text-2xl italic leading-snug text-white sm:mt-12 sm:text-3xl">
            How the work is presented changes how it's valued.
          </p>
        </div>
      </section>

      <CommunityCounter />

      {/* PRODUCT DEMO */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:gap-12">
            <div>
              <Eyebrow>The moment they open it</Eyebrow>
              <h2 className="mt-6 font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
                Make the handover feel considered.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-relaxed sm:text-lg" style={{ color: COLOR.muted }}>
                No generic folder. No awkward download page. The work fills the screen, the way it was meant to be seen.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase" style={{ color: COLOR.muted, letterSpacing: ".1em" }}>
                  Demo access code
                </span>
                <code className="rounded-md border px-3 py-1.5 text-sm font-semibold tracking-[.14em]" style={{ borderColor: COLOR.line, color: COLOR.blue }}>
                  DEMO
                </code>
              </div>
              <div className="mt-8">
                <ArrowLink href="https://useshowwork.com/demo-2" external tone="light">
                  View live demo
                </ArrowLink>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: COLOR.line }}
            >
              <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: COLOR.line }}>
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR.line }} />
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR.line }} />
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR.line }} />
                <span className="ml-4 text-[11px]" style={{ color: COLOR.muted }}>useshowwork.com/fashion-fest</span>
              </div>
              <div onClick={() => setShowFullVideo(true)} className="relative cursor-pointer">
                <video
                  key={heroVideoSrc}
                  src={heroVideoSrc}
                  autoPlay={!isMobile}
                  muted
                  loop
                  playsInline
                  preload={isMobile ? "none" : "metadata"}
                  className="max-h-[70vh] w-full object-contain"
                />
                <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: COLOR.line, background: COLOR.white, color: COLOR.ink }}>
                  Watch full <IconArrow className="h-3.5 w-3.5" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-32 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-end">
            <div>
              <Eyebrow>Every photograph, considered</Eyebrow>
              <h2 className="mt-6 max-w-2xl font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
                A gallery should feel like stepping into the work.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed sm:text-base" style={{ color: COLOR.muted }}>
              Full quality. Approval and revision, built in. Nothing lost to another message thread.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:mt-14 md:grid-cols-6">
            {[21, 42, 63, 84, 105, 126].map((seed, i) => (
              <div key={seed} className={`relative overflow-hidden rounded-xl ${i === 0 || i === 5 ? "md:mt-10" : ""}`}>
                <img src={`https://picsum.photos/seed/${seed}/600/750`} alt="" className="aspect-[4/5] w-full object-cover" />
                <span
                  className="absolute left-3 top-3 rounded-full border px-3 py-1 text-[10px] font-semibold"
                  style={{ borderColor: "rgba(255,255,255,.4)", background: "rgba(10,10,11,.55)", color: COLOR.white, backdropFilter: "blur(6px)" }}
                >
                  {i === 2 ? "Revision" : i % 2 === 0 ? "Approved" : "Preview"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-6 max-w-3xl font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
            Three steps. Nothing more required.
          </h2>
          <div className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="relative flex min-h-[280px] flex-col justify-between rounded-2xl border p-8 sm:min-h-[340px] sm:p-9"
                style={{ background: i === 1 ? COLOR.black : COLOR.paperCard, borderColor: i === 1 ? "transparent" : COLOR.line }}
              >
                <div className="flex items-center justify-between">
                  <IconRing tone={i === 1 ? "dark" : "light"}>
                    <step.Icon className="h-full w-full" />
                  </IconRing>
                  <span
                    className="font-[var(--font-fraunces)] text-sm italic"
                    style={{ color: i === 1 ? "rgba(255,255,255,.5)" : COLOR.muted }}
                  >
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold sm:text-2xl" style={{ color: i === 1 ? COLOR.white : COLOR.ink }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: i === 1 ? COLOR.mutedOnDark : COLOR.muted }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>Already in use</Eyebrow>
              <h2 className="mt-6 font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
                The work speaks. Now the delivery does too.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed sm:text-base" style={{ color: COLOR.muted }}>
              <strong style={{ color: COLOR.ink }}>100+ creators</strong> are already part of Creativo. Here&apos;s what they&apos;re saying.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border p-8 sm:p-9" style={{ borderColor: COLOR.line, background: COLOR.paperCard }}>
                <p className="font-[var(--font-fraunces)] text-xl italic leading-relaxed sm:text-2xl" style={{ color: COLOR.ink }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-10 border-t pt-5" style={{ borderColor: COLOR.line }}>
                  <p className="font-semibold" style={{ color: COLOR.ink }}>{t.name}</p>
                  <p className="mt-1 text-sm" style={{ color: COLOR.muted }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-36 lg:px-16" style={{ background: COLOR.paper }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-6 font-[var(--font-fraunces)] text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-6xl" style={{ color: COLOR.ink }}>
                Start free. Grow at your own pace.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: COLOR.muted }}>
                No credit card required to begin. Your portfolio is free on every plan, including this one.
              </p>
            </div>
            <div className="flex items-center gap-6 border-b" style={{ borderColor: COLOR.line }}>
              <button
                onClick={() => setBillingCycle("MONTHLY")}
                className="relative pb-3 text-sm font-semibold"
                style={{ color: billingCycle === "MONTHLY" ? COLOR.ink : COLOR.muted }}
              >
                Monthly
                {billingCycle === "MONTHLY" && (
                  <motion.span layoutId="pricing-tab" className="absolute -bottom-px left-0 right-0 h-px" style={{ background: COLOR.ink }} />
                )}
              </button>
              <button
                onClick={() => setBillingCycle("ANNUAL")}
                className="relative pb-3 text-sm font-semibold"
                style={{ color: billingCycle === "ANNUAL" ? COLOR.ink : COLOR.muted }}
              >
                Annual · Save 5%
                {billingCycle === "ANNUAL" && (
                  <motion.span layoutId="pricing-tab" className="absolute -bottom-px left-0 right-0 h-px" style={{ background: COLOR.ink }} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:mt-14 lg:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.key}
                className="relative flex flex-col rounded-2xl border p-7"
                style={{
                  background: COLOR.paperCard,
                  borderColor: tier.highlight ? COLOR.blue : COLOR.line,
                  borderWidth: tier.highlight ? 1.5 : 1,
                }}
              >
                {tier.highlight && (
                  <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: ".1em" }}>
                    Most popular
                  </p>
                )}
                <p className="text-xs font-semibold uppercase" style={{ color: COLOR.muted, letterSpacing: ".1em" }}>
                  {tier.name}
                </p>
                <h3 className="mt-4 font-[var(--font-fraunces)] text-4xl font-normal" style={{ color: COLOR.ink }}>
                  {tier.key === "FREE" ? "₦0" : `₦${(billingCycle === "ANNUAL" ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly).toLocaleString()}`}
                  <span className="text-sm font-normal" style={{ color: COLOR.muted }}>/mo</span>
                </h3>
                <p className="mt-3 min-h-[40px] text-sm" style={{ color: COLOR.muted }}>{tier.tagline}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {(expandedTiers[tier.key] ? tier.features : tier.features.slice(0, 5)).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: COLOR.blue }}>
                        <IconCheck className="h-4 w-4" />
                      </span>
                      <span style={{ color: COLOR.muted }}>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier.features.length > 5 && (
                  <button
                    onClick={() => toggleTierExpanded(tier.key)}
                    className="mt-5 text-left text-xs font-semibold underline"
                    style={{ color: COLOR.muted }}
                  >
                    {expandedTiers[tier.key] ? "Show less" : "View all features"}
                  </button>
                )}
                <Link
                  href={tier.key === "FREE" ? tier.href : `${tier.href}&cycle=${billingCycle}`}
                  className="mt-7 flex justify-center rounded-full px-5 py-3.5 text-sm font-semibold"
                  style={{ background: tier.highlight ? COLOR.blue : COLOR.black, color: COLOR.white }}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CREATIVO — the one deliberate use of full-bleed accent color on
          the whole page. Everywhere else is black, white, or ink; here,
          once, it's blue. That contrast is the payoff for the restraint
          everywhere else. */}
      <section className="px-4 py-20 text-center sm:px-6 sm:py-28 md:px-10 md:py-44 lg:px-16" style={{ background: COLOR.blue }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-center gap-5 sm:mb-10">
            <LogoMark src="/images/logo/sw.svg" size={48} color="#FFFFFF" />
            <span className="h-8 w-px bg-white/30 sm:h-10" />
            <LogoMark src="/images/logo/creativo.svg" size={48} color="#FFFFFF" />
          </div>
          <p className="text-xs font-semibold uppercase text-white/60" style={{ letterSpacing: ".14em" }}>Introducing Creativo</p>
          <h2 className="mt-5 font-[var(--font-fraunces)] text-4xl font-normal leading-[1.06] tracking-[-0.01em] text-white sm:text-6xl">
            You don&apos;t have to build this career alone.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/75 sm:text-lg">
            100+ creators already trade referrals, pricing knowledge, and introductions to better clients — the kind of network that used to take a decade to build.
          </p>
          <div className="mt-9 flex justify-center">
            <SolidButton href={COMMUNITY_URL} external tone="dark">
              Join Creativo, it&apos;s free
            </SolidButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 py-12 sm:px-6 sm:py-14 md:px-10 lg:px-16" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-10 border-b pb-10 sm:gap-14 sm:pb-14 md:flex-row" style={{ borderColor: COLOR.lineOnDark }}>
            <div>
              <Wordmark size="md" color={COLOR.white} />
              <p className="mt-4 max-w-sm text-base text-white/45 sm:mt-5 sm:text-lg">For creators who take the work — and the client — seriously.</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:gap-10">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: ".14em" }}>Contact</p>
                <a href="mailto:hello@useshowwork.com" className="text-white/70 hover:text-white">hello@useshowwork.com</a>
              </div>
              <div className="flex flex-col gap-3">
                <p className="mb-1 text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: ".14em" }}>Explore</p>
                <Link href="/start" className="text-white/70 hover:text-white">Deliver a project</Link>
                <Link href="/signup?next=/dashboard/portfolio" className="text-white/70 hover:text-white">Create portfolio</Link>
                <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">Join Creativo</a>
                <Link href="/login" className="text-white/70 hover:text-white">Log in</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 pt-6 text-xs text-white/25 sm:gap-5 sm:pt-7 md:flex-row">
            <span>© {new Date().getFullYear()} Showwork. All rights reserved.</span>
            <span>Considered work, considered delivery.</span>
          </div>
        </div>
      </footer>

      {/* Complete motion film modal */}
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
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white"
            >
              <IconClose className="h-4 w-4" />
            </button>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black"
            >
              <video src="/images/motion.mp4" controls autoPlay playsInline className="max-h-[82vh] w-full object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo card full-video modal */}
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
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white"
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
              <video key={heroVideoSrc} src={heroVideoSrc} controls autoPlay loop playsInline preload="metadata" className="max-h-[85vh] max-w-[92vw] object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}