import Link from "next/link";

import ContentLayout from "@/components/content/ContentLayout";
import {
  Callout,
  CompareTable,
  CtaBand,
  FaqBlock,
  RelatedLinks,
  Section,
} from "@/components/content/blocks";
import JsonLd from "@/components/seo/JsonLd";
import { ALTERNATIVES, formatPublished, relatedTo } from "@/lib/content-index";
import { FREE_APP_LIMIT, MONTHLY_PRICE, WEEKLY_PRICE } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { articleSchema } from "@/lib/structured-data";

const PATH = "/alternatives/aiapply";
const PUBLISHED = ALTERNATIVES.find((entry) => entry.path === PATH)!.published;

const TITLE = "AIApply Alternative: HireDrop vs AIApply";
const DESCRIPTION =
  "AIApply is a suite of AI career tools with auto-apply sold as credit packs. HireDrop is one pipeline that finds roles, writes each application and submits from your browser. Where each one fits.";

export const metadata = pageMetadata({
  title: `${TITLE} — which one fits your search`,
  description: DESCRIPTION,
  path: PATH,
});

// AIApply's own pricing page does not publish dollar amounts (checked on this date),
// so this page states only what they describe about their model — never a price we
// would be guessing at.
const SOURCE_CHECKED = "September 9, 2026";

const ROWS = [
  {
    dimension: "What you're buying",
    hiredrop: "One job: applications go out for you, continuously, while you do something else.",
    rival: "A toolbox — resume builder, cover letter generator, resume scanner, interview prep, job board, translator — plus auto-apply.",
  },
  {
    dimension: "How auto-apply is sold",
    hiredrop: `Included. ${WEEKLY_PRICE}/week or ${MONTHLY_PRICE}/month covers applying, tailoring and cover letters.`,
    rival: "Described as credits sold in packs (for example 100 or 250), separate from the subscription.",
  },
  {
    dimension: "Where applications run",
    hiredrop: "Your own browser, your own IP, at a human pace. No server-side submission.",
    rival: "Their own pricing page doesn't state this; verify it before you rely on it.",
  },
  {
    dimension: "Review before send",
    hiredrop: "Default on. Tap mode shows each filled application; approve from your phone.",
    rival: "Not described as a step you control per application.",
  },
  {
    dimension: "Per-job tailoring",
    hiredrop: "Resume reshaped and a cover letter written from that posting's text, for every application.",
    rival: "Yes, via the resume and cover letter generators — run as tools you operate.",
  },
  {
    dimension: "Price visibility",
    hiredrop: "Both numbers are on the pricing page, with the monthly-equivalent arithmetic done for you.",
    rival: "Plan names appear publicly; amounts are shown in the signup flow rather than on the pricing page.",
  },
];

const FAQS = [
  {
    q: "What is the main difference between HireDrop and AIApply?",
    a: "Scope. AIApply gives you a set of AI tools to run yourself — build a resume, scan it, write a letter, prep for the interview — with auto-apply added on top as credits. HireDrop does one thing end to end: it watches the boards, writes each application, and submits it from your browser with your approval. If you want a workbench, that's AIApply. If you want the applications to simply happen, that's HireDrop.",
  },
  {
    q: "How much does AIApply cost?",
    a: `Their pricing page describes a subscription for the tool suite (monthly or annual, with an annual discount) and auto-apply credits sold in packs, but as of ${SOURCE_CHECKED} it does not publish the dollar amounts — you see them inside the signup flow. Check them there before comparing against anything on this page.`,
  },
  {
    q: "Do credits or a flat plan work out better?",
    a: "Credits are better if you apply in short bursts and want to stop spending entirely between them. A flat plan is better if you apply steadily, because the cost of the hundredth application is zero and you never pause the search to buy more. Most searches that actually end in an offer look like the second pattern.",
  },
  {
    q: "Can I try HireDrop without paying?",
    a: `Yes — your first ${FREE_APP_LIMIT} applications are free, no card. That is enough to see the cover letters it writes and the roles it picks before you decide anything. ATS resume tailoring stays a paid feature.`,
  },
];

export default function Page() {
  return (
    <>
      <JsonLd
        data={articleSchema({
          headline: TITLE,
          description: DESCRIPTION,
          path: PATH,
          datePublished: PUBLISHED,
        })}
      />
      <ContentLayout
        kicker="Comparison"
        title="AIApply alternative: HireDrop vs AIApply"
        lead="These two products look similar in a list of AI job tools and behave nothing alike in a real search. One is a workbench you operate. The other is a pipeline that runs."
        crumbs={[
          { name: "Alternatives", path: "/alternatives" },
          { name: "AIApply", path: PATH },
        ]}
        updated={formatPublished(PUBLISHED)}
      >
        <Section title="The short answer">
          <p>
            <strong>Pick AIApply</strong> if what you want is tooling: a resume builder, a scanner
            that grades it, an interview-prep companion, a translator for applying across
            languages. It is a broad kit, and breadth is the point.
          </p>
          <p>
            <strong>Pick HireDrop</strong> if the bottleneck is not your resume — it is that
            applying to twenty roles takes an evening you do not have. HireDrop is narrow on
            purpose: find the role, write the application for that role, submit it from your
            browser, show it to you first.
          </p>
        </Section>

        <CompareTable
          rivalName="AIApply"
          rows={ROWS}
          sourceNote={
            <>
              AIApply column: feature set and the credits-plus-subscription model as described on{" "}
              <a
                href="https://aiapply.co/pricing"
                rel="nofollow noopener"
                target="_blank"
                className="underline hover:text-[#6C5CE7]"
              >
                aiapply.co/pricing
              </a>
              , checked {SOURCE_CHECKED}. That page did not list dollar amounts on the date we
              checked, so none are quoted here — read them in their signup flow.
            </>
          }
        />

        <Section title="Tools versus a pipeline">
          <p>
            A toolbox assumes you are the engine. You open the resume builder, you paste the job
            description, you generate the letter, you copy it into the form, you hit submit. Each
            tool saves you a few minutes; you still spend the evening.
          </p>
          <p>
            A pipeline assumes the opposite. You configure it once — roles, locations, how strict
            the matching should be — and the work happens without you in the loop for each step.
            Your remaining job is judgment: looking at what it prepared and deciding whether it
            goes out.
          </p>
          <p>
            Neither is better in the abstract. The question is which half of the problem you
            actually have. If your applications are good but there are not enough of them, a
            toolbox will not fix it.
          </p>
        </Section>

        <Callout label="The credits question, honestly">
          <p>
            Credit packs look cheaper because the first pack is cheap. What they change is your
            behaviour: you start rationing applications, which is the opposite of what a search
            needs. A flat weekly price has a failure mode too — you pay for weeks you barely
            search. We made weekly billing the shortest cadence we could so that mistake costs{" "}
            {WEEKLY_PRICE} and not a year.
          </p>
        </Callout>

        <Section title="What HireDrop does not do">
          <p>
            It does not build your resume from scratch, grade it, translate it, or coach you
            through the interview. It reshapes the resume you upload toward each specific posting
            and writes the letter that goes with it. If you need a résumé built from nothing, do
            that elsewhere first and bring the file.
          </p>
          <p>
            It also does not run without a visible browser window on your computer. That is a
            deliberate constraint — it is what keeps the applications coming from you rather than
            from a data centre, and it is why{" "}
            <Link href="/guides/auto-apply-indeed" className="text-[#6C5CE7] underline">
              the boards keep treating the account as yours
            </Link>
            .
          </p>
        </Section>

        <FaqBlock faqs={FAQS} />

        <CtaBand headline="See 40 applications go out, free" />

        <RelatedLinks links={relatedTo(PATH)} />
      </ContentLayout>
    </>
  );
}
