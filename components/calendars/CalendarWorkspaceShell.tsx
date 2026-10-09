"use client";

import UiSymbol from "@/components/ui/UiSymbol";
import Link from "next/link";
import MobileDrawer from "@/components/navigation/MobileDrawer";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import WorkspaceTour from "@/components/calendars/WorkspaceTour";

type WorkspaceSectionId =
  | "overview"
  | "content"
  | "team"
  | "analytics"
  | "inbox"
  | "leads"
  | "access"
  | "channels"
  | "knowledge"
  | "generate"
  | "publish";

type WorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  group:
    | "Workspace"
    | "Collaboration"
    | "Insights"
    | "Leads & Messages"
    | "Client"
    | "Publishing"
    | "AI Studio";
  content: ReactNode;
};

type NavCluster = {
  label: string;
  items: WorkspaceSection[];
  featured?: boolean;
};

const PRIMARY_BLUE = "#1768E8";

function SectionIcon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: WorkspaceSectionId;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <path d="M4 5.8A1.8 1.8 0 0 1 5.8 4h4.4A1.8 1.8 0 0 1 12 5.8v4.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 10.2V5.8ZM14 5.8A1.8 1.8 0 0 1 15.8 4h2.4A1.8 1.8 0 0 1 20 5.8v8.4a1.8 1.8 0 0 1-1.8 1.8h-2.4a1.8 1.8 0 0 1-1.8-1.8V5.8ZM4 15.8A1.8 1.8 0 0 1 5.8 14h4.4a1.8 1.8 0 0 1 1.8 1.8v2.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2v-2.4Z" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5h17M8 13h3M8 16.5h7" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8" r="3" />
          <path d="M3.5 19c.4-3.2 2-5 5-5s4.6 1.8 5 5M15 6c2 .1 3.2 1.3 3.2 3 0 1.3-.7 2.3-1.8 2.8M16 14.2c2.5.5 3.8 2 4 4.8" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          <path d="M4 19V12M10 19V5M16 19v-9M21 19H3" />
          <path d="m4 9 5-3 6 2 5-4" opacity=".45" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 5.5h16v13H4z" />
          <path d="M4 13h4l1.5 2h5L16 13h4M8 9h8" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.1.5 3.3 2.1 3.6 4.5" />
        </svg>
      );
    case "access":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" />
        </svg>
      );
    case "channels":
      return (
        <svg {...common}>
          <path d="M9 15 15 9M7 18H6a4 4 0 1 1 0-8h3M17 6h1a4 4 0 1 1 0 8h-3" />
        </svg>
      );
    case "knowledge":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />
        </svg>
      );
    case "generate":
      return (
        <svg {...common}>
          <path d="m11.5 3 1.55 5.45L18.5 10l-5.45 1.55L11.5 17l-1.55-5.45L4.5 10l5.45-1.55L11.5 3Z" />
          <path d="m18.5 16 .65 2.35 2.35.65-2.35.65L18.5 22l-.65-2.35L15.5 19l2.35-.65L18.5 16Z" />
        </svg>
      );
    case "publish":
      return (
        <svg {...common}>
          <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
        </svg>
      );
  }
}

function ArrowUpRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m7 9 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.75 13.6 9.4 20.25 11 13.6 12.6 12 19.25 10.4 12.6 3.75 11 10.4 9.4 12 2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function CalendarWorkspaceShell({
  clientName,
  clientUrl,
  isManager,
  settings,
  publishAction,
  sections,
}: {
  clientName: string;
  clientUrl: string;
  isManager: boolean;
  settings?: ReactNode;
  publishAction?: ReactNode;
  sections: WorkspaceSection[];
}) {
  const [activeId, setActiveId] = useState<WorkspaceSectionId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourId, setTourId] = useState<WorkspaceSectionId | null>(null);
  const [mountedInsightViews, setMountedInsightViews] = useState<Set<WorkspaceSectionId>>(() => new Set());

  const rememberInsightView = (id: WorkspaceSectionId) => {

    setMountedInsightViews((current) => current.has(id) ? current : new Set(current).add(id));
  };

  // Allow rich overview modules to behave like real navigation controls without
  // coupling server-rendered page content to client routing state.
  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: WorkspaceSectionId; tour?: boolean }>).detail;
      if (detail?.id) {
        setActiveId(detail.id);
        rememberInsightView(detail.id);
        setMobileOpen(Boolean(detail.tour) && window.innerWidth < 1024);
        setTourId(detail.tour ? detail.id : null);
        const url = new URL(window.location.href);
        url.searchParams.set("view", detail.id);
        window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const finishTour = () => { setTourId(null); setMobileOpen(false); };
    window.addEventListener("showwork-workspace-navigate", handleNavigate);
    window.addEventListener("showwork-workspace-tour-finish", finishTour);
    return () => {
      window.removeEventListener("showwork-workspace-navigate", handleNavigate);
      window.removeEventListener("showwork-workspace-tour-finish", finishTour);
    };
  }, []);

  useEffect(() => {
    if (!tourId) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const resize = () => setMobileOpen(!media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [tourId]);

  const visibleSections = useMemo(() => sections.filter(Boolean), [sections]);

  useEffect(() => {
    const handlePopState = () => {
      const requestedView = new URLSearchParams(window.location.search).get("view");
      const validViews = sections.map((section) => section.id);
      setActiveId(
        validViews.includes(requestedView as WorkspaceSectionId)
          ? (requestedView as WorkspaceSectionId)
          : sections[0]?.id || "overview",
      );
      if (validViews.includes(requestedView as WorkspaceSectionId)) rememberInsightView(requestedView as WorkspaceSectionId);
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [sections]);

  const active =
    visibleSections.find((section) => section.id === activeId) ??
    visibleSections.find((section) => section.id === "content") ??
    visibleSections[0];

  const nav = useMemo<NavCluster[]>(() => {
    const byId = (id: WorkspaceSectionId) =>
      visibleSections.find((section) => section.id === id);

    const compact = (items: Array<WorkspaceSection | undefined>) =>
      items.filter(Boolean) as WorkspaceSection[];

    return [
  {
    label: "Workspace",
    items: compact([
      byId("overview"),
      byId("content"),
    ]),
  },

  {
    label: "AI Studio",
    featured: true,
    items: compact([
      byId("knowledge"),
      byId("generate"),
    ]),
  },

  {
    label: "Leads & Messages",
    items: compact([byId("inbox"), byId("leads")]),
  },

  {
    label: "Understand",
    items: compact([byId("analytics")]),
  },

  {
    label: "Collaborate",
    items: compact([
      byId("team"),
    ]),
  },

  {
    label: "Publish",
    items: compact([
      byId("channels"),
      byId("publish"),
    ]),
  },

  {
    label: "Client",
    items: compact([
      byId("access"),
    ]),
  },
].filter((cluster) => cluster.items.length > 0);
  }, [visibleSections]);

  if (!active) return null;

  const canUseAi = visibleSections.some(section => section.id === "generate" || section.id === "knowledge");
  const canPlanContent = visibleSections.some(section => section.id === "content");
  const canGenerate = visibleSections.some((section) => section.id === "generate");
  const aiTarget: WorkspaceSectionId = canGenerate ? "generate" : "knowledge";

  const select = (id: WorkspaceSectionId) => {
    if (tourId) window.dispatchEvent(new Event("showwork-workspace-tour-dismiss"));
    setActiveId(id);
    rememberInsightView(id);
    setMobileOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") !== id) {
      url.searchParams.set("view", id);
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    requestAnimationFrame(() => {
      document.getElementById("workspace-main")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const sidebar = <>
          {canPlanContent && <div className="hidden border-b border-[#E7ECF3] p-3 lg:block xl:p-4">
            <button
              type="button"
              onClick={() => select("content")}
              className="group flex w-full items-center gap-3 rounded-[18px] border border-[#DFE7F1] bg-white p-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition hover:border-[#CBD9EC] hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#EEF5FF] text-[#1768E8]">
                <SectionIcon name="content" className="h-[17px] w-[17px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3]">
                  Working space
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-[#27364A]">
                  Content planner
                </p>
              </div>
              <span className="ml-auto text-[#A9B4C2] transition-transform group-hover:translate-x-0.5"><UiSymbol name="right" /></span>
            </button>
          </div>}

          <nav
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3 xl:px-4"
            aria-label="Workspace sections"
          >
            {nav.map((cluster) => (
              <div
                key={cluster.label}
                className={`mb-4 last:mb-0 ${
                  cluster.featured
                    ? "lg:rounded-[20px] lg:border lg:border-[#D3E4FF] lg:bg-[linear-gradient(145deg,#F2F7FF_0%,#FFFFFF_60%,#EDF5FF_100%)] lg:p-2.5 lg:shadow-[0_12px_30px_rgba(23,104,232,0.07)]"
                    : ""
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between px-2">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      cluster.featured ? "text-[#1768E8]" : "text-[#98A2B3]"
                    }`}
                  >
                    {cluster.label}
                  </p>
                  {cluster.featured && (
                    <span className="hidden items-center gap-1 rounded-full bg-[#1768E8] px-1.5 lg:inline-flex py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-white">
                      <SparkMark className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {cluster.items.map((item) => {
                    const selected = item.id === active.id;
                    const generate = item.id === "generate";

                    return (
                      <div key={item.id}>
                      <button
                        data-tour-target={item.id}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => select(item.id)}
                        className={`${tourId === item.id ? "outline outline-1 outline-[#A9C9FA]" : ""} group relative flex w-full scroll-mt-2 items-center gap-3 min-h-11 rounded-xl px-2.5 py-2 text-left transition-all ${
                          selected
                            ? generate
                              ? "bg-[#EEF5FF] text-[#1768E8] lg:bg-[#1768E8] lg:text-white lg:shadow-[0_9px_20px_rgba(23,104,232,0.24)]"
                              : "bg-[#EEF5FF] text-[#1768E8] lg:bg-white lg:shadow-[0_6px_16px_rgba(15,23,42,0.06)] lg:ring-1 lg:ring-[#DCE7F5]"
                            : "text-[#5E6B7C] hover:bg-white/80 hover:text-[#172033]"
                        }`}
                      >
                        {selected && !generate && (
                          <span className="absolute -left-3 hidden lg:block h-5 w-[3px] rounded-r-full bg-[#1768E8] xl:-left-4" />
                        )}
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${
                            selected
                              ? generate
                                ? "bg-[#DCEAFF] text-[#1768E8] lg:bg-white/12 lg:text-white"
                                : "bg-[#EEF5FF] text-[#1768E8]"
                              : cluster.featured
                                ? "bg-[#EEF5FF] text-[#1768E8] lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-[#E3ECFA]"
                                : "bg-[#F1F4F8] text-[#7D8999]"
                          }`}
                        >
                          <SectionIcon name={item.id} className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                          {item.label}
                        </span>
                        {generate && !selected && (
                          <span className="hidden rounded-full bg-[#1768E8]/[0.08] px-1.5 lg:block py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-[#1768E8]">
                            Create
                          </span>
                        )}
                      </button>
                      <div data-tour-slot={item.id} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[#E7ECF3] p-3 xl:p-4">
            {clientUrl && <div className="rounded-xl border border-[#E1E8F1] bg-white px-3 py-1.5 lg:rounded-[18px] lg:p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#98A2B3]">
                    Client portal
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#344054]">
                    Private review view
                  </p>
                </div>
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#F2F6FB] text-[#667085] transition hover:bg-[#EEF5FF] hover:text-[#1768E8]"
                  aria-label="Open client view"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>}

            {publishAction && <div className="mt-2.5">{publishAction}</div>}
          </div>
  </>;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#101828]">
      {/* BLUE COMMAND HEADER */}
      {/* BLUE COMMAND HEADER */}
<header className="sticky top-0 z-50 border-b border-white/10 bg-[#1768E8] text-white shadow-[0_12px_40px_rgba(23,104,232,0.22)]">
  <div className="relative overflow-visible">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_-30%,rgba(255,255,255,0.24),transparent_31%),radial-gradient(circle_at_55%_120%,rgba(117,178,255,0.28),transparent_27%)]" />

    <div className="relative mx-auto flex min-h-[72px] max-w-[1800px] items-center gap-2.5 px-3.5 py-2.5 sm:gap-3 sm:px-5 lg:h-[72px] lg:px-6 xl:px-8 lg:py-0">

      {/* BACK */}
      <Link
        href="/dashboard/calendars"
        className="group flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.09] px-3 text-[11px] font-semibold text-white/85 transition-all duration-150 hover:border-white/25 hover:bg-white/[0.16] hover:text-white"
        aria-label="Back to workspaces"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
          aria-hidden="true"
        >
          <path
            d="M19 12H5M11 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="hidden sm:inline">Workspaces</span>
      </Link>

      <div className="hidden h-7 w-px bg-white/15 sm:block" />

      {/* WORKSPACE IDENTITY */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white text-[#1768E8] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
          <span className="text-[13px] font-black tracking-[-0.04em]">
            {clientName.slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-white sm:text-[15px]">
              {clientName}
            </p>

            <span className="hidden shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/65 md:inline-flex">
              Client workspace
            </span>
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[#92FFC1] shadow-[0_0_10px_rgba(146,255,193,0.8)]" />
            <span className="truncate">{active.label}</span>
            <span className="text-white/25">/</span>
            <span className="hidden sm:inline">{active.eyebrow}</span>
          </div>
        </div>
      </div>

      {/* DESKTOP ACTIONS */}
      <div className="hidden items-center gap-2 lg:flex">
        {canUseAi && <button
          type="button"
          onClick={() => select(aiTarget)}
          className="group flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.10] px-3 text-[11px] font-semibold text-white transition-all duration-150 hover:border-white/25 hover:bg-white/[0.17]"
        >
          <SparkMark className="h-3.5 w-3.5" />
          AI Studio
          <span className="text-white/45 transition-transform group-hover:translate-x-0.5"><UiSymbol name="right" /></span>
        </button>}

        {clientUrl && <a
          href={clientUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[11px] font-semibold text-[#1558BE] shadow-[0_8px_18px_rgba(7,39,92,0.16)] transition-all duration-150 hover:-translate-y-0.5"
        >
          Client view
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>}

        {settings}
      </div>

      {/* MOBILE ACTIONS */}
      <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
        {settings}

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-150 ${
            mobileOpen
              ? "border-white/30 bg-white/[0.18]"
              : "border-white/15 bg-white/[0.10]"
          }`}
          aria-label={
            mobileOpen
              ? "Close workspace navigation"
              : "Open workspace navigation"
          }
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4.5 w-4.5"
              aria-hidden="true"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <div className="space-y-1">
              <span className="block h-[1.5px] w-4 bg-current" />
              <span className="block h-[1.5px] w-4 bg-current" />
              <span className="block h-[1.5px] w-4 bg-current" />
            </div>
          )}
        </button>
      </div>
    </div>
  </div>

  <MobileDrawer open={mobileOpen} onClose={() => { setMobileOpen(false); if (tourId && window.innerWidth < 1024) window.dispatchEvent(new Event("showwork-workspace-tour-dismiss")); }} label="Workspace" className="bg-[#FAFBFD] text-[#101828]">{sidebar}</MobileDrawer>
  <nav aria-label="Quick workspace navigation" className="flex gap-1 overflow-x-auto border-t border-white/15 bg-white px-3 py-2 text-[#667085] lg:hidden">
    {visibleSections.filter((section) => ["overview", "content", "generate", "inbox"].includes(section.id)).map((section) => (
      <button key={section.id} type="button" aria-current={active.id === section.id ? "page" : undefined}
        onClick={() => select(section.id)} className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2478FF] ${active.id === section.id ? "bg-[#EEF5FF] text-[#1768E8]" : "hover:bg-slate-50"}`}>
        <SectionIcon name={section.id} className="h-4 w-4 shrink-0" />{section.id === "content" ? "Calendar" : section.id === "generate" ? "Create" : section.label}
      </button>
    ))}
  </nav>
</header>

      <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[236px_minmax(0,1fr)] xl:grid-cols-[258px_minmax(0,1fr)]">
        {/* QUIET LEFT RAIL */}
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] flex-col border-r border-[#E4EAF2] bg-[#FAFBFD] lg:flex">
          {sidebar}
        </aside>

        {/* ACTIVE WORKSPACE */}
        <main id="workspace-main" className="min-w-0">
          <div
            className={`mx-auto ${
              active.id === "content" ? "max-w-none" : "max-w-[1480px]"
            } ${["inbox", "team"].includes(active.id) ? "px-3 py-4 sm:px-4 lg:px-5" : "px-4 py-6 sm:px-5 md:py-8 lg:px-7 xl:px-9"}`}
          >
            {/* CONTEXT BAR */}
            {["inbox", "team"].includes(active.id) ? <h1 className="sr-only">{active.title}</h1> : (
            <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-[#E1E8F1] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF5FF] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#1768E8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1768E8]" />
                    {active.eyebrow}
                  </span>
                  {active.id === "generate" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0B1220] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-white">
                      <SparkMark className="h-2.5 w-2.5" /> AI assisted
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-[29px] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1220] sm:text-[34px] md:text-[39px]">
                  {active.title}
                </h1>
                <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[#667085]">
                  {active.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 sm:flex">
                  <button
                    type="button"
                    onClick={() => select("content")}
                    className={`rounded-[10px] px-3 py-2 text-[10px] font-semibold transition ${
                      active.id === "content"
                        ? "bg-white text-[#1768E8] shadow-sm"
                        : "text-[#667085] hover:text-[#344054]"
                    }`}
                  >
                    Content
                  </button>
                  <button
                    type="button"
                    onClick={() => select(aiTarget)}
                    className={`rounded-[10px] px-3 py-2 text-[10px] font-semibold transition ${
                      active.id === "generate" || active.id === "knowledge"
                        ? "bg-white text-[#1768E8] shadow-sm"
                        : "text-[#667085] hover:text-[#344054]"
                    }`}
                  >
                    AI Studio
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Keep visited panels mounted so navigation preserves local work. */}
            {visibleSections.map((section) => {
              if (section.id !== active.id && !mountedInsightViews.has(section.id)) return null;
              return <div key={section.id} hidden={active.id !== section.id}>
                {section.content}
              </div>;
            })}

            {active.id !== "inbox" && <div className="mt-8 flex items-center justify-between border-t border-[#E4E9F0] pt-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#A0A8B4]">
              <span>Showwork · Client Content Workspace</span>
              <span className="hidden sm:inline">{clientName}</span>
            </div>}
          </div>
        </main>
           </div>

      <WorkspaceTour
        availableSections={visibleSections.map((section) => section.id)}
      />

      <style jsx global>{`
        @keyframes workspaceEnter {
          from {
            opacity: 0;
            transform: translateY(7px) scale(0.997);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export type { WorkspaceSection };
