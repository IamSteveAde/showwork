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
  title: "Showwork | Premium Portfolios & Client Delivery for Nigerian Creators",
  description:
    "Showwork helps Nigerian photographers, videographers, and content creators present — and price — their work like the premium brand it deserves to be. A professional portfolio, a password-protected client delivery, and Creativo, a community built around positioning and pricing with confidence. Free to start.",
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
    "how to charge more as a photographer",
    "creator community Nigeria",
    "Creativo",
    "Showwork",
  ],
    openGraph: {
    title: "Showwork | Present Your Work Like a Premium Brand",
    description:
      "A professional portfolio, a premium client delivery, and a community built to help Nigerian creators position themselves properly. Free to start.",
    url: "https://useshowwork.com",
    siteName: "Showwork",
    locale: "en_NG",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_APP_URL}/images/work.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Showwork | Present and Price Your Work Like a Premium Brand",
    description:
      "Stop sending Dropbox links. Deliver your client work — and your own portfolio — the way a premium brand would.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/images/work.jpg`],
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