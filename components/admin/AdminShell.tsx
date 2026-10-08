"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  Activity,
  CalendarDays,
  BadgePercent,
  Handshake,
  Newspaper,
  Trophy,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";

const groups = [
  {
    label: "Workspace",
    links: [
      ["/admin", "Overview", LayoutDashboard],
      ["/admin/analytics", "Analytics", ChartNoAxesCombined],
      ["/admin/accounts", "Accounts", Users],
      ["/admin/activity", "Activity", Activity],
    ],
  },
  {
    label: "Business",
    links: [
      ["/admin/customers", "Customers", Users],
      ["/admin/social-calendars", "Content workspaces", CalendarDays],
      ["/admin/billing-offers", "Billing benefits", BadgePercent],
      ["/admin/partners", "Partners", Handshake],
    ],
  },
  {
    label: "Publishing & community",
    links: [
      ["/admin/blog", "Blog", Newspaper],
      ["/admin/creativo", "Creativo", Sparkles],
      ["/admin/spotlight", "Spotlight", Trophy],
    ],
  },
] as const;

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-shell min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="sticky top-0 z-[60] flex items-center justify-between border-b bg-white px-5 py-4 lg:hidden">
        <Link href="/admin" className="font-semibold">
          Showwork <span className="text-slate-400">/ Admin</span>
        </Link>
        <button
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-[57px] z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Link href="/admin" className="flex items-center gap-3 px-6 py-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Showwork
            <span className="block text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">
              Administration
            </span>
          </span>
        </Link>
        <nav
          aria-label="Admin navigation"
          className="flex-1 space-y-7 overflow-y-auto px-3 pb-6"
        >
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.links.map(([href, label, Icon]) => {
                  const active =
                    href === "/admin"
                      ? pathname === href
                      : pathname.startsWith(href) ||
                        (href === "/admin/accounts" &&
                          pathname.startsWith("/admin/creators"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t p-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-blue-600"
          >
            Open Showwork
            <ArrowUpRight size={16} />
          </Link>
          <p className="px-2 pt-2 text-xs text-slate-400">Admin workspace</p>
        </div>
      </aside>
      <div className="min-w-0 lg:ml-64">{children}</div>
    </div>
  );
}
