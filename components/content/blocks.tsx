import Link from "next/link";

import JsonLd from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/structured-data";
import { FREE_APP_LIMIT, PRICE_SENTENCE } from "@/lib/pricing";

/** Section with an h2 — the heading level Google uses to build the outline. */
export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 first:mt-0">
      <h2
        className="text-2xl font-bold text-[#1A1A2E] pb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[#4A4A68] leading-relaxed">{children}</div>
    </section>
  );
}

export function Callout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="my-7 rounded-2xl border border-[#6C5CE7]/25 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6C5CE7]">{label}</p>
      <div className="mt-2 text-[#4A4A68] leading-relaxed space-y-3">{children}</div>
    </aside>
  );
}

export type CompareRow = {
  /** What is being compared — one dimension per row. */
  dimension: string;
  hiredrop: string;
  rival: string;
};

/**
 * Two-column comparison. Wrapped in its own horizontal scroll container so a
 * long row never makes the whole page scroll sideways on a phone.
 */
export function CompareTable({
  rivalName,
  rows,
  sourceNote,
}: {
  rivalName: string;
  rows: CompareRow[];
  /** Where the rival's column came from, and when it was checked. Required — an
   *  unsourced comparison table is how comparative advertising gets you sued. */
  sourceNote: React.ReactNode;
}) {
  return (
    <div className="my-7">
      <div className="overflow-x-auto rounded-2xl border border-[#E8E8F0] bg-white">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-[#E8E8F0] text-left">
              <th className="px-5 py-4 font-semibold text-[#8A8AA3] w-[30%]">&nbsp;</th>
              <th className="px-5 py-4 font-semibold text-[#6C5CE7]">HireDrop</th>
              <th className="px-5 py-4 font-semibold text-[#1A1A2E]">{rivalName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dimension} className="border-b border-[#F1F1F6] last:border-0 align-top">
                <th scope="row" className="px-5 py-4 text-left font-semibold text-[#1A1A2E]">
                  {row.dimension}
                </th>
                <td className="px-5 py-4 text-[#4A4A68]">{row.hiredrop}</td>
                <td className="px-5 py-4 text-[#6B6B8A]">{row.rival}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[#8A8AA3] leading-relaxed">{sourceNote}</p>
    </div>
  );
}

/** Numbered steps for the how-to guides. */
export function Steps({ steps }: { steps: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="my-7 space-y-4">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="rounded-2xl border border-[#E8E8F0] bg-white p-5 flex gap-4"
        >
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#EEE9FF] text-[#6C5CE7] font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <div>
            <h3 className="font-semibold text-[#1A1A2E]">{step.title}</h3>
            <div className="mt-1.5 text-[#4A4A68] leading-relaxed space-y-2">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Page-level FAQ. Emits FAQPage markup for its own questions, which is what gets
 * the answers expanded directly in the search result.
 */
export function FaqBlock({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section className="mt-12">
      <JsonLd data={faqPageSchema(faqs)} />
      <h2
        className="text-2xl font-bold text-[#1A1A2E] pb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Questions people ask
      </h2>
      <div className="mt-5 space-y-4">
        {faqs.map((faq) => (
          <div key={faq.q} className="rounded-2xl border border-[#E8E8F0] bg-white p-5">
            <h3 className="font-semibold text-[#1A1A2E]">{faq.q}</h3>
            <p className="mt-2 text-sm text-[#4A4A68] leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Closing CTA. Free allowance leads — it is the only thing that needs no trust. */
export function CtaBand({ headline }: { headline: string }) {
  return (
    <section className="mt-14 rounded-[20px] bg-[#13132B] p-7 sm:p-9 text-center">
      <h2
        className="text-2xl sm:text-3xl font-bold text-white pb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {headline}
      </h2>
      <p className="mt-3 text-[#B9B9D0] max-w-xl mx-auto leading-relaxed">
        Your first {FREE_APP_LIMIT} applications are free — no card. After that,{" "}
        {PRICE_SENTENCE}, cancel in one click.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-block bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white font-semibold px-7 py-3 rounded-[10px] transition"
      >
        Start applying
      </Link>
    </section>
  );
}

/** Internal links — how a new page gets crawled and how it passes signal on. */
export function RelatedLinks({
  links,
  title = "Keep reading",
  /** Hubs already introduce their card grids with a Section heading. */
  headingHidden = false,
}: {
  links: { title: string; description: string; href: string }[];
  title?: string;
  headingHidden?: boolean;
}) {
  return (
    <section className={headingHidden ? "mt-5" : "mt-12"}>
      {headingHidden ? null : (
        <h2
          className="text-2xl font-bold text-[#1A1A2E] pb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h2>
      )}
      <div className={`grid gap-4 sm:grid-cols-2 ${headingHidden ? "" : "mt-5"}`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="feature-card rounded-2xl border border-[#E8E8F0] bg-white p-5 block"
          >
            <h3 className="font-semibold text-[#1A1A2E]">{link.title}</h3>
            <p className="mt-1.5 text-sm text-[#6B6B8A] leading-relaxed">{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
