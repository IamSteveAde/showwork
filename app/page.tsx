import type { Metadata } from "next";
import { getCurrentCreator } from "@/lib/auth";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Showwork | Intelligent Marketing Operations Platform",
  description:
    "Bring marketing operations together: business knowledge, content creation, collaboration, supported publishing, customer conversations, and performance insights.",
  keywords: [
    "marketing operations platform",
    "marketing team collaboration",
    "business knowledge",
    "content planning",
    "content approval workflow",
    "Marketing Workspace",
    "Showwork",
  ],
  openGraph: {
    title: "Showwork | Intelligent Marketing Operations Platform",
    description:
      "Bring marketing operations together: business knowledge, content creation, collaboration, supported publishing, customer conversations, and performance insights.",
    url: "/",
    siteName: "Showwork",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/images/work.jpg",
        width: 1200,
        height: 630,
        alt: "Showwork marketing operations platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Showwork | Intelligent Marketing Operations Platform",
    description:
      "Bring marketing operations together: business knowledge, content creation, collaboration, supported publishing, customer conversations, and performance insights.",
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
