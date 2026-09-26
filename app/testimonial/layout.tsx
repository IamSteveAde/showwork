import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leave a Client Testimonial | Showwork",
  description: "Share feedback about your experience working with a Showwork creator.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function TestimonialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
