"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CircleHelp, X } from "lucide-react";

const STORAGE_KEY = "showwork:workspace-dashboard-tour:v2";
const START_EVENT = "showwork:workspace-dashboard-tour-start";

export function DashboardTourButton() {
  return (
    <button
      type="button"
      aria-label="Start dashboard tour"
      onClick={() => window.dispatchEvent(new Event(START_EVENT))}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#475467] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
    >
      <CircleHelp aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">Quick tour</span>
    </button>
  );
}

export default function WorkspaceOnboarding({
  isFirstWorkspace,
  hasExistingPlan,
  testMode = false,
}: {
  isFirstWorkspace: boolean;
  hasExistingPlan: boolean;
  testMode?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStartTimer = useRef<number | undefined>(undefined);
  const steps = [
    {
      id: "create",
      title: "Add a client",
      description:
        "Create a separate workspace for each client’s content and conversations.",
    },
    {
      id: "workspaces",
      title: "Find your clients",
      description: isFirstWorkspace
        ? "Your new workspaces will appear here. Select one to start working."
        : "Open a workspace to manage content, messages, leads and results.",
    },
    {
      id: "billing",
      title: "Manage your plan",
      description: hasExistingPlan
        ? "Check your trial, renewals and subscription settings in Billing."
        : "Choose a plan when you add your first client. Billing keeps your plan details together.",
    },
  ];
  const currentStep = steps[index];
  const finish = useCallback(() => {
    window.clearTimeout(autoStartTimer.current);
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "completed");
    } catch {
      /* Storage is optional. */
    }
  }, []);

  useEffect(() => {
    const start = () => {
      window.clearTimeout(autoStartTimer.current);
      setIndex(0);
      setVisible(true);
    };
    window.addEventListener(START_EVENT, start);
    window.addEventListener(
      "showwork:workspace-dashboard-tour-dismiss",
      finish,
    );
    const hostname = window.location.hostname;
    const local =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";
    let completed = false;
    try {
      completed = localStorage.getItem(STORAGE_KEY) === "completed";
    } catch {
      /* Storage is optional. */
    }
    const timer =
      local || testMode || (isFirstWorkspace && !completed)
        ? window.setTimeout(start, 600)
        : undefined;
    autoStartTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener(
        "showwork:workspace-dashboard-tour-dismiss",
        finish,
      );
    };
  }, [isFirstWorkspace, testMode, finish]);

  useEffect(() => {
    if (!visible) return;
    const slot = document.querySelector<HTMLElement>(
      `[data-dashboard-tour-slot="${currentStep.id}"]`,
    );
    setAnchor(slot);
    const target =
      currentStep.id === "create"
        ? document.querySelector<HTMLElement>(
            '[data-onboarding="create-trigger"]',
          )
        : document.querySelector<HTMLElement>(
            `[data-dashboard-tour="${currentStep.id}"]`,
          );
    target?.setAttribute("data-tour-highlight", "true");
    const timer = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
      cardRef.current
        ?.querySelector<HTMLButtonElement>("[data-dashboard-tour-next]")
        ?.focus({ preventScroll: true });
    }, 80);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.clearTimeout(timer);
      target?.removeAttribute("data-tour-highlight");
      window.removeEventListener("keydown", keydown);
    };
  }, [visible, index, currentStep.id, finish]);

  if (!visible || !anchor) return null;
  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Calendar dashboard tour"
      aria-live="polite"
      className="my-3 w-full max-w-sm rounded-2xl border border-blue-200 bg-white p-3 text-[#101828] shadow-sm sm:p-4"
    >
      <div className="flex min-h-7 items-center justify-between">
        <span className="text-xs text-[#667085]">
          Quick tour · {index + 1} of {steps.length}
        </span>
        <button
          type="button"
          aria-label="Close dashboard tour"
          onClick={finish}
          className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-[#667085] hover:bg-slate-50"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <h2 className="mt-1 text-sm font-semibold">{currentStep.title}</h2>
      <p className="mt-1.5 text-xs leading-5 text-[#667085]">
        {currentStep.description}
      </p>
      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={finish}
          className="min-h-11 rounded-lg px-1 text-xs font-medium text-[#667085]"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="min-h-11 rounded-lg px-2 text-xs font-medium text-[#475467] hover:bg-slate-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            data-dashboard-tour-next
            onClick={() =>
              index === steps.length - 1 ? finish() : setIndex(index + 1)
            }
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#1768E8] px-3 text-xs font-semibold text-white hover:bg-[#125CCF]"
          >
            {index === steps.length - 1 ? "Done" : "Next"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    anchor,
  );
}
