import type { Metadata } from "next";
export const metadata: Metadata = { title: "Welcome | Showwork", description: "Choose the Showwork tools that fit your creative business.", robots: { index: false, follow: false, noarchive: true } };
export default function WelcomeLayout({ children }: { children: React.ReactNode }) { return children; }
