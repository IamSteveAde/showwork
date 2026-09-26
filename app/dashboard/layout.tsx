import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Dashboard | Showwork",
  description: "Manage your creative projects, portfolio, clients and content workspaces in Showwork.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
