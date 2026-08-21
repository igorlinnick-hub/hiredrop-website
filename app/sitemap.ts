import type { MetadataRoute } from "next";

const BASE = "https://hiredrop.io";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/extension`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/affiliate`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/signup`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
