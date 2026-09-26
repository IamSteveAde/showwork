import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Media Content Workspace & Approval Calendar | Showwork",
  description:
    "Plan social media calendars, create AI-assisted content drafts and collect client approvals in one workspace built for social media managers and agencies.",
  keywords: ["social media content calendar", "client content approval", "social media agency workflow", "AI social content planning", "content workspace Nigeria"],
  alternates: { canonical: "/content-workspace" },
  openGraph: { type: "website", siteName: "Showwork", title: "Social Media Content Workspace & Approval Calendar | Showwork", description: "Plan social media calendars, create AI-assisted content drafts and collect client approvals in one workspace built for social media managers and agencies.", url: "/content-workspace", images: ["/images/work.jpg"] },
  twitter: { card: "summary_large_image", title: "Social Media Content Workspace | Showwork", description: "Plan content, create AI-assisted drafts and manage client approvals in one place.", images: ["/images/work.jpg"] },
};

export default function ContentWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
