"use client";

import { IllustrationTailored } from "@/components/illustrations";

/**
 * "List your skills" — the one screen where the user writes the raw material for
 * their skills-first resume.
 *
 * Design brief (Igor, 2026-09-20): wide 16:9 frame, bigger type, mostly black and
 * white, and ONE image block in a night-violet palette not used anywhere else.
 *
 * How that resolves:
 *  - Two panes. The night pane carries the worked example, because the example is
 *    the part that teaches — making it the "picture" means the decoration is doing
 *    work instead of sitting next to the work.
 *  - The writing pane is pure black-on-white (inverted in dark), so nothing
 *    competes with the text the user is producing.
 *  - Night violet (#07030F → #2A1055, orb glow #A78BFA) is new to the product: the
 *    app runs light-lavender #6C5CE7, the day theme runs amber. It stays identical
 *    in both themes — it's an image, not a surface.
 *  - Marks (+ × ✳ · ◦) and the orb come from ILLUSTRATION_IDENTITY.md so this reads
 *    as the same family. No human figures, per the same doc.
 *  - Headings stay Inter: globals.css reserves Space Grotesk for marketing.
 */

// We ask for at least this many skills — the grouping is only as good as what the
// candidate actually lists. Mirrors MIN_SKILLS in modules/skills_resume.py.
export const MIN_SKILLS = 10;

// Same separators the backend's count_skill_items uses, so this counter and the
// count the API reports never disagree.
export function countSkills(text: string): number {
  if (!text) return 0;
  return text
    .split(/[,;\n•·|]+|(?<=[a-z])\s+and\s+(?=[A-Za-z])/)
    .map(p => p.replace(/^[\s\t\-–—.]+|[\s\t\-–—.]+$/g, ""))
    .filter(p => p.length >= 2).length;
}

// A support-role list on purpose: the skills people undersell (de-escalation,
// training, scheduling) sit next to the named tools, which is the whole lesson.
// Exactly MIN_SKILLS lines, each short enough not to wrap: the example has to
// model the ask ("ten of these") and stay scannable. Longer entries turned the
// pane into a wall of text that ran past the frame.
export const SKILLS_EXAMPLE = `Live-chat support, 3 years (Zendesk)
De-escalating angry customers
Help-center articles in plain English
Excel: pivot tables, VLOOKUP
Google Sheets + CSV imports
Shopify admin: refunds, order edits
Slack and Notion, daily coordination
Training new hires — onboarding checklist
Scheduling shifts for a team of 6
Spanish (conversational)`;

// Scattered marks from ILLUSTRATION_IDENTITY.md — texture, kept in the margins so
// they never sit next to a line of the example and read as a bullet.
const MARKS = [
  { d: "M18 28h10M23 23v10", top: "5%", left: "88%", o: 0.45 },
  { d: "M18 23l10 10M28 23l-10 10", top: "90%", left: "8%", o: 0.3 },
  { d: "M23 20v16M16 24l14 8M30 24l-14 8", top: "78%", left: "90%", o: 0.38 },
];

export interface SkillsModalProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  onGenerate: () => void;
  saving: boolean;
  generating: boolean;
  error: string | null;
  hasResume: boolean;
  skillCount: number;
  minSkills: number;
  example: string;
}

export default function SkillsModal({
  open, value, onChange, onClose, onSave, onGenerate,
  saving, generating, error, hasResume, skillCount, minSkills, example,
}: SkillsModalProps) {
  if (!open) return null;

  const met = skillCount >= minSkills;
  const remaining = Math.max(0, minSkills - skillCount);
  const pct = Math.min(100, (skillCount / minSkills) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6">
      {/* The border earns its keep in dark mode: the writing pane and the page
          behind it are both near-black, so without it the frame disappears. */}
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl
          flex flex-col"
        style={{ maxHeight: "92vh" }}
        data-testid="skills-describe-modal"
      >
        {/* ── Night pane: the worked example, made the picture ───────────────── */}
        <aside
          className="relative shrink-0 overflow-hidden px-7 py-5 lg:px-10 lg:py-6"
          style={{ background: "#07030F" }}
        >
          {/* The storyboard background from public/bg — the fan is the same art the
              run dock uses, so the band reads as part of the product, not a new
              decoration. Scrim on top because the example sits over it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'url("/bg/fan-night.jpg") center 60% / cover no-repeat' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(7,3,15,.90) 0%, rgba(7,3,15,.72) 42%, rgba(7,3,15,.58) 100%)",
            }}
          />
          {MARKS.map((m, i) => (
            <svg
              key={i} aria-hidden viewBox="0 0 46 56"
              className="pointer-events-none absolute hidden h-7 w-6 lg:block"
              style={{ top: m.top, left: m.left, opacity: m.o }}
            >
              <path d={m.d} stroke="#C4B5FD" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </svg>
          ))}

          {/* Wide, not tall: the band runs the full width and the example sits in
              two columns beside the illustration, so it costs the dialog ~200px of
              height instead of a whole column. */}
          <div className="relative flex items-center gap-7 lg:gap-9">
            {/* The existing spot illustration from components/illustrations — the
                set the rest of the product already uses. Nothing new drawn here. */}
            <IllustrationTailored size={86} className="hidden shrink-0 sm:block" />

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                Ten skills, like this
              </p>
              <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {example.split("\n").map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-white/90">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-violet-300/70" />
                    <span className="truncate">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] leading-relaxed text-violet-200/75">
                Tools are <em className="not-italic font-medium text-white/90">named</em>. Years and
                levels are stated. Soft skills say what actually happened. One per line.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Writing pane: black and white, nothing competing with the text ──── */}
        <section className="flex min-h-0 flex-1 flex-col px-7 py-6 lg:px-10 lg:py-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-text">
                List your skills
              </h3>
              {/* Full-contrast, not muted: this is the promise the user is acting on,
                  not a caption (Igor, 09-20). */}
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-text">
                You write them. We fix spelling and grammar and sort them into groups —
                we never add skills you didn&apos;t write.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 shrink-0 rounded-lg p-2 text-text2/60 transition hover:bg-surface2 hover:text-text"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red/25 bg-red/10 px-4 py-3 text-sm text-red">
              {error}
            </div>
          )}

          {/* Placeholder is short and faint on purpose: a multi-line sample here read
              as real text the user had to clear before typing (Igor, 09-20). The
              worked example lives in the night pane, so this only names the format. */}
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            maxLength={4000}
            placeholder="One skill per line…"
            className="mt-4 min-h-[96px] w-full flex-1 resize-none rounded-xl border border-border bg-background
              px-4 py-3.5 text-[16px] leading-relaxed text-text placeholder:text-[15px] placeholder:text-text2/40
              focus:border-text focus:outline-none"
            data-testid="skills-describe-input"
          />

          <div className="mt-3 flex items-center gap-4">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-surface2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${met ? "bg-green" : "bg-text"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className={`text-[15px] font-bold tabular-nums ${met ? "text-green" : "text-text"}`}
              data-testid="skills-count"
            >
              {skillCount}<span className="text-text2/50">/{minSkills}</span>
            </span>
          </div>

          <p className="mt-2.5 text-[14px] text-text">
            {met
              ? "Enough for a real skills section — more is still better."
              : `Add ${remaining} more skill${remaining === 1 ? "" : "s"}. Saved to your profile either way.`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={onGenerate}
              disabled={generating || saving || !met || !hasResume}
              className="rounded-xl bg-text px-6 py-3 text-[15px] font-semibold text-background
                transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {generating ? "Generating…" : "Save & Generate"}
            </button>
            <button
              onClick={onSave}
              disabled={saving || generating}
              className="rounded-xl border border-border px-5 py-3 text-[15px] font-medium text-text
                transition hover:border-text disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save for later"}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-[15px] font-medium text-text2 transition hover:text-text"
            >
              Cancel
            </button>
          </div>

          {!hasResume && (
            <p className="mt-3 text-[13.5px] text-text2">
              Upload a resume to generate — your skills save fine without one.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
