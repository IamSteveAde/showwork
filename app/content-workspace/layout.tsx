import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Content, Leads & Analytics Workspace | Showwork",
  description:
    "Plan content with AI, collect approvals, publish to supported channels, manage conversations and leads, and track performance in a workspace for each client.",
  keywords: ["social media content calendar", "client content approval", "social media agency workflow", "AI social content planning", "content workspace Nigeria", "social media lead management", "social media analytics", "social media inbox"],
  alternates: { canonical: "/content-workspace" },
  openGraph: { type: "website", siteName: "Showwork", title: "Client Content, Leads & Analytics Workspace | Showwork", description: "Plan content with AI, collect approvals, publish to supported channels, manage conversations and leads, and track performance in a workspace for each client.", url: "/content-workspace", images: ["/images/work.jpg"] },
  twitter: { card: "summary_large_image", title: "Social Media Content Workspace | Showwork", description: "Plan content with AI, collect approvals, publish to supported channels, manage conversations and leads, and track performance in a workspace for each client.", images: ["/images/work.jpg"] },
};

export default function ContentWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
