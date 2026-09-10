// SEO surface — ONE place that knows the site's public URL map and how a page
// describes itself to Google.
//
// Why this exists: until 2026-09-09 the only metadata was a single block in
// app/layout.tsx, so every public page shared one title, one description and no
// canonical at all. `sitemap.ts` also listed its 8 URLs by hand, which means any
// page added later was invisible to crawlers until someone remembered to edit it.
// Both problems are solved by making PUBLIC_PAGES the single registry: the sitemap
// is generated from it, and each page builds its <head> from pageMetadata().

import type { Metadata } from "next";

export const SITE_URL = "https://hiredrop.io";
export const SITE_NAME = "HireDrop";

/** Used in JSON-LD and OG images — keep in sync with the landing copy. */
export const SITE_TAGLINE = "Apply to more jobs — without risking your account.";

type PublicPage = {
  /** Path, always leading-slash, never trailing — this is the canonical form. */
  path: string;
  /** Sitemap hints. `priority` is a weak signal but costs nothing to state. */
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

/**
 * Every URL we want indexed. Anything excluded in app/robots.ts must NOT appear
 * here (a sitemap that lists a disallowed URL is a Search Console error).
 */
export const PUBLIC_PAGES: PublicPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/alternatives", changeFrequency: "monthly", priority: 0.9 },
  { path: "/alternatives/lazyapply", changeFrequency: "monthly", priority: 0.8 },
  { path: "/alternatives/aiapply", changeFrequency: "monthly", priority: 0.8 },
  { path: "/guides", changeFrequency: "monthly", priority: 0.9 },
  { path: "/guides/auto-apply-indeed", changeFrequency: "monthly", priority: 0.8 },
  { path: "/guides/ats-resume-keywords", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/affiliate", changeFrequency: "monthly", priority: 0.6 },
  { path: "/signup", changeFrequency: "yearly", priority: 0.5 },
  { path: "/login", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * Build a page's <head>: unique title + description, a canonical URL (so the
 * `?ref=`/`?utm_` variants our own affiliate links produce don't split ranking
 * signals), and OG/Twitter cards pointing at the same page.
 *
 * `title` is the full <title> — we don't use a template, because the best
 * keyword order differs per page ("AIApply alternative" must lead, "FAQ" must not).
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
