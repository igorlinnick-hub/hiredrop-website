// Structured data (schema.org / JSON-LD) builders.
//
// What this buys us: Google uses it to render the result as something richer than
// a blue link — the FAQ answers expand under /faq, the product shows a price range,
// breadcrumbs replace the raw URL. It is also how LLM-driven search (which reads
// markup before prose) learns what HireDrop is.
//
// Rule for everything in here: only claims that are true of the shipped product.
// Platform support mirrors STATUS_MATRIX.json in the workspace root — a platform
// that is DEFERRED there does not get named here.

import {
  FREE_APP_LIMIT,
  MONTHLY_USD,
  WEEKLY_USD,
} from "./pricing";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "./seo";

const ORG_ID = `${SITE_URL}/#organization`;
const APP_ID = `${SITE_URL}/#software`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    slogan: SITE_TAGLINE,
    description:
      "HireDrop is an AI job-application assistant. It finds matching roles, tailors a resume and cover letter for each one, and applies from the job seeker's own browser, with a review step before anything sends.",
  };
}

/**
 * The product itself. `offers` is an AggregateOffer because we sell the same
 * product on two cadences — stating one price would misrepresent the other.
 */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Job search automation",
    operatingSystem: "Chrome (desktop)",
    description:
      "AI auto-apply for job seekers. HireDrop searches Indeed, ZipRecruiter and company ATS boards, writes a tailored resume and cover letter per role, and submits the application from your own browser at a human pace.",
    featureList: [
      "Auto-apply from your own browser (no server bots)",
      "AI cover letter written per job",
      "ATS-tailored resume per job",
      "Review before send (Tap mode)",
      "Daily application caps that keep pacing human",
      "Indeed, ZipRecruiter, Greenhouse, Lever and Ashby support",
    ],
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: WEEKLY_USD,
      highPrice: MONTHLY_USD,
      offerCount: 2,
      offers: [
        {
          "@type": "Offer",
          name: "Weekly",
          price: WEEKLY_USD,
          priceCurrency: "USD",
          url: `${SITE_URL}/signup`,
        },
        {
          "@type": "Offer",
          name: "Monthly",
          price: MONTHLY_USD,
          priceCurrency: "USD",
          url: `${SITE_URL}/signup`,
        },
      ],
    },
    // The free allowance is part of the offer, so state it rather than implying
    // a trial period we don't actually run (it is a lifetime application count).
    award: `First ${FREE_APP_LIMIT} applications free, no card required`,
    publisher: { "@id": ORG_ID },
  };
}

export function faqPageSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

/** Breadcrumbs for nested pages — replaces the raw URL line in search results. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/**
 * Guides and comparisons. Dates are explicit strings, not `new Date()` — the
 * published date must not drift to "today" on every deploy, which is exactly
 * what Google treats as a freshness lie.
 */
export function articleSchema({
  headline,
  description,
  path,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}
