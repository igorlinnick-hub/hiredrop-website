import ContentLayout from "@/components/content/ContentLayout";
import { CtaBand, RelatedLinks, Section } from "@/components/content/blocks";
import { ALTERNATIVES, GUIDES } from "@/lib/content-index";
import { pageMetadata } from "@/lib/seo";

const PATH = "/guides";

export const metadata = pageMetadata({
  title: "Job search guides — auto-apply, ATS screening and what actually works",
  description:
    "Practical guides from the people building an applying engine: how Indeed automation really behaves, and what Greenhouse, Lever and Ashby do with your resume once you hit send.",
  path: PATH,
});

export default function Page() {
  return (
    <ContentLayout
      kicker="Guides"
      title="Guides from inside the application pipeline"
      lead="We fill job application forms for a living, so these aren't summaries of other people's advice. They're what the forms and the boards actually do — including the parts that cost us weeks to learn."
      crumbs={[{ name: "Guides", path: PATH }]}
    >
      <Section title="The guides">
        <p>
          Two so far, both written for someone actively applying rather than reading about
          applying. More as we learn things worth writing down.
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

      <Section title="Comparing the tools instead?">
        <p>
          If you have already decided to automate and are choosing between products, the
          comparisons are the faster read.
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

      <CtaBand headline="Skip the reading — apply to 40 jobs free" />
    </ContentLayout>
  );
}
