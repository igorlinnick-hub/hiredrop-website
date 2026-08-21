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
        "/extension/connect",
      ],
    },
    sitemap: "https://hiredrop.io/sitemap.xml",
  };
}
