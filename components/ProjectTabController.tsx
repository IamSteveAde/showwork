"use client";

import { useEffect, useState } from "react";

type WorkspaceView =
  | "overview"
  | "work"
  | "access"
  | "team"
  | "activity";

const VIEWS: WorkspaceView[] = [
  "overview",
  "work",
  "access",
  "team",
  "activity",
];

function readViewFromUrl(): WorkspaceView {
  if (typeof window === "undefined") {
    return "overview";
  }

  const params = new URLSearchParams(window.location.search);
  const value = params.get("view");

  return value && VIEWS.includes(value as WorkspaceView)
    ? (value as WorkspaceView)
    : "overview";
}

export default function ProjectTabController({
  initialView,
}: {
  initialView: WorkspaceView;
}) {
  const [activeView, setActiveView] =
    useState<WorkspaceView>(initialView);

  useEffect(() => {
    const apply = (view: WorkspaceView) => {
      setActiveView(view);

      document
        .querySelectorAll<HTMLElement>("[data-workspace-panel]")
        .forEach((panel) => {
          panel.hidden = panel.dataset.workspacePanel !== view;
        });

      document
        .querySelectorAll<HTMLElement>("[data-workspace-nav]")
        .forEach((item) => {
          const isActive =
            item.dataset.workspaceNav === view;

          item.dataset.active = isActive
            ? "true"
            : "false";

          if (isActive) {
            item.setAttribute("aria-current", "page");
          } else {
            item.removeAttribute("aria-current");
          }
        });

      document
        .querySelectorAll<HTMLElement>("[data-workspace-title]")
        .forEach((title) => {
          title.hidden =
            title.dataset.workspaceTitle !== view;
        });
    };

    // Apply the current URL state immediately.
    apply(readViewFromUrl());

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      const link =
        target?.closest<HTMLAnchorElement>(
          "a[data-workspace-tab]",
        );

      if (!link) {
        return;
      }

      const view =
        link.dataset.workspaceTab as WorkspaceView | undefined;

      if (!view || !VIEWS.includes(view)) {
        return;
      }

      // IMPORTANT:
      // Prevent Next.js Link navigation completely.
      event.preventDefault();
      event.stopPropagation();

      const url = new URL(window.location.href);
      url.searchParams.set("view", view);

      window.history.pushState(
        { view },
        "",
        url.toString(),
      );

      apply(view);

      // Always start the new workspace view at the top.
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    };

    const onPopState = () => {
      apply(readViewFromUrl());
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className="sr-only"
      data-workspace-controller={activeView}
    />
  );
}