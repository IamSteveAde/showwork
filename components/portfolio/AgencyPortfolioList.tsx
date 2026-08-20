"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const COLOR = { black: "#0A0A0A", gold: "#F5C842", charcoal: "#1A1A1A" };

interface AgencyPortfolio {
  id: string;
  companyName: string;
  slug: string;
  billingStatus: "PENDING_SETUP" | "ACTIVE" | "OFFLINE";
}

function statusLabel(p: AgencyPortfolio): { text: string; color: string } {
  if (p.billingStatus === "PENDING_SETUP") {
    return { text: "Awaiting payment", color: "#F5C842" };
  }
  if (p.billingStatus === "OFFLINE") {
    return { text: "Offline — payment failed", color: "#F87171" };
  }
  return { text: "Active", color: "#4ADE80" };
}

export default function AgencyPortfolioList({ initialPortfolios }: { initialPortfolios: AgencyPortfolio[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portfolios = initialPortfolios;
  const [clientName, setClientName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const subscriptionPayment = searchParams.get("subscriptionPayment");
    const portfolioId = searchParams.get("portfolioId");

    if (subscriptionPayment === "callback" && portfolioId && !verifying) {
      setVerifying(true);
      fetch(`/api/portfolio/${portfolioId}/verify-subscription`, { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) {
            setError(data.error ?? "Couldn't confirm payment — try again from your portfolio list.");
          }
        })
        .catch(() => {
          setError("Couldn't confirm payment — try again from your portfolio list.");
        })
        .finally(() => {
          setVerifying(false);
          router.replace("/dashboard/portfolio");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCreate = async () => {
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }
    setCreating(true);
    setError(null);

    const res = await fetch("/api/portfolio/create-for-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: clientName }),
    });
    const data = await res.json();

    if (res.ok && data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
    } else {
      setError(data.error ?? "Couldn't create this portfolio — try again");
      setCreating(false);
    }
  };

  const completePayment = async (portfolioId: string) => {
    setCompletingId(portfolioId);
    setError(null);

    const res = await fetch(`/api/portfolio/${portfolioId}/retry-subscription`, { method: "POST" });
    const data = await res.json();

    if (res.ok && data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
    } else {
      setError(data.error ?? "Couldn't start payment — try again");
      setCompletingId(null);
    }
  };

  if (verifying) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
        <p className="text-sm text-white/50">Confirming payment...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Agency
        </p>
        <h1 className="mb-8 text-3xl font-bold text-white">Client portfolios</h1>

        {error && (
          <div className="mb-6 rounded-lg p-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        {portfolios.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            {portfolios.map((p) => {
              const status = statusLabel(p);
              const isUsable = p.billingStatus === "ACTIVE";
              const needsPayment = p.billingStatus === "PENDING_SETUP";
              const content = (
                <div
                  className="flex items-center justify-between rounded-xl p-5 transition-colors"
                  style={{ background: COLOR.charcoal }}
                >
                  <div>
                    <p className="text-base font-semibold text-white">{p.companyName}</p>
                    <p className="mt-0.5 text-xs" style={{ color: status.color }}>{status.text}</p>
                  </div>
                  {isUsable ? (
                    <span className="text-white/30">→</span>
                  ) : needsPayment ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        completePayment(p.id);
                      }}
                      disabled={completingId === p.id}
                      className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                      style={{ background: COLOR.gold, color: COLOR.black }}
                    >
                      {completingId === p.id ? "Starting..." : "Complete payment"}
                    </button>
                  ) : null}
                </div>
              );
              return isUsable ? (
                <Link key={p.id} href={`/dashboard/portfolio/${p.id}`} className="hover:opacity-90">
                  {content}
                </Link>
              ) : (
                <div key={p.id}>{content}</div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-1 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Create a portfolio for a client
          </h2>
          <p className="mb-4 text-xs text-white/40">
            ₦5,000/year, billed automatically to a saved card — no separate setup fee.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client or brand name"
              style={{ fontSize: "16px" }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: COLOR.gold, color: COLOR.black }}
            >
              {creating ? "Starting..." : "Create & pay ₦5,000/year"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}