"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const COLOR = {
  black: "#0A0A0A",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  accent: "#FFCC00",
  midGray: "#888786",
};

function EyeToggleButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/80"
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
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  );
}

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
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(next || "/dashboard");
    } else {
      const data = await res.json();
      setError(data.error ?? "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: COLOR.black }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero1.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.4 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.5) 40%, rgba(10,10,10,0.95) 100%)",
        }}
      />

      {/* nav */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-8 md:px-14">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-white">
            Show<span style={{ color: COLOR.blue }}>work</span>
          </span>
        </Link>
      </div>

      {/* form card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase"
            style={{ color: COLOR.blue, letterSpacing: "0.1em" }}
          >
            Welcome back
          </p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Log in</h1>
          <p className="mt-2 text-sm font-normal text-white/50">
            Pick up right where you left off.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl p-8"
          style={{
            background: "rgba(26,26,26,0.7)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(248,247,244,0.08)",
          }}
        >
          <div className="mb-1 h-[3px] w-8" style={{ background: COLOR.accent }} aria-hidden />

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase text-white/40"
              style={{ letterSpacing: "0.08em" }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="you@studio.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ fontSize: "16px" }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase text-white/40"
                style={{ letterSpacing: "0.08em" }}
              >
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-white/40 underline transition-colors hover:text-white">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={passwordVisible ? "text" : "password"}
                placeholder="Your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none transition-colors focus:border-white/25"
              />
              <EyeToggleButton visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: COLOR.gradient }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="text-center text-xs" style={{ color: COLOR.midGray }}>
            No account yet?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="font-medium text-white/70 underline transition-colors hover:text-white"
            >
              Sign up
            </Link>
          </p>
        </form>
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