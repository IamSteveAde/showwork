"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Product = "delivery" | "workspace";
type BillingCycle = "monthly" | "annual";

type PricingPlan = {
  name: string;
  monthly: number;
  annual: number;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
};

const DELIVERY_PLANS: PricingPlan[] = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    description: "A simple way to start delivering your work.",
    features: [
      "1 active project",
      "Basic client delivery",
      "Secure project links",
    ],
    cta: "Start free",
    href: "/start",
  },
  {
    name: "Starter",
    monthly: 5900,
    annual: 67260,
    description: "For creators starting to manage more client work.",
    features: [
      "5 active projects",
      "Client collaboration",
      "File delivery",
      "Project feedback",
    ],
    cta: "Choose Starter",
    href: "/start?product=delivery&cycle=MONTHLY&tier=STARTER",
  },
  {
    name: "Growth",
    monthly: 10500,
    annual: 119700,
    description: "For busy creatives handling work at scale.",
    features: [
      "15 active projects",
      "Advanced client delivery",
      "Client feedback & approvals",
      "Project collaboration",
    ],
    cta: "Choose Growth",
    href: "/start?product=delivery&cycle=MONTHLY&tier=GROWTH",
    popular: true,
  },
  {
    name: "Unlimited",
    monthly: 15000,
    annual: 171000,
    description: "For established creative businesses.",
    features: [
      "Unlimited projects",
      "Full client delivery",
      "Advanced collaboration",
      "Built for growing teams",
    ],
    cta: "Choose Unlimited",
    href: "/start?product=delivery&cycle=MONTHLY&tier=UNLIMITED",
  },
];

const WORKSPACE_PLANS: PricingPlan[] = [
  {
    name: "Creator",
    monthly: 2800,
    annual: 31920,
    description:
      "For freelancers and independent creative professionals.",
    features: [
      "1 active client workspace",
      "Up to 3 collaborators",
      "5 GB storage",
      "100 AI generations / month",
    ],
    cta: "Start 3-day trial",
    href: "/signup?next=/dashboard/calendars&plan=CREATOR&cycle=MONTHLY",
  },
  {
    name: "Studio",
    monthly: 15000,
    annual: 171000,
    description:
      "For agencies, studios and teams managing multiple clients.",
    features: [
      "Up to 10 active client workspaces",
      "Up to 15 collaborators",
      "50 GB storage",
      "500 AI generations / month",
    ],
    cta: "Start 3-day trial",
    href: "/signup?next=/dashboard/calendars&plan=STUDIO&cycle=MONTHLY",
    popular: true,
  },
];

function formatNaira(amount: number) {
  if (amount === 0) {
    return "Free";
  }

  return `₦${amount.toLocaleString("en-NG")}`;
}

function buildHref(
  product: Product,
  cycle: BillingCycle,
  tier?: string,
  plan?: string
) {
  const params = new URLSearchParams();

  params.set("product", product);
  params.set(
    "cycle",
    cycle === "monthly" ? "MONTHLY" : "ANNUAL"
  );

  if (tier) {
    params.set("tier", tier);
  }

  if (plan) {
    params.set("plan", plan);
  }

  return `/start?${params.toString()}`;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductIcon({
  product,
}: {
  product: Product;
}) {
  if (product === "delivery") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        aria-hidden
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.35"
        />

        <path
          d="M8 9h8M8 13h5"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />

        <path
          d="m15 16 2.5-2.5L20 16"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />

      <path
        d="M3 9.5h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <path
        d="M7 13h3M14 13h3M7 16.5h3M14 16.5h3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PricingSection() {
  const [product, setProduct] =
    useState<Product>("delivery");

  const [cycle, setCycle] =
    useState<BillingCycle>("annual");

  const plans =
    product === "delivery"
      ? DELIVERY_PLANS
      : WORKSPACE_PLANS;

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-white px-5 py-28 sm:px-8 sm:py-36 lg:px-16 lg:py-40"
    >
      {/* Background atmosphere */}

      <div
        className="pointer-events-none absolute right-[-220px] top-[-220px] h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(36,120,255,.08), transparent 68%)",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute bottom-[-280px] left-[-220px] h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(108,92,255,.055), transparent 68%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px]">
        {/* Header */}

        <div className="mx-auto max-w-[760px] text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[#2478FF]" />

            <span className="font-[var(--font-fraunces)] text-sm italic text-[#777D86]">
              Simple, transparent pricing
            </span>

            <span className="h-px w-8 bg-[#2478FF]" />
          </div>

          <h2 className="mt-6 font-[var(--font-fraunces)] text-[clamp(3rem,6vw,6rem)] font-normal leading-[0.92] tracking-[-0.05em] text-[#101216]">
            Choose how you
            <br />
            <span className="text-[#2478FF]">
              want to work.
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-[590px] text-sm leading-7 text-[#737982] sm:text-base">
            Start with what you need today. Upgrade as your
            creative business grows.
          </p>
        </div>

        {/* Product switcher */}

        <div className="mx-auto mt-12 flex w-fit rounded-full border border-[#E1E4E9] bg-[#F7F8FA] p-1.5">
          <button
            type="button"
            onClick={() => setProduct("delivery")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-semibold transition-all ${
              product === "delivery"
                ? "bg-[#111317] text-white shadow-sm"
                : "text-[#737982] hover:text-[#111317]"
            }`}
          >
            <ProductIcon product="delivery" />
            Project Delivery
          </button>

          <button
            type="button"
            onClick={() => setProduct("workspace")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-semibold transition-all ${
              product === "workspace"
                ? "bg-[#111317] text-white shadow-sm"
                : "text-[#737982] hover:text-[#111317]"
            }`}
          >
            <ProductIcon product="workspace" />
            Content Workspace
          </button>
        </div>

        {/* Product description */}

        <motion.div
          key={product}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto mt-8 max-w-[700px] text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2478FF]">
            {product === "delivery"
              ? "For delivering creative work"
              : "For planning work with clients"}
          </p>

          <p className="mt-2 text-sm text-[#8A9099]">
            {product === "delivery"
              ? "Present, collaborate, collect feedback and hand off projects beautifully."
              : "Plan content, upload assets, collaborate, get approvals and manage publishing."}
          </p>
        </motion.div>

        {/* Billing toggle */}

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex rounded-full border border-[#E1E4E9] bg-white p-1">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                cycle === "monthly"
                  ? "bg-[#EEF4FF] text-[#2478FF]"
                  : "text-[#7A8089]"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setCycle("annual")}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                cycle === "annual"
                  ? "bg-[#EEF4FF] text-[#2478FF]"
                  : "text-[#7A8089]"
              }`}
            >
              Annual
            </button>
          </div>

          <span className="rounded-full bg-[#EAF7EF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#27864B]">
            Save 5%
          </span>
        </div>

        {/* Pricing cards */}

        <motion.div
          key={`${product}-${cycle}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`mt-12 grid gap-4 ${
            product === "delivery"
              ? "lg:grid-cols-4"
              : "mx-auto max-w-[900px] md:grid-cols-2"
          }`}
        >
          {plans.map((plan) => {
            const amount =
              cycle === "monthly"
                ? plan.monthly
                : plan.annual;

            let href = plan.href;

            if (plan.name === "Free") {
              href = "/start";
            } else if (product === "delivery") {
              const tierMap: Record<
                string,
                string
              > = {
                Starter: "STARTER",
                Growth: "GROWTH",
                Unlimited: "UNLIMITED",
              };

              href = buildHref(
                "delivery",
                cycle,
                tierMap[plan.name]
              );
            } else {
              const workspacePlanMap: Record<
                string,
                string
              > = {
                Creator: "CREATOR",
                Studio: "STUDIO",
              };

              href = buildHref(
                "workspace",
                cycle,
                undefined,
                workspacePlanMap[plan.name]
              );
            }

            return (
              <motion.div
                key={plan.name}
                whileHover={{ y: -4 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className={`relative flex min-h-[500px] flex-col rounded-[26px] border p-7 transition-shadow sm:p-8 ${
                  plan.popular
                    ? "border-[#2478FF] bg-[#111317] text-white shadow-[0_25px_80px_rgba(36,120,255,.13)]"
                    : "border-[#E2E5E9] bg-[#FAFAFB] text-[#111317] hover:bg-white hover:shadow-[0_20px_60px_rgba(17,19,23,.06)]"
                }`}
              >
                {/* Popular badge */}

                {plan.popular && (
                  <div className="absolute right-6 top-6 rounded-full bg-[#2478FF] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                    Most popular
                  </div>
                )}

                {/* Plan heading */}

                <div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                      plan.popular
                        ? "text-[#7EAAFF]"
                        : "text-[#2478FF]"
                    }`}
                  >
                    {product === "delivery"
                      ? "Project Delivery"
                      : "Content Workspace"}
                  </p>

                  <h3
                    className={`mt-4 text-2xl font-semibold tracking-[-0.035em] ${
                      plan.popular
                        ? "text-white"
                        : "text-[#101216]"
                    }`}
                  >
                    {plan.name}
                  </h3>

                  <p
                    className={`mt-3 min-h-[48px] text-sm leading-6 ${
                      plan.popular
                        ? "text-white/50"
                        : "text-[#777D86]"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price */}

                <div className="mt-8">
                  <div className="flex items-end gap-1">
                    <span
                      className={`font-[var(--font-fraunces)] text-[42px] leading-none tracking-[-0.05em] ${
                        plan.popular
                          ? "text-white"
                          : "text-[#101216]"
                      }`}
                    >
                      {formatNaira(amount)}
                    </span>

                    {amount > 0 && (
                      <span
                        className={`mb-1 text-[11px] ${
                          plan.popular
                            ? "text-white/35"
                            : "text-[#999FA8]"
                        }`}
                      >
                        /
                        {cycle === "monthly"
                          ? "month"
                          : "year"}
                      </span>
                    )}
                  </div>

                  {cycle === "annual" && amount > 0 && (
                    <p
                      className={`mt-2 text-[10px] ${
                        plan.popular
                          ? "text-white/35"
                          : "text-[#999FA8]"
                      }`}
                    >
                      Equivalent to ₦
                      {Math.round(
                        amount / 12
                      ).toLocaleString("en-NG")}
                      /month
                    </p>
                  )}
                </div>

                {/* Divider */}

                <div
                  className={`my-8 h-px ${
                    plan.popular
                      ? "bg-white/10"
                      : "bg-[#E4E6EA]"
                  }`}
                />

                {/* Features */}

                <div className="flex-1">
                  <p
                    className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
                      plan.popular
                        ? "text-white/30"
                        : "text-[#999FA8]"
                    }`}
                  >
                    Includes
                  </p>

                  <ul className="mt-5 space-y-4">
                    {plan.features.map(
                      (feature) => (
                        <li
                          key={feature}
                          className={`flex items-start gap-3 text-xs leading-5 ${
                            plan.popular
                              ? "text-white/65"
                              : "text-[#555B65]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 ${
                              plan.popular
                                ? "text-[#7EAAFF]"
                                : "text-[#2478FF]"
                            }`}
                          >
                            <CheckIcon />
                          </span>

                          {feature}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* CTA */}

                <Link
                  href={href}
                  className={`group mt-8 flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-semibold transition-all ${
                    plan.popular
                      ? "bg-[#2478FF] text-white hover:bg-[#3A88FF]"
                      : "border border-[#D9DDE3] bg-white text-[#111317] hover:border-[#2478FF] hover:text-[#2478FF]"
                  }`}
                >
                  {plan.cta}

                  <ArrowRightIcon />
                </Link>

                {/* Trial note */}

                {product === "workspace" && (
                  <p
                    className={`mt-3 text-center text-[9px] ${
                      plan.popular
                        ? "text-white/30"
                        : "text-[#9CA2AB]"
                    }`}
                  >
                    3-day free trial · no payment
                    required to start
                  </p>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Portfolio inclusion */}

        <div className="mx-auto mt-10 max-w-[1000px] rounded-[24px] border border-[#E3E6EA] bg-[#F7F8FA] p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2478FF] shadow-sm ring-1 ring-[#E2E6EB]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="16"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.35"
                  />

                  <circle
                    cx="8.5"
                    cy="9"
                    r="1.4"
                    stroke="currentColor"
                    strokeWidth="1.35"
                  />

                  <path
                    d="m3 16 5-5 4 4 3-3 6 6"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#111317]">
                  Your portfolio is free.
                </p>

                <p className="mt-1 max-w-[650px] text-xs leading-5 text-[#7A8089]">
                  Build a professional home for your
                  work without paying for a subscription.
                  Your paid plans are for the tools that
                  power your workflow.
                </p>
              </div>
            </div>

            <Link
              href="/signup?next=/dashboard/portfolio"
              className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#2478FF]"
            >
              Create portfolio
              <ArrowRightIcon />
            </Link>
          </div>
        </div>

        {/* Reassurance */}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9AA0A9]">
          <span>Secure Paystack payments</span>

          <span className="h-1 w-1 rounded-full bg-[#2478FF]/40" />

          <span>Cancel anytime</span>

          <span className="h-1 w-1 rounded-full bg-[#2478FF]/40" />

          <span>Upgrade when you need</span>
        </div>
      </div>
    </section>
  );
}