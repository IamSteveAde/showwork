"use client";

import type { ReactNode } from "react";

type WorkspaceSectionId =
  | "overview"
  | "content"
  | "team"
  | "analytics"
  | "access"
  | "channels"
  | "knowledge"
  | "generate"
  | "publish";

export default function WorkspaceActionButton({
  target,
  children,
  className,
}: {
  target: WorkspaceSectionId | string;
  children: ReactNode;
  className?: string;
}) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("showwork-workspace-navigate", {
        detail: { id: target },
      }),
    );
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
