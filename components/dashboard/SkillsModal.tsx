"use client";

/**
 * "List your skills" — where the user writes the raw material for their
 * skills-first resume.
 *
 * Style (Igor, 2026-09-20, holding up Flow's panels as the reference): the whole
 * dialog IS the picture. A dark, heavily blurred ground; one large serif line with
 * the emphasis carried by an italic word; a single sans sub-line; content as light
 * chips on the image; a cream primary button. No white half, no second column of
 * instructions — the example shrank to a handful of chips because the band was
 * turning into a wall of text.
 *
 * The ground is ours: public/bg/skills-photo.jpg is one of our own onboarding
 * renders blurred and darkened (brand-visuals/skills-photo.py), so nothing in it
 * competes with type and no outside art was introduced.
 *
 * Instrument Serif is loaded in app/layout.tsx. It is used HERE only — globals.css
 * reserves Space Grotesk for marketing and keeps app headings on Inter, and this
 * dialog is the one surface that deliberately reads like a poster.
 */

const SERIF = "'Instrument Serif', 'Playfair Display', Georgia, serif";

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

// Four chips, not ten lines. Each one models a different thing worth writing:
// a tool with years, a soft skill phrased as what happened, a named tool stack,
// a language. The full list was doing the same teaching at ten times the weight.
export const SKILLS_EXAMPLE = `Live-chat support, 3 years (Zendesk)
Training new hires — onboarding checklist
Excel: pivot tables, VLOOKUP
Spanish (conversational)`;

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
  const chips = example.split("\n").filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px] sm:p-6">
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl
          shadow-2xl lg:aspect-[16/9]"
        style={{ background: "#0A0710" }}
        data-testid="skills-describe-modal"
      >
        {/* The ground — one image, full bleed */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'url("/bg/skills-photo.jpg") center / cover no-repeat' }}
        />
        {/* Reading scrim: type lives on the left, so the dark stays heaviest there */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(8,5,14,.92) 0%, rgba(8,5,14,.74) 44%, rgba(8,5,14,.30) 100%)",
          }}
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full
            bg-white/12 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
        >
          <svg className="h-4.5 w-4.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-7 py-8 sm:px-10 lg:px-12 lg:py-10">
          <h3
            className="max-w-2xl text-[32px] leading-[1.08] tracking-[-0.01em] text-white sm:text-[40px] lg:text-[46px]"
            style={{ fontFamily: SERIF }}
          >
            Ten skills, in <em className="italic">your</em> own words.
          </h3>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
            You write them — we fix spelling and grammar and sort them into groups. We never add
            skills you didn&apos;t write.
          </p>

          {/* Chips: the example, at a glance */}
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span
                key={i}
                className="rounded-lg bg-white/12 px-3 py-1.5 text-[13.5px] text-white/90 backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red/30 bg-red/15 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}

          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            maxLength={4000}
            placeholder="One skill per line…"
            className="mt-5 min-h-[96px] w-full flex-1 resize-none rounded-2xl border border-white/15
              bg-white/[0.07] px-4 py-3.5 text-[16px] leading-relaxed text-white backdrop-blur-sm
              placeholder:text-[15px] placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            data-testid="skills-describe-input"
          />

          <div className="mt-3 flex items-center gap-4">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full transition-all duration-500 ${met ? "bg-green" : "bg-white"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className={`text-[15px] font-bold tabular-nums ${met ? "text-green" : "text-white"}`}
              data-testid="skills-count"
            >
              {skillCount}<span className="text-white/45">/{minSkills}</span>
            </span>
          </div>

          <p className="mt-2.5 text-[13.5px] text-white/70">
            {met
              ? "Enough for a real skills section — more is still better."
              : `Add ${remaining} more. Saved to your profile either way.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              onClick={onGenerate}
              disabled={generating || saving || !met || !hasResume}
              className="rounded-xl bg-[#F2EFE9] px-6 py-3 text-[15px] font-semibold text-[#14101C]
                transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {generating ? "Generating…" : "Save & Generate"}
            </button>
            <button
              onClick={onSave}
              disabled={saving || generating}
              className="rounded-xl border border-white/25 px-5 py-3 text-[15px] font-medium text-white
                transition hover:border-white/50 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save for later"}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-[15px] font-medium text-white/70 transition hover:text-white"
            >
              Cancel
            </button>
            {!hasResume && (
              <span className="text-[13px] text-white/60">
                Upload a resume to generate — skills save without one.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
