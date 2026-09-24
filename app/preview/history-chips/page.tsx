"use client";

import { useState } from "react";
import HistoryView from "@/components/dashboard/HistoryView";
import type { Application } from "@/lib/types";
import type { Handback } from "@/components/dashboard/useHandbacks";

/**
 * Design-review page for the History doc chips: the expanded application
 * record's actions (job posting / résumé PDF / copy) redesigned as paper
 * chips with icons, a staggered rise-in, and Copy→Copied feedback.
 *
 * Public and mock-only, same as /preview/ink-day — the REAL HistoryView
 * renders mock rows, nothing is re-styled locally, so what you see is what
 * ships. The extension bridge simply never answers here (no receipts).
 */

// Hand-backs the filler could not finish. The first two carry the QUESTIONS that
// blocked them (09-21) — that is what the "Answer N" button opens. The third is the
// other shape: a wall that was never a question, so it must NOT offer an Answer button.
const HANDBACKS: Handback[] = [
  {
    id: "hb-1",
    job_title: "Field Marketing Manager",
    company: "Postman",
    url: "https://boards.greenhouse.io/postman/jobs/1",
    reason: "this form asks something we can't answer for you",
    steps_done: 4,
    job_id: "job-1",
    questions: [
      { label: "Will you now or in the future require visa sponsorship?", options: ["Yes", "No"] },
      { label: "What is your notice period?", options: [] },
    ],
  },
  {
    id: "hb-2",
    job_title: "Associate, Health System Contracting",
    company: "Oscar",
    url: "https://boards.greenhouse.io/oscar/jobs/2",
    reason: "required field we could not fill",
    steps_done: 2,
    job_id: "job-2",
    questions: [
      { label: "Are you currently located in the US?", options: ["Yes", "No"] },
    ],
  },
  {
    id: "hb-3",
    job_title: "Pipe Welder",
    company: "Kenaidan Contracting",
    url: "https://boards.greenhouse.io/kenaidan/jobs/3",
    reason: "we couldn't find the submit button",
    steps_done: 5,
    job_id: null,
    questions: [],
  },
];

const LETTER = `Dear SchooLinks team,

I've spent the last few years running marketing operations where I owned everything end-to-end — strategy, production, execution. At my current clinic role, I coordinated a full UFC Gym collaboration: concept to camera to final cut. Events work the same way — a lot of moving parts that only land when someone's actually tracking all of them.

What draws me to SchooLinks specifically is the scale. Going from district-level meetups to national conferences within the same role is the kind of range that keeps the work interesting.

Igor Linnyk`;

const RESUME = `IGOR LINNYK — Marketing Operations
Honolulu, HI · open to relocation

EXPERIENCE
Marketing Lead, Hawaii Wellness Clinic — owned strategy, production and
execution end-to-end; ran a UFC Gym collaboration from concept to final cut.

SKILLS
Campaign ops · Event marketing · Content production · Analytics`;

const iso = (daysAgo: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const APPS: Application[] = [
  {
    id: "p1", title: "Event Manager", company: "SchooLinks", platform: "indeed",
    link: "https://example.com/job/1", date_applied: iso(0, 11, 28), status: "applied",
    cover_letter: LETTER, tailored_resume: RESUME, resume_pdf_url: "https://example.com/resume.pdf",
  } as Application,
  {
    id: "p2", title: "Field Marketing and Events Manager", company: "Budderfly", platform: "indeed",
    link: "https://example.com/job/2", date_applied: iso(0, 10, 4), status: "interview_invite",
    cover_letter: LETTER,
  } as Application,
  {
    id: "p3", title: "Lead Product Marketing Manager", company: "Vanta", platform: "ashby",
    link: "https://example.com/job/3", date_applied: iso(1, 16, 45), status: "applied",
  } as Application,
];

// A believable back-history so the Insights panel can be judged: ~4 months of
// runs with quiet weeks, weekends, a few big days and a realistic reply mix.
// Deterministic (a seeded LCG, never Math.random) so the server and the client
// render the same grid and hydration stays quiet.
function seeded(seed: number) {
  let x = seed;
  return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const BACKLOG: Application[] = (() => {
  const rnd = seeded(20260923);
  const platforms = ["indeed", "greenhouse", "lever", "ashby", "ziprecruiter"];
  const out: Application[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let back = 120; back >= 2; back -= 1) {
    const d = new Date(today.getTime() - back * 86400000);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const r = rnd();
    // quiet stretches (no campaign running), weekends thin, weekdays busier
    const n = weekend ? (r < 0.75 ? 0 : 1) : r < 0.22 ? 0 : Math.ceil(r * 9);
    for (let i = 0; i < n; i += 1) {
      const pr = rnd();
      const sr = rnd();
      const status = sr < 0.71 ? "applied" : sr < 0.83 ? "received" : sr < 0.92 ? "rejected" : "interview";
      const at = new Date(d); at.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);
      out.push({
        id: `bk-${back}-${i}`,
        title: "Marketing Manager",
        company: "Acme",
        platform: platforms[Math.min(platforms.length - 1, Math.floor(pr * pr * platforms.length))],
        link: "https://example.com/job",
        date_applied: at.toISOString(),
        status,
      } as Application);
    }
  }
  return out;
})();

export default function PreviewHistoryChips() {
  const [dark, setDark] = useState(false);
  return (
    <div className={`hd-dash-root app-ui ${dark ? "dark" : ""} min-h-screen bg-background`}>
      <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">
              <span className="text-accent">Hire</span>Drop — history doc chips
            </h1>
            <p className="text-xs text-text2 mt-1">
              Expand a row for the stored record. The status chip opens a picker — that is how a reply gets marked.
            </p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="theme-toggle text-xs font-medium text-text2 border border-border rounded-full px-3 py-1.5 hover:text-text"
          >
            {dark ? "☀︎ Day" : "☾ Night"}
          </button>
        </header>
        {/* No session on a public preview — swallow the write so the picker is
            still clickable and the chip still moves. */}
        <HistoryView
          applications={[...APPS, ...BACKLOG]}
          onSetStatus={async () => {}}
          handbacksOverride={HANDBACKS}
          statsOverride={{
            // What /stats returns on a live account — the preview has no session,
            // and the Today card must be judged with numbers in it.
            total_jobs: 1284, total_applications: 331, applications_today: 18, new_today: 96,
            tier: "pro", daily_limit: 30, remaining_today: 12,
            platform_counts: { indeed: 9, greenhouse: 4, lever: 3, ashby: 2 },
            max_per_platform: 12,
          }}
        />
      </div>
    </div>
  );
}
