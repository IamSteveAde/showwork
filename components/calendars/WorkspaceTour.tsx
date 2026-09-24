"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TourSectionId =
  | "overview"
  | "content"
  | "team"
  | "analytics"
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
    title: "Your client's command center.",
    description:
      "This is where everything comes together. Get a quick view of what is planned, what is waiting for review, what has been approved and what needs your attention next.",
  },
  {
    id: "knowledge",
    eyebrow: "AI Studio · Knowledge",
    title: "Give AI the context behind the business.",
    description:
      "Start by uploading the client's business book, brand guidelines, product information, service details, briefs and other important documents. Showwork uses this knowledge to understand the business, its audience, positioning and voice. AI can also research the business weekly to keep its understanding fresh and surface relevant trends and developments.",
  },
  {
    id: "generate",
    eyebrow: "AI Studio · Generate",
    title: "Turn business knowledge into a content strategy.",
    description:
      "Once Showwork understands the business, use Generate to build content around that context. AI can turn the client's knowledge, goals and current insights into relevant content ideas and drafts instead of starting from a blank page.",
  },
  {
    id: "content",
    eyebrow: "Content Workspace",
    title: "Your entire content operation lives here.",
    description:
      "This is where the content calendar appears. AI-generated calendars can be created from the client's business context, or you can build the calendar manually when you want complete control. Plan posts, add creative, manage captions, review feedback and approvals, and preview how content will look across formats such as Instagram and TikTok before it goes live.",
  },
  {
    id: "channels",
    eyebrow: "Publishing",
    title: "Connect where the content will live.",
    description:
      "Connect the client's social channels so Showwork knows where approved content is going. Your content workflow can stay inside the workspace while the connected channels handle publishing.",
  },
  {
    id: "publish",
    eyebrow: "Publishing",
    title: "Move approved work toward publication.",
    description:
      "Use Publish to manage the final publishing workflow. Review what is ready, control what gets shared and keep the client-facing presentation aligned before content goes live.",
  },
  {
    id: "team",
    eyebrow: "Collaboration",
    title: "Bring the whole team into the workflow.",
    description:
      "Invite the people working on the account and give them the access they need. Everyone can work from the same client context instead of keeping strategy, content and feedback scattered across different tools.",
  },
  {
    id: "access",
    eyebrow: "Client",
    title: "Give your client a focused experience.",
    description:
      "Your client can have their own view of the work for reviewing content, giving feedback and following approvals, while your internal team keeps control of the production workspace.",
  },
  {
    id: "analytics",
    eyebrow: "Insights",
    title: "Understand what is happening across the workspace.",
    description:
      "Keep an eye on the content operation and quickly see what is moving, what is waiting and where attention is needed so the team can keep the account progressing.",
  },
  {
  id: "knowledge",
  eyebrow: "Get started",
  title: "Now build the client's content engine.",
  description:
    "You're ready to start. Upload the client's business documents so Showwork can understand the business, then let AI use that context and ongoing research to build a content calendar for you. You can use the AI-generated calendar as your starting point or create the calendar manually whenever you prefer.",
  final: true,
},
];

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
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

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M12 3 13.7 9.3 20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function WorkspaceTour({
  availableSections,
}: WorkspaceTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const availableSectionsKey = availableSections.join("|");

  const steps = useMemo(() => {
    const available = new Set(availableSections);

    return TOUR_STEPS.filter(
      (step) => step.final || available.has(step.id),
    );
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
      new URLSearchParams(window.location.search).get("onboarding") ===
      "test"
    );
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "completed");
    } catch {
      // Ignore localStorage failures.
    }

    setVisible(false);
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
        detail: {
          id: nextStep.id,
        },
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

    if (isTestMode) {
      setStepIndex(0);
      setVisible(true);

      const firstStep = steps[0];

      if (!firstStep.final) {
        window.dispatchEvent(
          new CustomEvent("showwork-workspace-navigate", {
            detail: {
              id: firstStep.id,
            },
          }),
        );
      }

      return;
    }

    try {
      const completed = window.localStorage.getItem(storageKey);

      if (completed === "completed") {
        return;
      }
    } catch {
      // If localStorage is unavailable, continue with the tour.
    }

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setVisible(true);

      const firstStep = steps[0];

      if (!firstStep.final) {
        window.dispatchEvent(
          new CustomEvent("showwork-workspace-navigate", {
            detail: {
              id: firstStep.id,
            },
          }),
        );
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
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

  if (!visible || !currentStep) {
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;
  const progress = `${stepIndex + 1} of ${steps.length}`;

  return (
    <div
      className="
        pointer-events-none
        fixed
        right-4
        top-[88px]
        z-[80]
        w-[min(400px,calc(100vw-32px))]
        sm:right-6
        lg:right-7
        xl:right-9
      "
      aria-live="polite"
    >
      <div
        className="
          pointer-events-auto
          overflow-hidden
          rounded-[22px]
          border
          border-[#DDE6F2]
          bg-white
          shadow-[0_22px_70px_rgba(15,23,42,0.14),0_4px_18px_rgba(15,23,42,0.05)]
        "
      >
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#1768E8]/[0.07] blur-3xl" />

          <div className="relative px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#EEF5FF] text-[#1768E8]">
                  <SparkIcon />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-[#1768E8]">
                      {currentStep.eyebrow}
                    </span>

                    <span className="h-1 w-1 shrink-0 rounded-full bg-[#CBD5E1]" />

                    <span className="shrink-0 text-[9px] font-semibold text-[#98A2B3]">
                      {progress}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={skip}
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-[#98A2B3]
                  transition-colors
                  hover:bg-[#F2F5F9]
                  hover:text-[#344054]
                "
                aria-label="Close onboarding"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-4">
              <h2 className="text-[17px] font-semibold leading-[1.2] tracking-[-0.025em] text-[#101828] sm:text-[18px]">
                {currentStep.title}
              </h2>

              <p className="mt-2 text-[11px] leading-[1.7] text-[#667085] sm:text-[12px]">
                {currentStep.description}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              {steps.map((step, index) => (
                <span
                  key={`${step.id}-${index}`}
                  className={`
                    h-1 flex-1 rounded-full transition-all duration-300
                    ${
                      index <= stepIndex
                        ? "bg-[#1768E8]"
                        : "bg-[#E8EDF4]"
                    }
                  `}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={skip}
                className="
                  rounded-lg
                  px-2
                  py-2
                  text-[10px]
                  font-semibold
                  text-[#98A2B3]
                  transition-colors
                  hover:text-[#475467]
                "
              >
                Skip tour
              </button>

              <button
                type="button"
                onClick={next}
                className="
                  inline-flex
                  min-h-[38px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#1768E8]
                  px-4
                  text-[11px]
                  font-bold
                  text-white
                  shadow-[0_8px_20px_rgba(23,104,232,0.20)]
                  transition-all
                  duration-150
                  hover:-translate-y-0.5
                  hover:bg-[#125CCF]
                  hover:shadow-[0_12px_26px_rgba(23,104,232,0.24)]
                  active:translate-y-0
                  sm:px-5
                "
              >
                {isLastStep ? "Get started" : "Next"}

                <ArrowRight />
              </button>
            </div>

            {isTestMode && (
              <p className="mt-3 text-center text-[8px] font-bold uppercase tracking-[0.14em] text-[#1768E8]/45">
                Local onboarding test mode
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}