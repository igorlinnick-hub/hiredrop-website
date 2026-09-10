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
import { pageMetadata } from "@/lib/seo";
import { articleSchema } from "@/lib/structured-data";

const PATH = "/guides/ats-resume-keywords";
const PUBLISHED = GUIDES.find((entry) => entry.path === PATH)!.published;

const TITLE = "How ATS resume screening actually works";
const DESCRIPTION =
  "What Greenhouse, Lever and Ashby really do with your resume, which ATS myths waste your time, and the application fields that disqualify you before a human ever reads the file.";

export const metadata = pageMetadata({
  title: `${TITLE} — keywords, parsing and knockout questions`,
  description: DESCRIPTION,
  path: PATH,
});

const STEPS = [
  {
    title: "Mirror the posting's nouns, not its adjectives",
    body: (
      <>
        <p>
          Matching happens on concrete terms: tools, languages, certifications, job titles,
          domains. &ldquo;Postgres&rdquo;, &ldquo;SOC 2&rdquo;, &ldquo;Series B SaaS&rdquo;,
          &ldquo;Registered Nurse&rdquo;. Nobody is searching for
          &ldquo;results-driven&rdquo;.
        </p>
        <p>
          If the posting says Postgres and your resume says PostgreSQL, write both once. Spell out
          acronyms the first time and keep the short form too — a search for either then finds you.
        </p>
      </>
    ),
  },
  {
    title: "Use the title the employer uses",
    body: (
      <p>
        Internal titles lose searches. If you were a &ldquo;Growth Wizard&rdquo; and the market
        calls it &ldquo;Performance Marketing Manager&rdquo;, put the market title in the role
        line and keep the internal one in parentheses if you like it.
      </p>
    ),
  },
  {
    title: "Keep the layout parseable",
    body: (
      <>
        <p>
          One column. Real text, never an image of text. Standard section headings —
          Experience, Education, Skills. Dates in a consistent format. No critical information
          inside headers, footers or text boxes, which parsers do sometimes drop.
        </p>
        <p>
          This is not about beauty. It is about a machine reading your dates and employers into the
          right columns so a recruiter&apos;s filter can see them.
        </p>
      </>
    ),
  },
  {
    title: "Treat the form's questions as part of the resume",
    body: (
      <>
        <p>
          The application form is where people lose the role without knowing it. Work authorisation,
          sponsorship, location and on-site willingness, years with a specific tool, salary
          expectation, start date — employers can mark particular answers as disqualifying, and many
          do.
        </p>
        <p>
          Answer these deliberately and consistently across applications. A blank or a
          contradictory answer gets filtered as reliably as a missing skill.
        </p>
      </>
    ),
  },
  {
    title: "Rewrite per posting — the short way",
    body: (
      <p>
        You do not need a new resume per job. You need the top third to match this job: the
        headline, the summary line, and the skills block. That is where both the parser and the
        thirty-second human scan look first, and it is a ten-minute edit — or an automated one.
      </p>
    ),
  },
];

const FAQS = [
  {
    q: "Do ATS systems automatically reject resumes?",
    a: "Mostly no — and the nuance matters. Systems like Greenhouse, Lever and Ashby are organisation and search tools: they parse your file into fields, store it, and let recruiters filter and rank. What does auto-reject is employer-configured screening questions, where a particular answer marks the application as disqualified. So the automated 'no' usually comes from the form, not from the resume file.",
  },
  {
    q: "Does keyword stuffing or white text work?",
    a: "No, and it backfires. Hidden or repeated keywords are trivially visible once the file is parsed into plain text — which is exactly what the ATS does first — and a recruiter who spots it reads it as dishonesty. You get the same ranking benefit, legitimately, by naming the real tools from the posting in the places you actually used them.",
  },
  {
    q: "Is PDF or Word better for an ATS?",
    a: "Text-based PDF is fine nearly everywhere and keeps your layout intact. The failure case is not the extension but the content: a PDF that is secretly a scan or an exported design file has no text to extract, so the parser gets nothing. If a form explicitly asks for .doc or .docx, give it that.",
  },
  {
    q: "How long should a resume be for an ATS?",
    a: "Length is a human constraint, not a parser one — the ATS will read four pages happily. One page early in a career, two once you have a decade, and cut anything you would not defend in an interview.",
  },
  {
    q: "Can HireDrop tailor my resume per job automatically?",
    a: "Yes — that is the paid half of the product. For each posting it reshapes your resume toward that posting's requirements and writes the matching cover letter, then fills the form, including the screener questions, and shows it to you before sending.",
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
        title="How ATS resume screening actually works"
        lead="We fill thousands of ATS application forms, which means we see what they ask for rather than what blog posts claim they ask for. Here is the accurate version — including the part of the application that really does reject you automatically."
        crumbs={[
          { name: "Guides", path: "/guides" },
          { name: "ATS resume screening", path: PATH },
        ]}
        updated={formatPublished(PUBLISHED)}
      >
        <Section title="What the system on the other side is for">
          <p>
            An applicant tracking system is, to the company that bought it, a filing cabinet with a
            search box. Greenhouse, Lever and Ashby exist so that a recruiter can keep a hundred
            candidates per role straight, move them through stages, and find the eight worth a
            phone call.
          </p>
          <p>
            So when your application lands, two things happen. Your file is parsed into structured
            fields — employers, dates, titles, skills, education. And your form answers are stored
            next to them, where they can be filtered on.
          </p>
          <p>
            Neither step involves a machine deciding you are unqualified. That decision is a
            recruiter running a filter, or a screening question the employer configured to
            disqualify a particular answer.
          </p>
        </Section>

        <Callout label="The misdirection in most ATS advice">
          <p>
            Almost all of it is about beating the resume parser: fonts, margins, columns, &ldquo;ATS
            score&rdquo; tools. Parsing matters, but it is table stakes — any clean single-column
            file clears it.
          </p>
          <p>
            The thing that silently ends applications is the questionnaire. Work authorisation,
            sponsorship, location, years-with-tool, salary, notice. Those are structured,
            filterable, and often configured to disqualify outright. Nobody sells you a course on
            answering them carefully.
          </p>
        </Callout>

        <Section title="What actually moves your ranking">
          <p>
            Recruiters search and filter on the language of their own posting. That is the whole
            mechanism behind &ldquo;keywords&rdquo;, and it is less mystical than it sounds: the
            resume that names the stack, the domain and the title from the posting surfaces in the
            search; the one that describes the same experience in different words does not.
          </p>
          <p>
            Which is why a generic resume loses to a tailored one even when the generic candidate is
            stronger. It is not being judged worse — it is not being found.
          </p>
        </Section>

        <Section title="Five things worth doing">
          <p>In rough order of payoff per minute spent.</p>
        </Section>

        <Steps steps={STEPS} />

        <Section title="The fields that quietly cost people roles">
          <p>
            From filling these forms at volume, the answers that most often go wrong are the ones
            that look like formalities:
          </p>
          <p>
            <strong>Work authorisation and sponsorship</strong> — two separate questions that
            contradict each other if answered carelessly, and a contradiction is a disqualification.
          </p>
          <p>
            <strong>Location and on-site willingness</strong> — a remote-looking posting with a
            required metro area is extremely common. A blank here is treated as a no.
          </p>
          <p>
            <strong>Years of experience per tool</strong> — asked as a number, filtered as a number.
            Round honestly, but do round.
          </p>
          <p>
            <strong>Salary expectation</strong> — a blank is sometimes an invalid submission, and a
            number wildly outside the band filters you out before the conversation that could have
            moved it.
          </p>
          <p>
            <strong>Self-identification blocks</strong> — voluntary, not used for screening, and
            safe to decline. They do still have to be completed for the form to submit.
          </p>
        </Section>

        <Section title="Doing this per application, without the evening">
          <p>
            Everything above is ten minutes a posting. Twenty postings is an evening you do not have
            after a day of work, which is why most people send the same file everywhere and
            conclude that applying does not work.
          </p>
          <p>
            HireDrop does that ten minutes for each posting — reshapes the resume toward it, writes
            the cover letter from its text, answers the form questions from your stored profile —
            and then shows you the result before it sends.{" "}
            <Link href="/guides/auto-apply-indeed" className="text-[#6C5CE7] underline">
              The Indeed guide
            </Link>{" "}
            covers the submitting side of the same pipeline.
          </p>
        </Section>

        <FaqBlock faqs={FAQS} />

        <CtaBand headline="Let it tailor the next 40 for you, free" />

        <RelatedLinks links={relatedTo(PATH)} />
      </ContentLayout>
    </>
  );
}
