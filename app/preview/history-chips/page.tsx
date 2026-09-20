"use client";

import { useState } from "react";
import HistoryView from "@/components/dashboard/HistoryView";
import type { Application } from "@/lib/types";

/**
 * Design-review page for the History doc chips: the expanded application
 * record's actions (job posting / résumé PDF / copy) redesigned as paper
 * chips with icons, a staggered rise-in, and Copy→Copied feedback.
 *
 * Public and mock-only, same as /preview/ink-day — the REAL HistoryView
 * renders mock rows, nothing is re-styled locally, so what you see is what
 * ships. The extension bridge simply never answers here (no receipts).
 */

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
              Expand a row: paper chips for the stored record, Copy turns into Copied.
            </p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="theme-toggle text-xs font-medium text-text2 border border-border rounded-full px-3 py-1.5 hover:text-text"
          >
            {dark ? "☀︎ Day" : "☾ Night"}
          </button>
        </header>
        <HistoryView applications={APPS} />
      </div>
    </div>
  );
}
