"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export function NavigationToggle({
  open,
  onClick,
  label = "navigation",
}: {
  open: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`${open ? "Close" : "Open"} ${label}`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-current/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

export default function MobileDrawer({
  open,
  onClose,
  children,
  label,
  className = "bg-white text-slate-900",
  breakpoint = "lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  className?: string;
  breakpoint?: "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      setVisible(false);
      const timer = window.setTimeout(() => dialog.close(), 300);
      return () => window.clearTimeout(timer);
    }
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setVisible(true));
    const media = window.matchMedia(
      `(min-width: ${breakpoint === "md" ? 768 : 1024}px)`,
    );
    const closeAtDesktop = () => {
      if (media.matches) closeRef.current();
    };
    media.addEventListener("change", closeAtDesktop);
    closeAtDesktop();
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", closeAtDesktop);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, breakpoint]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative flex h-full w-[min(320px,calc(100vw-48px))] flex-col shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${visible ? "translate-x-0" : "-translate-x-full"} ${className}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-current/10 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <span className="text-sm font-semibold">{label}</span>
          <button
            autoFocus
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-current/10 focus-visible:outline focus-visible:outline-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
