import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign In | Showwork", description: "Sign in to your Showwork creator account.", robots: { index: false, follow: false, noarchive: true } };
export default function LoginLayout({ children }: { children: React.ReactNode }) { return children; }
