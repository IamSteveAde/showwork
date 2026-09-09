"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";

export default function PublishTrigger({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const openPublishModal = useCallback(() => {
    const container = document.getElementById("publish");
    if (!container) return;

    const candidates = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button")
    );

    const publishButton = candidates.find((button) => {
      const text = (button.textContent || "").trim().toLowerCase();
      return (
        text.includes("publish") ||
        text.includes("go live") ||
        text.includes("make live")
      );
    });

    if (publishButton) {
      publishButton.click();
      return;
    }

    // Fallback for a publish control rendered as a link/button-like element.
    const interactive = Array.from(
      container.querySelectorAll<HTMLElement>("a, [role='button']")
    );
    const publishControl = interactive.find((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      return (
        text.includes("publish") ||
        text.includes("go live") ||
        text.includes("make live")
      );
    });

    if (publishControl) {
      publishControl.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    }
  }, []);

  return (
    <button
      type="button"
      onClick={openPublishModal}
      className={className}
      aria-label="Open publish controls"
    >
      {children ?? "Publish"}
    </button>
  );
}
