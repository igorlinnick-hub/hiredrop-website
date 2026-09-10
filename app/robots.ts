import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/onboarding/",
        "/auth/",
        "/preview/",
        // /extension and /extension/connect both redirect to /login for a
        // signed-out visitor — a crawler only ever sees the redirect.
        "/extension",
      ],
    },
    sitemap: "https://hiredrop.io/sitemap.xml",
  };
}
