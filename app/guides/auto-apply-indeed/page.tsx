import Link from "next/link";

import ContentLayout from "@/components/content/ContentLayout";
import {
  Callout,
  CtaBand,
  FaqBlock,
  RelatedLinks,
  Section,
  Steps,
} from "@/components/content/blocks";
import JsonLd from "@/components/seo/JsonLd";
import { GUIDES, formatPublished, relatedTo } from "@/lib/content-index";
import { FREE_APP_LIMIT } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { articleSchema } from "@/lib/structured-data";

const PATH = "/guides/auto-apply-indeed";
const PUBLISHED = GUIDES.find((entry) => entry.path === PATH)!.published;

const TITLE = "How to auto-apply to jobs on Indeed";
const DESCRIPTION =
  "Indeed has two kinds of apply button, and automation behaves completely differently on each. What breaks, what gets accounts flagged, and how to automate Indeed applications safely.";

export const metadata = pageMetadata({
  title: `${TITLE} (and what breaks)`,
  description: DESCRIPTION,
  path: PATH,
});

const STEPS = [
  {
    title: "Separate the two kinds of posting before you automate anything",
    body: (
      <>
        <p>
          Read the button, not the listing. <strong>Apply now</strong> keeps you inside
          Indeed&apos;s own apply flow. <strong>Apply on company site</strong> hands you off to the
          employer&apos;s applicant tracking system — Greenhouse, Lever, Ashby, Workday and dozens
          more, each with its own form.
        </p>
        <p>
          Any tool that only handles the first kind quietly skips a large share of the good
          postings. Any tool that claims to handle the second kind has to actually understand ATS
          forms, not just fill two text fields.
        </p>
      </>
    ),
  },
  {
    title: "Get your profile complete enough that forms don't stall",
    body: (
      <>
        <p>
          The fields that stop an automated application are rarely the obvious ones. Work
          authorisation, sponsorship, years of experience per skill, notice period, salary
          expectation, city and postcode, and the disability/veteran self-identification blocks
          are what forms hang on.
        </p>
        <p>
          Fill these once, properly. A half-filled profile turns every multi-step form into a dead
          end halfway through, and a dead end mid-form is worse than not applying — some ATSes
          record the partial submission.
        </p>
      </>
    ),
  },
  {
    title: "Be logged in where it actually counts",
    body: (
      <>
        <p>
          This one costs people whole evenings. Indeed treats <em>browsing</em> and{" "}
          <em>applying</em> as different sessions. The header on the search pages can show you as
          signed in while the apply flow does not recognise you at all — so the automation sails
          through the search and fails at the last click.
        </p>
        <p>
          Before a batch, open one posting and start an application by hand. If the apply screen
          asks you to sign in, that is the session that matters — fix it there, not on the search
          page.
        </p>
      </>
    ),
  },
  {
    title: "Cap the day and spread it out",
    body: (
      <>
        <p>
          Pick a daily number you could plausibly have done yourself — a few dozen, not a few
          hundred — and let it run across hours rather than minutes. Job boards detect automation
          by rhythm: bursts, identical payloads, activity at 4am every day.
        </p>
        <p>
          Also watch the timezone your cap resets in. If the tool counts &ldquo;today&rdquo; in UTC
          while you live in California, your day ends at 4 or 5pm and the evening looks like a
          second day of activity.
        </p>
      </>
    ),
  },
  {
    title: "Read the first ten before you trust the next hundred",
    body: (
      <>
        <p>
          Whatever you use, keep a review step on at the start. Look at ten finished applications:
          did it answer the screener questions sensibly, did the cover letter reference the actual
          posting, did it pick roles you would have picked?
        </p>
        <p>
          This is the cheapest quality control there is, and it is the step every
          volume-first tool encourages you to skip.
        </p>
      </>
    ),
  },
];

const FAQS = [
  {
    q: "Does Indeed have an auto-apply feature of its own?",
    a: "No. Indeed has saved searches, alerts and a stored profile that speeds up its own apply flow, but it does not apply on your behalf. Anything described as Indeed auto-apply is third-party software driving the site — either from your browser or from someone's server.",
  },
  {
    q: "Is automating Indeed applications against the rules?",
    a: "Indeed's terms restrict automated access to the site, and we are not going to pretend the line is crisp for a browser assistant that a human supervises. What we do to stay on the defensible side: applications run in your own browser under your own login at a human pace, we never solve captchas, we don't run server-side submission bots, and every application can be reviewed by you before it sends. Tools that blast from data-centre IPs or crack challenges are a different category of risk.",
  },
  {
    q: "Why do auto-apply tools fail on some Indeed jobs?",
    a: "Three reasons, in order of frequency. The posting hands off to a company ATS with a multi-step form the tool never learned. The apply session isn't authenticated even though the search session is. Or the flow throws a challenge — a captcha or a bot-check interstitial — which an honest tool has to stop at rather than defeat.",
  },
  {
    q: "Will auto-applying get my Indeed account banned?",
    a: "Nobody can promise it won't — the decision is Indeed's. What changes the odds is behaviour: where the requests come from, how fast they arrive, and whether challenges get answered or bypassed. Applying from your own browser at a few dozen a day looks like a motivated job seeker. Hundreds a day from a server looks like what it is.",
  },
  {
    q: "How many applications a day is reasonable?",
    a: "We cap at 30, with 20 per platform, and that is a deliberate ceiling rather than a technical one. It fits inside normal human activity and leaves room for every application to be individually written, which is the part that actually converts.",
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
        kicker="Guide"
        title="How to auto-apply to jobs on Indeed (and what breaks)"
        lead="We build an applying engine for Indeed, which mostly means we have met its failure modes. This is the practical version: what the two apply buttons mean, why tools stall, and how to automate without handing your account over."
        crumbs={[
          { name: "Guides", path: "/guides" },
          { name: "Auto-apply on Indeed", path: PATH },
        ]}
        updated={formatPublished(PUBLISHED)}
      >
        <Section title="Indeed is really two sites">
          <p>
            Every automation decision on Indeed follows from one fact: some postings are applied to
            inside Indeed, and some are applied to on the employer&apos;s own system. The search
            results look identical. The work behind the button is not remotely the same.
          </p>
          <p>
            Indeed&apos;s own flow is short and predictable — a handful of steps, screener
            questions, a resume already on file. The handoff postings drop you into whatever ATS
            the company bought, with its own field names, its own required answers, and its own
            idea of what a phone number looks like. Coverage lives or dies on that second group.
          </p>
        </Section>

        <Callout label="The tell of a shallow tool">
          <p>
            If a tool&apos;s marketing talks only about numbers per day and never about company
            ATS forms, it is almost certainly skipping the handoff postings — which is where a lot
            of the roles worth having are.
          </p>
        </Callout>

        <Section title="Five steps that make automated applying actually work">
          <p>
            This works whether you use HireDrop, something else, or a keyboard and a free evening.
          </p>
        </Section>

        <Steps steps={STEPS} />

        <Section title="What we learned the hard way">
          <p>
            A few specifics, since they cost us real debugging and they generalise to any tool you
            try:
          </p>
          <p>
            <strong>Buttons lie by position.</strong> Forms often have two plausible primary
            buttons on one screen — a search or filter action and the real <em>Continue</em>. Click
            the wrong one and the flow loops forever while reporting no error at all.
          </p>
          <p>
            <strong>Not every platform ends in &ldquo;Submit&rdquo;.</strong> Some apply flows
            finish on a differently-labelled final action, so a tool that waits for the word
            &ldquo;Submit&rdquo; sits there believing it has not finished — and you think nothing
            was sent when it was, or the reverse.
          </p>
          <p>
            <strong>Dropdowns are frequently not dropdowns.</strong> On Indeed many selects are
            custom components rather than native HTML ones, so naive automation fills nothing and
            moves on, leaving required answers blank.
          </p>
          <p>
            <strong>A challenge screen is a stop sign.</strong> When a bot-check interstitial
            appears, the correct behaviour is to pause and tell you, not to defeat it. Anything
            that routes around challenges is buying short-term throughput with your account.
          </p>
        </Section>

        <Section title="How HireDrop does it">
          <p>
            HireDrop watches Indeed and ZipRecruiter plus company boards on Greenhouse, Lever and
            Ashby. When a posting matches, it reshapes your resume toward that posting and writes
            the cover letter from the posting&apos;s own text, then fills the form — including the
            screener questions — in the Chrome window on your computer.
          </p>
          <p>
            Then it waits for you. Tap mode is the default: you see the finished application and
            approve it, from your phone if you are not at the desk. Up to 30 a day, 20 per
            platform, paced across the day.{" "}
            <Link href="/guides/ats-resume-keywords" className="text-[#6C5CE7] underline">
              The ATS guide
            </Link>{" "}
            covers what happens to the resume after you hit send.
          </p>
        </Section>

        <FaqBlock faqs={FAQS} />

        <CtaBand headline={`Automate Indeed — first ${FREE_APP_LIMIT} applications free`} />

        <RelatedLinks links={relatedTo(PATH)} />
      </ContentLayout>
    </>
  );
}
