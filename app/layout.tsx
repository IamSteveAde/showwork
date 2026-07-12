import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotlite Presenter",
  description: "Present your content deliveries like a premium brand.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
