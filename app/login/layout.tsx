import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign In | Showwork", description: "Sign in to your Showwork account to access your portfolio, project deliveries and client workspaces.", robots: { index: false, follow: false, noarchive: true } };
export default function LoginLayout({ children }: { children: React.ReactNode }) { return children; }
