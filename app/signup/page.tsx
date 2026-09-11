"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const COLOR = {
  black: "#08090B",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  accent: "#FFCC00",
};

type AccountType = "CREATOR" | "AGENCY" | "SOCIAL_MEDIA_MANAGER";

function EyeToggleButton({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/80"
    >
      {visible ? (
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
          <path
            d="M2 2l15 15M6.9 6.9a3.2 3.2 0 004.2 4.2M4.4 4.7C2.7 5.9 1.4 7.5 1 9.5c.8 3.1 4.2 6 8.5 6 1.4 0 2.7-.3 3.9-.9M14.6 14c1.4-1 2.5-2.5 3.3-4.5-.9-3.1-4.4-6-8.4-6-.7 0-1.4.1-2 .2"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
          <path
            d="M1 9.5s3-6.1 8.5-6.1S18 9.5 18 9.5s-3 6.1-8.5 6.1S1 9.5 1 9.5Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="9.5" r="2.6" stroke="currentColor" strokeWidth="1.35" />
        </svg>
      )}
    </button>
  );
}

function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center">
      <span className="text-[19px] font-bold tracking-[-0.04em] text-white">
        Show<span style={{ color: COLOR.blue }}>work</span>
      </span>
    </Link>
  );
}

function TypeIcon({ type }: { type: AccountType }) {
  if (type === "AGENCY") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "SOCIAL_MEDIA_MANAGER") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 16c.7-2.5 2.7-4 6-4s5.3 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const accountOptions: Array<{
  type: AccountType;
  title: string;
  description: string;
  detail: string;
}> = [
  {
    type: "CREATOR",
    title: "Creator",
    description: "Build your own creative presence.",
    detail: "One free portfolio for your own work.",
  },
  {
    type: "AGENCY",
    title: "Agency",
    description: "Present and manage work for clients.",
    detail: "Branded portfolios for multiple clients, billed per portfolio.",
  },
  {
    type: "SOCIAL_MEDIA_MANAGER",
    title: "Social media manager",
    description: "Plan, approve and publish client content.",
    detail: "Content workspaces are billed from ₦2,800/month per client.",
  },
];

function Progress({ step }: { step: "details" | "verify" }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: COLOR.gradient }}
        >
          1
        </span>
        <span className="text-xs font-medium text-white/70">Your details</span>
      </div>
      <div className="h-px w-8 bg-white/10 sm:w-12" />
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
            step === "verify"
              ? "border-transparent text-white"
              : "border-white/10 text-white/25"
          }`}
          style={step === "verify" ? { background: COLOR.gradient } : undefined}
        >
          2
        </span>
        <span className={`text-xs font-medium ${step === "verify" ? "text-white/70" : "text-white/25"}`}>
          Verify email
        </span>
      </div>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [step, setStep] = useState<"details" | "verify">("details");
  const [accountType, setAccountType] = useState<AccountType>("CREATOR");

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const selectedOption = accountOptions.find((option) => option.type === accountType)!;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          companyName: companyName.trim(),
          accountType,
        }),
      });

      if (res.ok) {
        setStep("verify");
      } else {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
      }
    } catch {
      setError("We couldn't connect to Showwork. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });

      if (res.ok) {
        router.push(next || "/welcome");
        return;
      }

      const data = await res.json();
      setError(data.error ?? "Invalid code");
    } catch {
      setError("We couldn't verify your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading || resendStatus === "Sending...") return;

    setResendStatus("Sending...");
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          companyName: companyName.trim(),
          accountType,
        }),
      });

      setResendStatus(res.ok ? "New code sent" : "Couldn't resend");
    } catch {
      setResendStatus("Couldn't resend");
    }

    setTimeout(() => setResendStatus(null), 3000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090B] text-white">
      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_35%,rgba(36,120,255,.22),transparent_34%),radial-gradient(circle_at_80%_15%,rgba(0,82,255,.12),transparent_30%),linear-gradient(115deg,rgba(8,9,11,.95)_0%,rgba(8,9,11,.78)_48%,rgba(8,9,11,.96)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />
        <motion.div
          className="absolute left-[8%] top-[28%] h-64 w-64 rounded-full bg-[#2478FF]/10 blur-[100px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Top navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-7 md:px-12 lg:px-16">
        <Logo />
        <p className="text-xs text-white/35">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-white/70 transition hover:text-white"
          >
            Log in
          </Link>
        </p>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-12 pt-4 md:px-12 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-20 lg:px-16 lg:pb-20">
        {/* Brand / value proposition */}
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF] shadow-[0_0_12px_rgba(36,120,255,.9)]" />
              Creative work, organised
            </div>

            <h1 className="max-w-lg text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white xl:text-[68px]">
              Build the work.
              <br />
              <span className="text-white/35">Show it better.</span>
            </h1>

            <p className="mt-7 max-w-md text-[16px] leading-7 text-white/45">
              Showwork gives creators, agencies and social media managers one
              place to present, deliver and move creative work forward.
            </p>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
              {[
                ["01", "Present", "A portfolio clients remember."],
                ["02", "Deliver", "Projects without the chaos."],
                ["03", "Grow", "Workspaces built to scale."],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-[#2478FF]">{number}</p>
                  <p className="mt-7 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1.5 text-[11px] leading-4 text-white/30">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs text-white/30">
              <span className="h-px w-8 bg-white/15" />
              Start free. Build from there.
            </div>
          </div>
        </section>

        {/* Signup panel */}
        <section className="w-full max-w-[560px] justify-self-center lg:justify-self-end">
          <div className="mb-7 lg:hidden">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2478FF]">
              Get started
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.045em]">Create your account.</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
              Set up your Showwork workspace and start turning creative work into a better client experience.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#111214]/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-8">
            <Progress step={step} />

            <AnimatePresence mode="wait">
              {step === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-7">
                    <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2478FF] lg:block">
                      Get started
                    </p>
                    <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
                      Create your account
                    </h2>
                    <p className="mt-2 text-sm leading-5 text-white/35">
                      Your first delivery could be live in the next ten minutes.
                    </p>
                  </div>

                  <form onSubmit={handleSendCode} className="space-y-5">
                    <div>
                      <label className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-white/35">
                        What best describes you?
                      </label>

                      <div className="grid gap-2">
                        {accountOptions.map((option) => {
                          const active = accountType === option.type;

                          return (
                            <button
                              key={option.type}
                              type="button"
                              onClick={() => setAccountType(option.type)}
                              className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                                active
                                  ? "border-[#2478FF]/50 bg-[#2478FF]/10"
                                  : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
                              }`}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  active ? "bg-[#2478FF] text-white" : "bg-white/5 text-white/35"
                                }`}
                              >
                                <TypeIcon type={option.type} />
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white">{option.title}</span>
                                  {option.type === "CREATOR" && (
                                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/35">
                                      Free
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs text-white/35">
                                  {option.description}
                                </span>
                              </span>

                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  active
                                    ? "border-[#2478FF] bg-[#2478FF]"
                                    : "border-white/15"
                                }`}
                              >
                                {active && (
                                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                    <path d="M2 5.5 4.3 8 9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <motion.div
                        key={accountType}
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 rounded-xl bg-white/[0.025] px-3.5 py-2.5 text-[11px] leading-4 text-white/30"
                      >
                        {selectedOption.detail}
                      </motion.div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name">
                        <input
                          type="text"
                          placeholder="Ada Obi"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="field-input"
                        />
                      </Field>

                      <Field label="Company name" optional>
                        <input
                          type="text"
                          placeholder="Ada Obi Studios"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="field-input"
                        />
                      </Field>
                    </div>

                    <Field label="Email">
                      <input
                        type="email"
                        placeholder="you@studio.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="field-input"
                      />
                    </Field>

                    <Field label="Phone number" hint="+234 followed by 10 digits">
                      <input
                        type="tel"
                        placeholder="+2348012345678"
                        required
                        pattern="^\+234[0-9]{10}$"
                        title="Enter a Nigerian number in the format +2348012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        className="field-input"
                      />
                    </Field>

                    <Field label="Password" hint="Minimum 8 characters">
                      <div className="relative">
                        <input
                          type={passwordVisible ? "text" : "password"}
                          placeholder="Create a secure password"
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          className="field-input pr-12"
                        />
                        <EyeToggleButton
                          visible={passwordVisible}
                          onToggle={() => setPasswordVisible((v) => !v)}
                        />
                      </div>
                    </Field>

                    {error && (
                      <div className="flex gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-300">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        <p>{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(36,120,255,.22)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                      style={{ background: COLOR.gradient }}
                    >
                      <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending code...
                        </>
                      ) : (
                        <>
                          Continue
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
                            <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </button>

                    <p className="text-center text-[11px] leading-5 text-white/25">
                      By continuing, you agree to use Showwork responsibly and provide accurate account information.
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-8">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2478FF]/10 text-[#2478FF]">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="3" y="5" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="m4.5 7 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
                      Check your email
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
                      We sent a 6-digit verification code to{" "}
                      <span className="font-medium text-white/75">{email}</span>.
                    </p>
                  </div>

                  <form onSubmit={handleVerify} className="space-y-5">
                    <div>
                      <label className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-white/35">
                        Verification code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        required
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        autoFocus
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-5 text-center font-semibold tracking-[0.32em] text-white outline-none transition focus:border-[#2478FF]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#2478FF]/10"
                        style={{ fontSize: "28px" }}
                      />
                    </div>

                    {error && (
                      <div className="flex gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-300">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        <p>{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || code.length !== 6}
                      className="group relative flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(36,120,255,.22)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                      style={{ background: COLOR.gradient }}
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify and create account
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between border-t border-white/8 pt-5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("details");
                          setError(null);
                        }}
                        className="text-white/35 underline underline-offset-4 transition hover:text-white"
                      >
                        Change details
                      </button>

                      <button
                        type="button"
                        onClick={handleResend}
                        className="font-medium text-white/60 underline underline-offset-4 transition hover:text-white"
                      >
                        {resendStatus ?? "Resend code"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-8 rounded-2xl border border-white/7 bg-white/[0.025] p-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1.5 11.5 3v3.2c0 3-1.8 5.4-4.5 6.3C4.3 11.6 2.5 9.2 2.5 6.2V3L7 1.5Z" stroke="currentColor" strokeWidth="1.1" />
                          <path d="m4.7 7 1.5 1.5 3.2-3.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-[11px] leading-5 text-white/25">
                        Your email verification helps keep your Showwork account secure and ensures we can reach you when it matters.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.13em] text-white/20">
            <span className="h-1 w-1 rounded-full bg-[#2478FF]" />
            Your creative workspace
            <span className="h-1 w-1 rounded-full bg-white/10" />
            Built for better work
          </div>
        </section>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          padding: 13px 14px;
          color: white;
          font-size: 16px;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .field-input::placeholder {
          color: rgba(255,255,255,.2);
        }
        .field-input:hover {
          border-color: rgba(255,255,255,.13);
        }
        .field-input:focus {
          border-color: rgba(36,120,255,.65);
          background: rgba(255,255,255,.05);
          box-shadow: 0 0 0 4px rgba(36,120,255,.08);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/35">
          {label}{" "}
          {optional && <span className="normal-case tracking-normal text-white/20">(optional)</span>}
        </label>
        {hint && <span className="text-[9px] text-white/20">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
