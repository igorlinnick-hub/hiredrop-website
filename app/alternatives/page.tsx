import ContentLayout from "@/components/content/ContentLayout";
import { CtaBand, RelatedLinks, Section } from "@/components/content/blocks";
import { ALTERNATIVES, GUIDES } from "@/lib/content-index";
import { MONTHLY_PRICE, WEEKLY_PRICE } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

const PATH = "/alternatives";

export const metadata = pageMetadata({
  title: "HireDrop vs other auto-apply tools — honest comparisons",
  description:
    "Side-by-side comparisons of HireDrop against LazyApply and AIApply: where applications run, daily limits, per-job tailoring, billing, and which tool fits which kind of job search.",
  path: PATH,
});

export default function Page() {
  return (
    <ContentLayout
      kicker="Comparisons"
      title="HireDrop vs other auto-apply tools"
      lead="Written the way we'd want to read them: what each product actually does, where the other one is the better buy, and every number sourced to the vendor's own page with the date we checked it."
      crumbs={[{ name: "Alternatives", path: PATH }]}
    >
      <Section title="Start here">
        <p>
          Most auto-apply tools differ on three things, and everything else is marketing. Where the
          applications are submitted from — your browser or someone&apos;s server. Whether you see
          each one before it sends. And whether the resume and cover letter are written for that
          specific posting or reused.
        </p>
        <p>
          HireDrop&apos;s answers: your browser, yes by default, and written per posting — up to 30
          applications a day, {WEEKLY_PRICE}/week or {MONTHLY_PRICE}/month. The comparisons below
          are where that lands against the alternatives.
        </p>
      </Section>

      <RelatedLinks
        headingHidden
        links={ALTERNATIVES.map((entry) => ({
          title: entry.title,
          description: entry.description,
          href: entry.path,
        }))}
      />

      <Section title="Guides, if you're still deciding how to search">
        <p>
          These two explain the machinery underneath every tool on this page — useful whether you
          automate or not.
        </p>
      </Section>

      <RelatedLinks
        headingHidden
        links={GUIDES.map((entry) => ({
          title: entry.title,
          description: entry.description,
          href: entry.path,
        }))}
      />

      <CtaBand headline="Or just try it — 40 applications, no card" />
    </ContentLayout>
  );
}
