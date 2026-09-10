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

const PATH = "/alternatives/lazyapply";
const PUBLISHED = ALTERNATIVES.find((entry) => entry.path === PATH)!.published;

const TITLE = "LazyApply Alternative: HireDrop vs LazyApply";
const DESCRIPTION =
  "LazyApply blasts up to 150 applications a day on an annual plan. HireDrop sends up to 30 human-paced applications you approve, from your own browser, weekly or monthly. An honest side-by-side.";

export const metadata = pageMetadata({
  title: `${TITLE} — which one fits your search`,
  description: DESCRIPTION,
  path: PATH,
});

// Every number in the "LazyApply" column comes from their own pricing page on the
// date in SOURCE_CHECKED. Nothing here is inferred, and nothing is restated as a
// claim about quality — only what they publish about their own plans.
const SOURCE_CHECKED = "September 9, 2026";

const ROWS = [
  {
    dimension: "Where applications run",
    hiredrop: "Your own browser, on your own machine and IP address. Nothing is submitted from our servers.",
    rival: "A Chrome extension that drives the forms in your browser.",
  },
  {
    dimension: "Applications per day",
    hiredrop: "Up to 30, spread at a human pace (20 per platform).",
    rival: "15 on Basic, 150 on Premium, 1,500 on Ultimate.",
  },
  {
    dimension: "Do you see them first?",
    hiredrop: "Yes by default — Tap mode shows each filled application and waits for your approval. Full auto is opt-in.",
    rival: "Built around unattended bulk sending.",
  },
  {
    dimension: "Resume and cover letter",
    hiredrop: "Rewritten per job: an ATS-shaped resume and a cover letter in your voice, from the actual job description.",
    rival: "Uses the resume profiles you store; cover letters come from their Job GPT feature.",
  },
  {
    dimension: "Billing",
    hiredrop: `${WEEKLY_PRICE}/week or ${MONTHLY_PRICE}/month, cancel in one click.`,
    rival: "$99, $149 or $999 per year, billed annually.",
  },
  {
    dimension: "If you get hired in three weeks",
    hiredrop: "You stop paying. Three weeks of weekly billing and you're done.",
    rival: "You have paid for the year (they publish a 30-day money-back window).",
  },
  {
    dimension: "Platforms",
    hiredrop: "Indeed and ZipRecruiter natively, plus company career pages on Greenhouse, Lever and Ashby.",
    rival: "Lists Greenhouse, Dice, Indeed and ZipRecruiter.",
  },
];

const FAQS = [
  {
    q: "Is LazyApply safe to use?",
    a: "LazyApply runs in your own browser, which is the safer half of the design — the applications come from your IP, not a data centre. The risk is not where it runs but how fast: job boards flag accounts on behaviour, and 150 or 1,500 submissions in a day is behaviour no human produces. If you use it, the lower-volume plan is the safer one.",
  },
  {
    q: "Is HireDrop cheaper than LazyApply?",
    a: `It depends on how long you search. LazyApply charges $99–$999 once a year; HireDrop charges ${WEEKLY_PRICE} a week or ${MONTHLY_PRICE} a month and stops when you cancel. A one-month search is cheaper with HireDrop. A search that runs the full year, on LazyApply's Basic plan, is cheaper with LazyApply. That is the real trade, and it is worth doing the arithmetic for your own timeline.`,
  },
  {
    q: "Can I try HireDrop before paying?",
    a: `Yes. Your first ${FREE_APP_LIMIT} applications are free with no card — enough to watch real applications go out and judge the quality yourself. ATS resume tailoring stays a paid feature.`,
  },
  {
    q: "Does more applications per day mean more interviews?",
    a: "Not past a point. The same resume fired at 150 postings converts worse than a tailored one sent to 30, because recruiters screen on fit and because ATS keyword matching rewards the job-specific version. Volume helps until it replaces relevance — then it just fills your inbox with rejections.",
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
        title="LazyApply alternative: HireDrop vs LazyApply"
        lead="Both apply to jobs for you from a Chrome extension. They disagree about almost everything else — how many applications a day is sane, whether you see them before they send, and whether you should pay for a year up front."
        crumbs={[
          { name: "Alternatives", path: "/alternatives" },
          { name: "LazyApply", path: PATH },
        ]}
        updated={formatPublished(PUBLISHED)}
      >
        <Section title="The short answer">
          <p>
            <strong>Pick LazyApply</strong> if your plan is maximum volume, you are comfortable
            sending applications you have not read, and you expect to be searching for most of
            a year — the annual price amortises well over twelve months.
          </p>
          <p>
            <strong>Pick HireDrop</strong> if you want every application to be worth opening:
            a resume and cover letter written for that specific posting, a daily cap that keeps
            your account looking human, and a review step before anything sends. You pay by the
            week or month and stop when you are hired.
          </p>
        </Section>

        <CompareTable
          rivalName="LazyApply"
          rows={ROWS}
          sourceNote={
            <>
              LazyApply column: plan names, prices and daily limits as published on{" "}
              <a
                href="https://www.lazyapply.com/pricing"
                rel="nofollow noopener"
                target="_blank"
                className="underline hover:text-[#6C5CE7]"
              >
                lazyapply.com/pricing
              </a>
              , checked {SOURCE_CHECKED}. Prices change — verify before buying either product.
            </>
          }
        />

        <Section title="What 150 applications a day actually gets you">
          <p>
            Volume tools sell a number because the number is easy to sell. The part that is hard
            to sell is what happens downstream of it.
          </p>
          <p>
            A single generic resume sent to 150 postings meets two filters. The first is the ATS,
            which ranks you against the posting&apos;s own language — a resume that never mentions
            the stack in the job description ranks below one that does, no matter how good you
            are. The second is a human who reads for thirty seconds and looks for evidence you
            read the posting at all. Bulk sending fails both filters at once, then reports the
            failures back to you as &ldquo;applications sent&rdquo;.
          </p>
          <p>
            There is a third cost that no dashboard shows: the boards themselves. Job platforms
            detect automation by behaviour — submissions per minute, identical payloads,
            round-the-clock activity. You find out you crossed the line when your account goes
            quiet or disappears, taking your saved searches and message history with it.
          </p>
        </Section>

        <Callout label="Why our cap is 30, not 1,500">
          <p>
            30 a day (20 per platform) is not a technical limit we failed to raise — it is the
            point we stopped at deliberately. It keeps a day of activity inside what a motivated
            human does, and it is small enough that every application can be individually written
            and still finish in the background while you do something else.
          </p>
        </Callout>

        <Section title="Where LazyApply is the better pick">
          <p>
            An honest comparison has to include this. If you are early in a broad search, fine
            with a single resume, and your goal is to cover the widest possible surface at the
            lowest annual cost, LazyApply&apos;s Basic plan at $99 a year is hard to beat on price
            — about $8 a month if you really do search for twelve months.
          </p>
          <p>
            It also supports Dice, which we do not. If your field is contract IT staffing and Dice
            is where your roles live, that matters more than anything else on this page.
          </p>
        </Section>

        <Section title="How HireDrop works instead">
          <p>
            You set your roles, locations and how selective the matching should be. HireDrop then
            watches Indeed, ZipRecruiter and company ATS boards for postings that match, and for
            each one it builds an application: your resume reshaped toward that posting&apos;s
            requirements, and a cover letter written from the job description in your own voice.
          </p>
          <p>
            By default it stops there and shows you the filled application — that is Tap mode,
            and it is the setting we ship on. One tap sends it, and you can approve from your
            phone while the browser on your computer does the work. Turning on full auto is your
            choice, not the default.
          </p>
          <p>
            Everything runs in your Chrome, on your connection, at a pace we deliberately keep
            slow. We do not solve captchas and we do not run server-side bots — the two things
            that most reliably get accounts flagged.{" "}
            <Link href="/guides/auto-apply-indeed" className="text-[#6C5CE7] underline">
              The Indeed guide
            </Link>{" "}
            explains what that looks like in practice on the biggest board.
          </p>
        </Section>

        <FaqBlock faqs={FAQS} />

        <CtaBand headline="Try 40 applications before you decide" />

        <RelatedLinks links={relatedTo(PATH)} />
      </ContentLayout>
    </>
  );
}
