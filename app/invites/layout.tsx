import type { Metadata } from "next";
export const metadata: Metadata = { title: "Project Invitation | Showwork", description: "Accept an invitation to collaborate on a Showwork project.", robots: { index: false, follow: false, noarchive: true } };
export default function InvitesLayout({ children }: { children: React.ReactNode }) { return children; }
