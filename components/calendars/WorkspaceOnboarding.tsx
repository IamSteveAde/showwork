"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OnboardingStep =
  | "welcome"
  | "create"
  | "plan"
  | "client"
  | "submit";

type WorkspaceOnboardingProps = {
  isFirstWorkspace: boolean;
  hasExistingPlan: boolean;
  testMode?: boolean;
};

const STORAGE_KEY = "showwork:workspace-onboarding:v1";

const STEP_COPY: Record<
  Exclude<OnboardingStep, "welcome">,
  {
    title: string;
    description: string;
    button: string;
  }
> = {
  create: {
    title: "Create a client workspace",
    description:
      "Start by creating a dedicated workspace for one of your clients. This is where you’ll plan, organize and manage their content.",
    button: "Open workspace setup",
  },

  plan: {
    title: "Choose your workspace plan",
    description:
      "Choose the Content Workspace plan that fits how you manage your clients. Your first workspace includes a 3-day trial.",
    button: "Choose a plan",
  },

  client: {
    title: "Add your client",
    description:
      "Enter the name of the client this workspace is for. You’ll use this name to identify the workspace throughout Showwork.",
    button: "Go to client name",
  },

  submit: {
    title: "Create the workspace",
    description:
      "Everything is ready. Click Create workspace to finish setting up your client workspace.",
    button: "Go to create workspace",
  },
};

export default function WorkspaceOnboarding({
  isFirstWorkspace,
  hasExistingPlan,
  testMode = false,
}: WorkspaceOnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");

  /*
   * We intentionally keep the target position only for deciding
   * where the guide should sit.
   *
   * We do NOT render a target border, spotlight or overlay.
   */
  const [targetRect, setTargetRect] = useState<DOMRect | null>(
    null,
  );

  const totalSteps = hasExistingPlan ? 3 : 4;

  const numberedStep = useMemo(() => {
    switch (step) {
      case "create":
        return 1;

      case "plan":
        return hasExistingPlan ? 1 : 2;

      case "client":
        return hasExistingPlan ? 2 : 3;

      case "submit":
        return hasExistingPlan ? 3 : 4;

      default:
        return 0;
    }
  }, [hasExistingPlan, step]);

  const getTargetSelector = useCallback(() => {
    switch (step) {
      case "create":
        return '[data-onboarding="create-workspace"]';

      case "plan":
        return '[data-onboarding="plan"]';

      case "client":
        return '[data-onboarding="client-name"]';

      case "submit":
        return '[data-onboarding="submit"]';

      default:
        return null;
    }
  }, [step]);

  const updateTargetRect = useCallback(() => {
    const selector = getTargetSelector();

    if (!selector) {
      setTargetRect(null);
      return;
    }

    const target =
      document.querySelector<HTMLElement>(selector);

    if (!target) {
      setTargetRect(null);
      return;
    }

    setTargetRect(target.getBoundingClientRect());
  }, [getTargetSelector]);

  const scrollToTarget = useCallback(() => {
    const selector = getTargetSelector();

    if (!selector) {
      return;
    }

    const target =
      document.querySelector<HTMLElement>(selector);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    window.setTimeout(() => {
      updateTargetRect();
    }, 500);
  }, [getTargetSelector, updateTargetRect]);

  const finishOnboarding = useCallback(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        "completed",
      );
    } catch {
      // Ignore localStorage failures.
    }

    setVisible(false);
    setTargetRect(null);
  }, []);

  const skipOnboarding = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  const openWorkspaceSetup = useCallback(() => {
    const trigger =
      document.querySelector<HTMLElement>(
        '[data-onboarding="create-trigger"]',
      );

    if (!trigger) {
      return;
    }

    trigger.click();
  }, []);

  const goToClientInput = useCallback(() => {
    const input =
      document.querySelector<HTMLInputElement>(
        '[data-onboarding="client-name"]',
      );

    if (!input) {
      return;
    }

    input.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    window.setTimeout(() => {
      updateTargetRect();
      input.focus();
    }, 500);
  }, [updateTargetRect]);

  const goToSubmitButton = useCallback(() => {
    const button =
      document.querySelector<HTMLButtonElement>(
        '[data-onboarding="submit"]',
      );

    if (!button) {
      return;
    }

    button.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    window.setTimeout(() => {
      updateTargetRect();
    }, 500);
  }, [updateTargetRect]);

  const handlePrimaryAction = useCallback(() => {
    switch (step) {
      case "welcome": {
        setStep("create");

        window.setTimeout(() => {
          scrollToTarget();
        }, 100);

        return;
      }

      case "create": {
        openWorkspaceSetup();
        return;
      }

      case "plan": {
        const planContainer =
          document.querySelector<HTMLElement>(
            '[data-onboarding="plan"]',
          );

        if (!planContainer) {
          return;
        }

        planContainer.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        window.setTimeout(() => {
          updateTargetRect();
        }, 500);

        return;
      }

      case "client": {
        goToClientInput();
        return;
      }

      case "submit": {
        goToSubmitButton();
        return;
      }

      default:
        return;
    }
  }, [
    goToClientInput,
    goToSubmitButton,
    openWorkspaceSetup,
    scrollToTarget,
    step,
    updateTargetRect,
  ]);

  /*
   * Initial visibility
   */
  useEffect(() => {
    if (!isFirstWorkspace && !testMode) {
      return;
    }

    if (testMode) {
      setVisible(true);
      setStep("welcome");
      return;
    }

    try {
      const completed =
        window.localStorage.getItem(STORAGE_KEY);

      if (completed === "completed") {
        return;
      }
    } catch {
      // If localStorage is unavailable, continue.
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
      setStep("welcome");
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isFirstWorkspace, testMode]);

  /*
   * Keep the target position updated only so we can intelligently
   * position the guide.
   */
  useEffect(() => {
    if (!visible || step === "welcome") {
      setTargetRect(null);
      return;
    }

    updateTargetRect();

    const handleResize = () => {
      updateTargetRect();
    };

    const handleScroll = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener(
      "scroll",
      handleScroll,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );
    };
  }, [
    step,
    visible,
    updateTargetRect,
  ]);

  /*
   * Product events
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleWorkspaceFormOpened = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          stage?: "choose-plan" | "form";
        }>;

      if (
        customEvent.detail?.stage ===
        "form"
      ) {
        setStep("client");
      } else {
        setStep("plan");
      }
    };

    const handlePlanSelected = () => {
      setStep("client");
    };

    const handleClientNameChanged = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          hasValue?: boolean;
        }>;

      if (customEvent.detail?.hasValue) {
        setStep("submit");
      } else {
        setStep("client");
      }
    };

    const handleWorkspaceCreated = () => {
      finishOnboarding();
    };

    window.addEventListener(
      "showwork:workspace-form-opened",
      handleWorkspaceFormOpened,
    );

    window.addEventListener(
      "showwork:workspace-plan-selected",
      handlePlanSelected,
    );

    window.addEventListener(
      "showwork:client-name-changed",
      handleClientNameChanged,
    );

    window.addEventListener(
      "showwork:workspace-created",
      handleWorkspaceCreated,
    );

    return () => {
      window.removeEventListener(
        "showwork:workspace-form-opened",
        handleWorkspaceFormOpened,
      );

      window.removeEventListener(
        "showwork:workspace-plan-selected",
        handlePlanSelected,
      );

      window.removeEventListener(
        "showwork:client-name-changed",
        handleClientNameChanged,
      );

      window.removeEventListener(
        "showwork:workspace-created",
        handleWorkspaceCreated,
      );
    };
  }, [
    finishOnboarding,
    visible,
  ]);

  /*
   * Automatically bring the relevant part of the application
   * into view.
   *
   * Notice that we do NOT draw anything around it.
   */
  useEffect(() => {
    if (!visible || step === "welcome") {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToTarget();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    scrollToTarget,
    step,
    visible,
  ]);

  if (!visible) {
    return null;
  }

  /*
   * Welcome screen
   */
  if (step === "welcome") {
    return (
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="pointer-events-auto relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#0d0d0f]/[0.98] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8"
          role="dialog"
          aria-modal="false"
          aria-labelledby="workspace-onboarding-title"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#2478FF]/10 blur-[80px]" />

          <div className="relative">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF] shadow-[0_0_12px_rgba(36,120,255,0.8)]" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#68A4FF]">
                  Quick setup
                </span>
              </div>

              <button
                type="button"
                onClick={skipOnboarding}
                className="rounded-lg px-2 py-1.5 text-[10px] font-medium text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Skip
              </button>
            </div>

            <h2
              id="workspace-onboarding-title"
              className="text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[30px]"
            >
              Let’s set up your first client
              workspace.
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/45">
              We’ll guide you through the first
              few steps so you know exactly where
              to start.
            </p>

            <div className="mt-7 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2478FF]/10 text-[10px] font-semibold text-[#68A4FF]">
                  01
                </span>

                <div>
                  <p className="text-xs font-semibold text-white">
                    Create a client workspace
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-white/30">
                    A dedicated space for managing
                    one client’s content.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[10px] font-semibold text-white/45">
                  02
                </span>

                <div>
                  <p className="text-xs font-semibold text-white">
                    Add your client
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-white/30">
                    Enter the client name and create
                    the workspace.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2478FF] to-[#0052FF] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(36,120,255,0.20)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(36,120,255,0.28)] active:translate-y-0"
            >
              Let’s get started
              <span className="text-white/70">
                →
              </span>
            </button>

            {testMode && (
              <p className="mt-4 text-center text-[9px] uppercase tracking-[0.14em] text-[#68A4FF]/45">
                Local onboarding test mode
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
   * Guided state
   *
   * No overlay.
   * No spotlight.
   * No border.
   *
   * The guide is simply a floating assistant card.
   */

  const viewportWidth =
    typeof window !== "undefined"
      ? window.innerWidth
      : 1280;

  const viewportHeight =
    typeof window !== "undefined"
      ? window.innerHeight
      : 800;

  const isMobile = viewportWidth < 640;

  const cardWidth = isMobile
    ? Math.min(viewportWidth - 24, 360)
    : 340;

  const cardHeight = isMobile
    ? 190
    : 220;

  let cardLeft = 20;
  let cardTop = 20;

  if (isMobile) {
    /*
     * On mobile the guide becomes a compact bottom sheet.
     * The target remains visible above it.
     */
    cardLeft = 12;
    cardTop = Math.max(
      12,
      viewportHeight - cardHeight - 12,
    );
  } else if (targetRect) {
    const gap = 24;

    const rightSpace =
      viewportWidth -
      targetRect.right;

    const leftSpace =
      targetRect.left;

    /*
     * Prefer placing the guide beside the target.
     * It never draws anything around the target.
     */
    if (
      rightSpace >=
      cardWidth + gap + 20
    ) {
      cardLeft =
        targetRect.right + gap;
    } else if (
      leftSpace >=
      cardWidth + gap + 20
    ) {
      cardLeft =
        targetRect.left -
        cardWidth -
        gap;
    } else {
      /*
       * If neither side has enough space,
       * use a clean top-right floating position.
       *
       * This is important for wide sections like
       * the Create Workspace section.
       */
      cardLeft =
        viewportWidth -
        cardWidth -
        20;
    }

    const targetCenter =
      targetRect.top +
      targetRect.height / 2;

    cardTop =
      targetCenter -
      cardHeight / 2;

    cardTop = Math.max(
      20,
      Math.min(
        cardTop,
        viewportHeight -
          cardHeight -
          20,
      ),
    );
  }

  return (
    <div
      className="pointer-events-none fixed z-[102]"
      style={{
        left: `${cardLeft}px`,
        top: `${cardTop}px`,
        width: `${cardWidth}px`,
      }}
    >
      <div
        className="pointer-events-auto rounded-[20px] border border-white/[0.10] bg-[#0d0d0f]/[0.96] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-[18px]"
        style={{
          transition:
            "left 260ms ease, top 260ms ease, transform 260ms ease",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2478FF]" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#68A4FF]">
              Step {numberedStep} of{" "}
              {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={skipOnboarding}
            className="rounded-lg px-2 py-1 text-[10px] font-medium text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Skip
          </button>
        </div>

        <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.025em] text-white">
          {STEP_COPY[step].title}
        </h3>

        <p className="mt-1.5 text-[11px] leading-[1.65] text-white/40">
          {STEP_COPY[step].description}
        </p>

        <div
          className="mt-4 flex items-center gap-1.5"
          aria-label={`Step ${numberedStep} of ${totalSteps}`}
        >
          {Array.from({
            length: totalSteps,
          }).map((_, index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                index < numberedStep
                  ? "bg-[#2478FF]"
                  : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-3 text-xs font-semibold text-white transition-all hover:bg-[#1769EA] active:scale-[0.99]"
        >
          {STEP_COPY[step].button}

          <span className="text-white/55">
            →
          </span>
        </button>
      </div>
    </div>
  );
}