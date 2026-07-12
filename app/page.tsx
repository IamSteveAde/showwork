import type { Metadata } from "next";
import HomeClient from "./HomeClient";

// Strong, Nigeria-targeted SEO. Title and description use language a
// Nigerian creator would actually type into Google, not generic SaaS
// copy — this is what actually drives ranking and click-through.
export const metadata: Metadata = {
  title: "Showwork by Spotlite Africa | Premium Client Delivery for Content Creators in Nigeria",
  description:
    "Showwork helps Nigerian photographers, videographers, and content creators deliver client work in a premium, password-protected showcase — not a messy WeTransfer or Dropbox link. ₦5,000 per project, live in minutes.",
  keywords: [
    "client delivery Nigeria",
    "content creator tools Nigeria",
    "photographer client delivery Nigeria",
    "videographer portfolio delivery",
    "send client work Nigeria",
    "WeTransfer alternative Nigeria",
    "Dropbox alternative for creators",
    "premium client presentation Lagos",
    "Spotlite Africa",
    "Showwork",
  ],
  openGraph: {
    title: "Showwork by Spotlite Africa",
    description:
      "A premium, password-protected showcase for the photos and films Nigerian creators deliver to clients. ₦5,000 per project.",
    url: "https://showwork.spotliteafrica.com",
    siteName: "Showwork",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Showwork by Spotlite Africa",
    description:
      "Stop sending Dropbox links. Deliver your client work in a premium showcase built for Nigerian creators.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <HomeClient />;
}