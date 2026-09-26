import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Builder for Photographers & Creators | Showwork",
  description:
    "Build and share a polished online portfolio for your creative work. Show projects, testimonials and services with a professional portfolio site from Showwork.",
  keywords: ["photographer portfolio builder", "videographer portfolio website", "online portfolio for creatives", "creative portfolio Nigeria", "portfolio website for designers"],
  alternates: { canonical: "/portfolio" },
  openGraph: { type: "website", siteName: "Showwork", title: "Portfolio Builder for Photographers & Creators | Showwork", description: "Build and share a polished online portfolio for your creative work. Show projects, testimonials and services with Showwork.", url: "/portfolio", images: ["/images/work.jpg"] },
  twitter: { card: "summary_large_image", title: "Creative Portfolio Builder | Showwork", description: "Create a professional online portfolio for your creative work.", images: ["/images/work.jpg"] },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
