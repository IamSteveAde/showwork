import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Project Delivery for Creators | Showwork",
  description:
    "Present creative projects in a branded client portal. Share files, collect feedback and approvals, and keep every delivery organized with Showwork.",
  keywords: ["client delivery for photographers", "creative project client portal", "client proofing and approvals", "video delivery platform", "project delivery Nigeria"],
  alternates: { canonical: "/delivery" },
  openGraph: { type: "website", siteName: "Showwork", title: "Client Project Delivery for Creators | Showwork", description: "Present creative projects in a branded client portal. Share files, collect feedback and approvals, and keep every delivery organized with Showwork.", url: "/delivery", images: ["/images/work.jpg"] },
  twitter: { card: "summary_large_image", title: "Client Project Delivery for Creators | Showwork", description: "A branded client portal for creative files, feedback and approvals.", images: ["/images/work.jpg"] },
};

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
