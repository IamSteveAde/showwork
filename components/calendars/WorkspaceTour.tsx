"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TourSectionId =
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

type WorkspaceTourProps = {
  availableSections: TourSectionId[];
};

type TourStep = {
  id: TourSectionId;
  eyebrow: string;
  title: string;
  description: string;
  final?: boolean;
};

const TOUR_STORAGE_PREFIX = "showwork:workspace-tour:v1:";

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    eyebrow: "Workspace",
    title: "Your workspace at a glance",
    description: "See upcoming content, messages and leads in one place.",
  },
  {
    id: "knowledge",
    eyebrow: "AI Studio · Knowledge",
    title: "Add business knowledge",
    description:
      "Upload brand details and documents so AI understands your client.",
  },
  {
    id: "generate",
    eyebrow: "AI Studio · Generate",
    title: "Create with AI",
    description:
      "Turn your client’s brand details into content ideas, drafts and calendars.",
  },
  {
    id: "content",
    eyebrow: "Content Workspace",
    title: "Plan your content",
    description:
      "Schedule posts, add creative and manage client feedback and approvals.",
  },
  {
    id: "channels",
    eyebrow: "Publishing",
    title: "Connect your channels",
    description:
      "Link social accounts and WhatsApp to publish, track results and manage messages.",
  },
  {
    id: "publish",
    eyebrow: "Publishing",
    title: "Share the client plan",
    description:
      "Update the workspace presentation and publish it for your client to review.",
  },
  {
    id: "team",
    eyebrow: "Collaboration",
    title: "Invite your team",
    description: "Add teammates and choose what each person can access.",
  },
  {
    id: "access",
    eyebrow: "Client",
    title: "Set up client access",
    description:
      "Give your client a secure place to review content and leave feedback.",
  },
  {
    id: "analytics",
    eyebrow: "Insights",
    title: "Track your results",
    description: "See how content performs and find opportunities to improve.",
  },
  {
    id: "inbox",
    eyebrow: "Leads & Messages",
    title: "Manage messages",
    description:
      "Read and reply to conversations from connected social accounts and WhatsApp.",
  },
  {
    id: "leads",
    eyebrow: "Leads & Messages · Leads",
    title: "Follow up with leads",
    description:
      "Save contacts, track opportunities and keep follow-ups organized.",
  },
  {
    id: "knowledge",
    eyebrow: "Get started",
    title: "You’re ready to start",
    description:
      "Add your client’s brand details, then create your first content calendar.",
    final: true,
  },
];

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function WorkspaceTour({
  availableSections,
}: WorkspaceTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [mobile, setMobile] = useState(false);
  const [position, setPosition] = useState({ left: 260, top: 88 });
  const cardRef = useRef<HTMLDivElement>(null);

  const availableSectionsKey = availableSections.join("|");

  const steps = useMemo(() => {
    const available = new Set(availableSections);

    const sectionSteps = TOUR_STEPS.filter(
      (step) => !step.final && available.has(step.id),
    );
    if (!sectionSteps.length) return [];

    const finalStep = TOUR_STEPS.find((step) => step.final)!;
    const startSection = ["knowledge", "content", "overview"].find((id) =>
      available.has(id as TourSectionId),
    ) as TourSectionId | undefined;
    return [
      ...sectionSteps,
      { ...finalStep, id: startSection ?? sectionSteps[0].id },
    ];
  }, [availableSectionsKey]);

  const initializedRef = useRef(false);

  const currentStep = steps[stepIndex];

  const storageKey = useMemo(() => {
    if (typeof window === "undefined") {
      return `${TOUR_STORAGE_PREFIX}unknown`;
    }

    return `${TOUR_STORAGE_PREFIX}${window.location.pathname}`;
  }, []);

  const isTestMode = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      new URLSearchParams(window.location.search).get("onboarding") === "test"
    );
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "completed");
    } catch {
      // Ignore localStorage failures.
    }

    setVisible(false);
    window.dispatchEvent(new Event("showwork-workspace-tour-finish"));
  }, [storageKey]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const navigateToStep = useCallback(
    (index: number) => {
      const nextStep = steps[index];

      if (!nextStep) {
        finish();
        return;
      }

      setStepIndex(index);
      window.dispatchEvent(
        new CustomEvent("showwork-workspace-navigate", {
          detail: { id: nextStep.id, tour: true },
        }),
      );
    },
    [finish, steps],
  );

  const next = useCallback(() => {
    if (!steps.length) {
      finish();
      return;
    }

    const nextIndex = stepIndex + 1;

    if (nextIndex >= steps.length) {
      finish();
      return;
    }

    navigateToStep(nextIndex);
  }, [finish, navigateToStep, stepIndex, steps.length]);

  useEffect(() => {
    if (!steps.length || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";

    try {
      const completed = window.localStorage.getItem(storageKey);

      if (!isLocalhost && !isTestMode && completed === "completed") {
        return;
      }
    } catch {
      // If localStorage is unavailable, continue with the tour.
    }

    const timer = window.setTimeout(
      () => {
        setStepIndex(0);
        setVisible(true);

        const firstStep = steps[0];

        if (!firstStep.final) {
          window.dispatchEvent(
            new CustomEvent("showwork-workspace-navigate", {
              detail: {
                id: firstStep.id,
                tour: true,
              },
            }),
          );
        }
      },
      isTestMode ? 0 : 650,
    );

    return () => {
      window.clearTimeout(timer);
      initializedRef.current = false;
    };
  }, [isTestMode, steps, storageKey]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, a, [contenteditable]")
      ) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [finish, next, visible]);

  useEffect(() => {
    if (!visible || !currentStep) return;
    const update = () => {
      const isMobile = window.innerWidth < 1024;
      setMobile(isMobile);
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour-target="${currentStep.id}"]`,
        ),
      );
      const target = targets.find(
        (element) =>
          element.getClientRects().length > 0 &&
          Boolean(element.closest("dialog")) === isMobile,
      );
      if (!target) return;
      const slot =
        target.parentElement?.querySelector<HTMLElement>("[data-tour-slot]") ??
        null;
      setAnchor(isMobile ? slot : null);
      const rect = target.getBoundingClientRect();
      const height = cardRef.current?.offsetHeight ?? 300;
      setPosition({
        left: Math.min(rect.right + 12, window.innerWidth - 332),
        top: Math.max(12, Math.min(rect.top, window.innerHeight - height - 12)),
      });
    };
    const timer = window.setTimeout(() => {
      update();
      cardRef.current
        ?.querySelector<HTMLButtonElement>("[data-tour-next]")
        ?.focus({ preventScroll: true });
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour-target="${currentStep.id}"]`,
        ),
      ).find((element) => element.getClientRects().length > 0);
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    }, 350);
    update();
    const observer = new ResizeObserver(update);
    if (cardRef.current) observer.observe(cardRef.current);
    let resizeTimer: number | undefined;
    const handleResize = () => {
      update();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(update, 350);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", update, true);
    window.addEventListener("showwork-workspace-tour-dismiss", finish);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("showwork-workspace-tour-dismiss", finish);
    };
  }, [visible, currentStep, finish]);

  if (!visible || !currentStep) {
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;
  const progress = `${stepIndex + 1} of ${steps.length}`;

  const card = (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Workspace tour"
      style={mobile ? undefined : position}
      className={
        mobile
          ? "relative my-2 w-full"
          : "fixed z-[80] w-[320px] max-h-[calc(100dvh-24px)] overflow-y-auto"
      }
      aria-live="polite"
    >
      <div className="rounded-2xl border border-[#DCE7F5] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-4">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#667085]">
            Quick tour <span className="mx-1 text-[#CBD5E1]">·</span> {progress}
          </span>
          <button
            type="button"
            onClick={skip}
            className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#667085] hover:bg-[#F2F5F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
            aria-label="Close onboarding"
          >
            <CloseIcon />
          </button>
        </div>
        <h2 className="mt-1 text-sm font-semibold leading-5 text-[#101828]">
          {currentStep.title}
        </h2>
        <p className="mt-1.5 text-xs leading-5 text-[#667085]">
          {currentStep.description}
        </p>
        <div className="mt-3 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={skip}
            className="min-h-11 rounded-lg px-1 text-xs font-medium text-[#667085] hover:text-[#344054] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => navigateToStep(stepIndex - 1)}
                className="min-h-11 rounded-lg px-2 text-xs font-medium text-[#475467] hover:bg-[#F2F5F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1768E8]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              data-tour-next
              onClick={next}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#1768E8] px-3 text-xs font-semibold text-white hover:bg-[#125CCF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1768E8]"
            >
              {isLastStep ? "Start" : "Next"}
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  if (mobile) return anchor ? createPortal(card, anchor) : null;
  return card;
}
