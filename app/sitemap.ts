import type { MetadataRoute } from "next";

import { PUBLIC_PAGES, absoluteUrl } from "@/lib/seo";

// Generated from PUBLIC_PAGES in lib/seo.ts so a new public page can't be added
// without entering the sitemap. It used to be a hand-written list, which is how
// pages stay uncrawled for weeks.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
