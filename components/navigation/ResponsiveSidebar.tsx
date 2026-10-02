"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import MobileDrawer, { NavigationToggle } from "./MobileDrawer";

export default function ResponsiveSidebar({
  children,
  desktopClassName,
  drawerClassName,
  label,
}: {
  children: ReactNode;
  desktopClassName: string;
  drawerClassName: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const closeOnNavigation = (event: MouseEvent) => {
      if ((event.target as HTMLElement)?.closest("dialog a")) setOpen(false);
    };
    document.addEventListener("click", closeOnNavigation, true);
    return () => document.removeEventListener("click", closeOnNavigation, true);
  }, [open]);
  return (
    <>
      {/* Keep the trigger above fixed headers, outside page stacking contexts. */}
      {mounted &&
        createPortal(
          <div className="fixed left-3 top-3 z-[101] text-white lg:hidden">
            <NavigationToggle
              open={open}
              onClick={() => setOpen(true)}
              label={label}
            />
          </div>,
          document.body,
        )}
      <aside className={desktopClassName}>{children}</aside>
      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        className={drawerClassName}
      >
        {children}
      </MobileDrawer>
    </>
  );
}
