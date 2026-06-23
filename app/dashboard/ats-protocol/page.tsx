import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiGet, type StatsResponse } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const metadata = { title: "ATS Protocol — HireDrop Admin" };

export default async function AtsProtocolPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login");

  const stats = await apiGet<StatsResponse>("/stats", token).catch(() => null);
  if (!stats || stats.tier !== "admin") redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-sm text-text2 hover:text-text transition">← Dashboard</a>
          <span className="text-border">/</span>
          <span className="text-sm text-text font-medium">ATS Protocol</span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5
            bg-amber-200/20 text-amber-400 border border-amber-400/30 rounded-full">
            Admin only
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text">ATS Pipeline Protocol</h1>
          <p className="text-sm text-text2 mt-1">
            Internal document — full workflow of how HireDrop generates ATS-optimized resumes and
            applies to jobs. Not shown to users.
          </p>
        </div>

        {/* Stage 1 */}
        <Section num="1" title="ATS Compliance Analysis" badge="ats_checker.py" badgeColor="blue">
          <p>
            When a user uploads their resume, we run a static analysis on the PDF bytes using
            <code>pdfplumber</code>. No AI is needed — this is pure algorithmic detection.
          </p>
          <SubHeading>Scoring Deductions (starts at 100)</SubHeading>
          <Table rows={[
            ["Issue", "Deduction", "Detection Method"],
            ["Multi-column layout", "−30", "Text chars cluster in 2+ distinct horizontal zones (gap > 28% of page width)"],
            ["HTML/PDF tables", "−25", "pdfplumber extract_tables() returns non-empty rows"],
            ["Embedded images / graphics", "−20", "page.images is non-empty"],
            ["Floating text boxes / complex layout", "−15", "More than 8 rectangles on a page"],
            ["Non-standard symbols / icons", "−10", "≥5 Unicode chars outside L/N/P/Z/M categories (bullets • – — are whitelisted)"],
          ]} />
          <p className="text-text2/70 text-xs mt-2">
            Score is clamped to [0, 100]. Issues are returned as a list of keys + human-readable labels.
            Results stored in <code>profiles.ats_score</code>, <code>ats_issues</code>,{" "}
            <code>ats_checked_at</code>.
          </p>
        </Section>

        {/* Stage 2 */}
        <Section num="2" title="ATS-Compliant PDF Generation" badge="ats_pdf_generator.py" badgeColor="purple">
          <p>
            Triggered via <code>POST /profile/ats/generate</code>. Two-step process: Claude structures
            the resume, ReportLab renders it.
          </p>

          <SubHeading>Step 2a — Structure Extraction (Claude Sonnet 4.6)</SubHeading>
          <p>
            Raw text is extracted from the uploaded PDF via pdfplumber, then passed to Claude Sonnet
            with a strict JSON schema prompt (truncated to 4000 chars). Output sections:
            name, title, contact, summary, competencies, experience (with bullets), education,
            certifications, languages, tech_skills.
          </p>
          <p className="text-text2/70 text-xs mt-1">
            Claude returns ONLY JSON — no markdown. Stripped from code fences if present.
          </p>

          <SubHeading>Step 2b — PDF Rendering (ReportLab)</SubHeading>
          <Table rows={[
            ["Element", "Style"],
            ["Name", "16pt Helvetica-Bold, ALL CAPS, left-aligned"],
            ["Section headers", "12pt Helvetica-Bold + full-width horizontal rule"],
            ["Job titles", "11pt Helvetica-Bold"],
            ["Body / bullets", "10.5pt Helvetica, line spacing 1.0"],
            ["Margins", "0.75 inch all sides"],
            ["Bullets", "Hyphen + space (no special symbols)"],
            ["Core Competencies / Tech Skills", "Pipe-separated rows, max 4 per row"],
          ]} />
          <p className="text-text2/70 text-xs mt-2">
            No tables, no images, no columns, no text boxes — guaranteed to pass ATS scanners.
            Output stored as <code>resume_ats.pdf</code> in Supabase Storage under the user&apos;s ID.
          </p>

          <SubHeading>Approval Flow</SubHeading>
          <ul className="list-disc list-inside text-sm text-text2 space-y-1 ml-2">
            <li><code>POST /profile/ats/approve</code> → sets <code>profiles.ats_approved = true</code></li>
            <li><code>POST /profile/ats/decline</code> → sets <code>ats_approved = false</code> (keep original)</li>
            <li><code>GET /profile/resume/url/best</code> → returns ATS PDF if approved, original otherwise</li>
          </ul>
        </Section>

        {/* Stage 3 */}
        <Section num="3" title="AI Job Scoring" badge="ai_job_scorer.py · Haiku" badgeColor="green">
          <p>
            Runs automatically after <code>POST /jobs/find</code> scrapes listings.
            Uses <code>claude-haiku-4-5-20251001</code> — cheap and fast (~$0.025 per 200 jobs).
          </p>
          <SubHeading>Output per job</SubHeading>
          <Table rows={[
            ["Field", "Type", "Description"],
            ["score", "0–10 int", "Candidate fit. Below 4 → filtered out before saving."],
            ["verdict", "string", "подходит / сомнительно / пропустить"],
            ["reasons", "string[]", "2–4 bullet reasons for the score"],
            ["flags", "string[]", "Disqualifiers (visa, relocation, experience gap)"],
            ["ats_keywords", "string[]", "5–12 critical ATS terms extracted from the JD (skills, tools, certs)"],
            ["ats_match_pct", "int", "% of ats_keywords found case-insensitively in the user&apos;s resume text"],
          ]} />
          <SubHeading>ATS Match Calculation</SubHeading>
          <p>
            Computed locally — no extra API call. Simple case-insensitive string search of each keyword
            in the user&apos;s resume text. Color coding in UI: ≥80% green, ≥50% amber, &lt;50% red.
          </p>
        </Section>

        {/* Stage 4 */}
        <Section num="4" title="Per-Job Resume Tailoring" badge="ai_resume_tailor.py · Sonnet" badgeColor="orange">
          <p>
            Runs only for jobs with <code>score ≥ 7</code>. Uses <code>claude-sonnet-4-6</code> —
            quality matters here since this directly affects hire rate.
          </p>
          <SubHeading>What Sonnet does</SubHeading>
          <ul className="list-disc list-inside text-sm text-text2 space-y-1 ml-2">
            <li>Receives user&apos;s resume text + the job&apos;s <code>ats_keywords</code> list</li>
            <li>Reorders, reframes, and emphasizes existing experience to match the JD</li>
            <li>Guarantees every <code>ats_keyword</code> appears naturally in the output</li>
          </ul>
          <SubHeading>Hard constraints (enforced in system prompt)</SubHeading>
          <ul className="list-disc list-inside text-sm text-text2 space-y-1 ml-2">
            <li>NO fabrication of skills, experience, or credentials</li>
            <li>NO changes to dates, titles, company names</li>
            <li>Output is ATS-friendly plain text (no tables, no images, standard headings)</li>
          </ul>
          <p className="text-text2/70 text-xs mt-2">
            Result stored in <code>jobs.tailored_resume</code>. Shown to user in Jobs Table
            (expandable row) and Application History (ATS resume button).
          </p>
        </Section>

        {/* Stage 5 */}
        <Section num="5" title="Extension Application Flow" badge="background.js" badgeColor="gray">
          <p>Campaign loop — what the extension does per job application:</p>
          <ol className="list-decimal list-inside text-sm text-text2 space-y-1.5 ml-2">
            <li>Extension picks up jobs from Supabase or uses Indeed search results</li>
            <li>Calls <code>GET /profile/resume/url/best</code> → gets the best resume URL (ATS or original)</li>
            <li>Generates cover letter via <code>POST /tools/cover-letter-preview</code> (Claude Sonnet)</li>
            <li>Fills Indeed application form: name, email, phone, resume upload, cover letter</li>
            <li>Calls <code>POST /applications/save</code> with job details + cover letter</li>
            <li>The <code>tailored_resume</code> is linked via <code>job_id</code> FK (not re-uploaded per application)</li>
          </ol>
          <SubHeading>Screenshot Streaming</SubHeading>
          <p>
            <code>chrome.debugger.attach</code> → <code>Page.captureScreenshot</code> (JPEG 40% quality)
            every ~300ms → <code>POST /campaign/screenshot</code> → stored in{" "}
            <code>campaign_screenshots</code> table (10-second TTL) → dashboard polls every 400ms.
            Fallback: <code>chrome.tabs.captureVisibleTab</code> if debugger session is lost.
          </p>
        </Section>

        {/* Cost Table */}
        <Section num="6" title="Cost Breakdown" badge="Unit Economics" badgeColor="yellow">
          <Table rows={[
            ["Operation", "Model", "Approx cost"],
            ["Job scoring (200 jobs)", "Haiku 4.5", "~$0.025"],
            ["Resume tailoring (per job ≥7)", "Sonnet 4.6", "~$0.015–0.035"],
            ["Cover letter (per application)", "Sonnet 4.6", "~$0.007"],
            ["ATS PDF structure extraction", "Sonnet 4.6", "~$0.01 one-time"],
            ["ATS compliance check", "none (pdfplumber)", "$0.00"],
          ]} />
          <p className="text-text2/70 text-xs mt-2">
            Cover letter is the dominant variable cost. At Pro tier (50 apps/day) ≈ $0.35/day per
            active user. ATS tailoring is per unique job, not per application.
          </p>
        </Section>

      </div>
    </DashboardLayout>
  );
}

function Section({
  num, title, badge, badgeColor, children,
}: {
  num: string;
  title: string;
  badge: string;
  badgeColor: "blue" | "purple" | "green" | "orange" | "gray" | "yellow";
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-accent/10 text-accent border-accent/20",
    green: "bg-green/10 text-green border-green/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    gray: "bg-border/30 text-text2 border-border/50",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent
          text-xs font-bold flex items-center justify-center">
          {num}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-text text-base">{title}</h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${colors[badgeColor]}`}>
              {badge}
            </span>
          </div>
        </div>
      </div>
      <div className="text-sm text-text2 space-y-3 pl-10">
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-semibold text-text text-sm mt-3 mb-1">{children}</p>
  );
}

function Table({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-lg border border-border mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-surface2 border-b border-border">
            {header.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-text2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "" : "bg-surface2/30"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-text2">
                  {ci === 0 ? <span className="text-text font-medium">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
