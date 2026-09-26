import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://useshowwork.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard/",
        "/api/",
        "/login",
        "/signup",
        "/start",
        "/welcome",
        "/forgot-password",
        "/reset-password",
        "/social-calendar/",
        "/invites/",
        "/managed-invites/",
        "/calendars/invites/",
        "/testimonial/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
