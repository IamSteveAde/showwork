import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";

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
      <body>
        <Suspense fallback={null}>
          <RouteTransitionIndicator />
        </Suspense>
        {children}
      </body>
    </html>
  );
}