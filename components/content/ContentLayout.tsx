import Link from "next/link";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export type Crumb = { name: string; path: string };

/**
 * Shell for the organic-search pages (comparisons, guides and their hubs).
 *
 * Deliberately matched to the landing page rather than the dashboard: same
 * `landing-grid` canvas on a single #F7F7FB ground, same Space Grotesk headings,
 * same Header/Footer. It is light-only for the same reason the landing page is —
 * Header/Footer hardcode their light palette, so a dark-aware body here would
 * seam against them.
 *
 * Visible breadcrumbs double as the BreadcrumbList markup, so the search result
 * shows "hiredrop.io › Alternatives › LazyApply" instead of a raw URL.
 */
export default function ContentLayout({
  kicker,
  title,
  lead,
  crumbs,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  crumbs: Crumb[];
  /** Human-readable "Updated" line. Pass the same date used in articleSchema. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, ...crumbs])} />
      <Header />
      <main className="flex-1 landing-grid bg-[#F7F7FB]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8">
          <nav aria-label="Breadcrumb" className="mb-7">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-[#8A8AA3]">
              <li>
                <Link href="/" className="hover:text-[#6C5CE7] transition-colors">
                  Home
                </Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  {i === crumbs.length - 1 ? (
                    <span className="text-[#6B6B8A]">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.path} className="hover:text-[#6C5CE7] transition-colors">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <p className="text-sm font-semibold uppercase tracking-wider text-[#6C5CE7]">
            {kicker}
          </p>
          <h1
            className="mt-3 text-3xl sm:text-[40px] font-bold text-[#1A1A2E] leading-[1.15] pb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {title}
          </h1>
          <p className="mt-5 text-lg text-[#4A4A68] leading-relaxed">{lead}</p>
          {updated ? (
            <p className="mt-4 text-sm text-[#8A8AA3]">Updated {updated}</p>
          ) : null}
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">{children}</div>
      </main>
      <Footer />
    </>
  );
}
