import type { Metadata } from "next";
import { getCurrentCreator } from "@/lib/auth";
import HomeClient from "./HomeClient";

// Strong, Nigeria-targeted SEO. Title and description use language a
// Nigerian creator would actually type into Google, not generic SaaS
// copy — this is what actually drives ranking and click-through.
// Positioning matches the actual product now: premium positioning and
// pricing power for creators, not just "a delivery tool" — and the
// current subscription model (free to start) rather than the old flat
// one-time fee.
export const metadata: Metadata = {
  title: "Showwork | Portfolios, Client Delivery & Content Workspaces",
  description:
    "Build a portfolio, deliver client projects, plan social media content and manage approvals in one platform for Nigerian creators, agencies and creative teams.",
  keywords: [
    "client delivery Nigeria",
    "creator portfolio Nigeria",
    "content creator tools Nigeria",
    "photographer client delivery Nigeria",
    "videographer portfolio delivery",
    "send client work Nigeria",
    "WeTransfer alternative Nigeria",
    "Dropbox alternative for creators",
    "premium client presentation Lagos",
    "social media content approval platform",
    "creative agency project management Nigeria",
    "creator community Nigeria",
    "Creativo",
    "Showwork",
  ],
    openGraph: {
    title: "Showwork | The Creator Business Platform",
    description:
      "Build a creative portfolio, deliver client projects, plan social content and grow your creative business with Showwork.",
    url: "/",
    siteName: "Showwork",
    locale: "en_NG",
    type: "website",
    images: [{ url: "/images/work.jpg", width: 1200, height: 630, alt: "Showwork creator business platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Showwork | Portfolios, Project Delivery & Content Planning",
    description:
      "One platform for your portfolio, professional client delivery, social media calendar, content approvals and creative community.",
    images: ["/images/work.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  // No forced redirect — someone might genuinely want to look at
  // their own marketing homepage even while logged in (checking
  // current copy, sharing the link, etc). Instead, just tell the
  // page whether they're logged in, so it can offer a direct
  // "Go to dashboard" option rather than deciding for them.
  const creator = await getCurrentCreator();

  return <HomeClient isLoggedIn={!!creator} />;
}
