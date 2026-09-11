"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const COLOR = {
  black: "#08090B",
  blackSoft: "#101216",
  blue: "#2478FF",
  blueBright: "#68B2FF",
  accent: "#FFCC00",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.45)",
};

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
      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/35 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-[#2478FF]/40"
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M2 2l14 14M6.6 6.7A3 3 0 0 0 9 12a3 3 0 0 0 2.7-1.7M4.3 4.5C2.6 5.7 1.3 7.3 1 9c.7 3 3.9 6 8 6 1.4 0 2.7-.35 3.8-.95M13.7 13.5c1.3-1 2.3-2.4 3-4.5-1-3-4.2-6-8-6-.65 0-1.28.08-1.9.24"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M1 9s2.8-6 8-6 8 6 8 6-2.8 6-8 6-8-6-8-6Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle
            cx="9"
            cy="9"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  ICONS                                     */
/* -------------------------------------------------------------------------- */

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9-1.9 6.4-1.9-6.4-6.3-1.9L10.1 9 12 2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                              LOGIN FORM                                    */
/* -------------------------------------------------------------------------- */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (res.ok) {
        router.push(next || "/dashboard");
        return;
      }

      let message = "Invalid email or password";

      try {
        const data = await res.json();
        message = data.error ?? message;
      } catch {
        // Keep fallback message.
      }

      setError(message);
      setLoading(false);
    } catch {
      setError(
        "We couldn't connect to Showwork. Check your connection and try again."
      );
      setLoading(false);
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background: COLOR.black,
      }}
    >
      {/* ================================================================== */}
      {/* BACKGROUND ENVIRONMENT                                             */}
      {/* ================================================================== */}

      <div className="absolute inset-0">
        {/* Main visual */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero1.png"
          alt=""
          className="h-full w-full object-cover"
          style={{
            opacity: 0.2,
          }}
        />

        {/* Dark cinematic wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(8,9,11,0.98) 0%, rgba(8,9,11,0.88) 48%, rgba(8,9,11,0.68) 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,11,0.82) 0%, rgba(8,9,11,0.25) 40%, rgba(8,9,11,0.95) 100%)",
          }}
        />

        {/* Blue atmospheric light */}
        <div
          className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full blur-[150px]"
          style={{
            background: COLOR.blue,
            opacity: 0.08,
          }}
        />

        <div
          className="absolute bottom-[-220px] right-[-120px] h-[500px] w-[500px] rounded-full blur-[150px]"
          style={{
            background: COLOR.blue,
            opacity: 0.05,
          }}
        />
      </div>

      {/* ================================================================== */}
      {/* TOP NAV                                                            */}
      {/* ================================================================== */}

      <header className="absolute left-0 right-0 top-0 z-30">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Showwork home"
          >
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold tracking-[-0.04em] text-white">
                Show<span style={{ color: COLOR.blue }}>work</span>
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[10px] font-semibold text-white/45 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              ←
            </span>
            Back to Showwork
          </Link>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN LAYOUT                                                        */}
      {/* ================================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] items-center px-5 py-28 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-24 xl:grid-cols-[minmax(0,1fr)_470px]">
          {/* ============================================================ */}
          {/* LEFT — BRAND STORY                                            */}
          {/* ============================================================ */}

          <section className="hidden max-w-2xl lg:block">
            <div className="max-w-xl">
              <div className="mb-7 flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: COLOR.blue,
                    boxShadow: `0 0 18px ${COLOR.blue}`,
                  }}
                />

                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                  Your creative workspace
                </span>
              </div>

              <h1 className="text-[clamp(3.5rem,5.5vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-white">
                Pick up
                <br />
                <span className="text-white/35">where you left off.</span>
              </h1>

              <p className="mt-8 max-w-lg text-base leading-[1.8] text-white/45 xl:text-lg">
                Your projects, client work, portfolio and creative workspace —
                all waiting for you.
              </p>

              <div className="mt-12 grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10">
                <div className="bg-black/30 p-5 backdrop-blur-sm">
                  <div
                    className="mb-4 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(36,120,255,.10)",
                      color: COLOR.blueBright,
                    }}
                  >
                    <SparkIcon />
                  </div>

                  <p className="text-sm font-semibold text-white">
                    Create & deliver
                  </p>

                  <p className="mt-1.5 text-xs leading-relaxed text-white/35">
                    Keep your creative work moving.
                  </p>
                </div>

                <div className="bg-black/30 p-5 backdrop-blur-sm">
                  <div
                    className="mb-4 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(255,255,255,.06)",
                      color: "rgba(255,255,255,.55)",
                    }}
                  >
                    <ShieldIcon />
                  </div>

                  <p className="text-sm font-semibold text-white">
                    Built for your work
                  </p>

                  <p className="mt-1.5 text-xs leading-relaxed text-white/35">
                    Everything organized in one place.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
                <span className="h-px w-8 bg-white/15" />
                Showwork
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* RIGHT — LOGIN                                                 */}
          {/* ============================================================ */}

          <section className="w-full">
            <div className="mx-auto w-full max-w-[440px]">
              {/* Mobile eyebrow */}
              <div className="mb-8 lg:hidden">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: COLOR.blue,
                      boxShadow: `0 0 18px ${COLOR.blue}`,
                    }}
                  />

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                    Showwork workspace
                  </span>
                </div>

                <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.055em] text-white sm:text-5xl">
                  Pick up where
                  <br />
                  <span className="text-white/35">you left off.</span>
                </h1>
              </div>

              {/* Login heading */}
              <div className="mb-7">
                <p
                  className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    color: COLOR.blueBright,
                  }}
                >
                  Welcome back
                </p>

                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.15rem]">
                  Log in to Showwork
                </h2>

                <p className="mt-2.5 text-sm leading-relaxed text-white/40">
                  Pick up right where you left off.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="rounded-[28px] border p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-8"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(15,17,21,0.88)",
                  backdropFilter: "blur(24px)",
                }}
              >
                {/* Top accent */}
                <div className="mb-7 flex items-center justify-between">
                  <div
                    className="h-[3px] w-9 rounded-full"
                    style={{
                      background: COLOR.accent,
                    }}
                    aria-hidden="true"
                  />

                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                    Secure access
                  </span>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] text-white/40"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@studio.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="h-[52px] w-full rounded-[14px] border border-white/10 bg-white/[0.045] px-4 text-[16px] text-white outline-none transition-all duration-200 placeholder:text-white/20 hover:border-white/15 focus:border-[#2478FF]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#2478FF]/10"
                  />
                </div>

                {/* Password */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/40"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-medium text-white/30 transition-colors hover:text-white"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="h-[52px] w-full rounded-[14px] border border-white/10 bg-white/[0.045] px-4 pr-14 text-[16px] text-white outline-none transition-all duration-200 placeholder:text-white/20 hover:border-white/15 focus:border-[#2478FF]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#2478FF]/10"
                    />

                    <EyeToggleButton
                      visible={passwordVisible}
                      onToggle={() =>
                        setPasswordVisible((visible) => !visible)
                      }
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-3 rounded-[14px] border px-3.5 py-3"
                    style={{
                      borderColor: "rgba(248,113,113,.18)",
                      background: "rgba(248,113,113,.06)",
                    }}
                  >
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-400/15 text-[9px] font-bold text-red-300">
                      !
                    </span>

                    <p className="text-xs leading-relaxed text-red-300/80">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-6 flex h-[54px] w-full items-center justify-center gap-3 overflow-hidden rounded-[14px] text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(36,120,255,.2)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{
                    background: COLOR.blue,
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"
                        aria-hidden="true"
                      />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <>
                      <span>Log in</span>

                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5">
                        <ArrowRight />
                      </span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.07]" />

                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/20">
                    or
                  </span>

                  <div className="h-px flex-1 bg-white/[0.07]" />
                </div>

                {/* Signup */}
                <p className="text-center text-xs text-white/30">
                  New to Showwork?{" "}
                  <Link
                    href={
                      next
                        ? `/signup?next=${encodeURIComponent(next)}`
                        : "/signup"
                    }
                    className="font-semibold text-white/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
                  >
                    Create an account
                  </Link>
                </p>
              </form>

              {/* Security / trust */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/20">
                <ShieldIcon />
                Secure sign in
                <span className="text-white/10">•</span>
                Showwork
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM BRAND LINE                                                  */}
      {/* ================================================================== */}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 pb-5 sm:px-8 lg:px-12">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/15">
            Creative work, presented better.
          </p>

          <p className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-white/15 sm:block">
            Showwork
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}