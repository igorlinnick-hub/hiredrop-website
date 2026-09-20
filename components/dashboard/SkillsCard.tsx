"use client";

import { IllustrationTailored } from "@/components/illustrations";

/**
 * "Skills-First Version" — the Settings block for the second resume.
 *
 * Igor (09-20) wanted this to read as an inserted picture rather than another
 * beige panel: dark, night-violet, with the list animating inside it. So the card
 * carries its own aurora (a slow drift across the gradient, same trick as the
 * campaign dock he pointed at) and the rows stagger in. The palette matches
 * SkillsModal — the two surfaces are the same feature, so they look like it.
 *
 * The rows are real when the resume has been generated (the user's own grouping)
 * and a sample otherwise, so an empty state still shows what the output looks like.
 */

const SAMPLE_GROUPS = [
  { group: "Customer Support", skills: ["Zendesk", "De-escalation", "Help-center writing"] },
  { group: "Data & Tools", skills: ["Excel", "Google Sheets", "Shopify admin"] },
  { group: "Team", skills: ["Training new hires", "Shift scheduling"] },
];

export interface SkillsCardProps {
  hasSkills: boolean;
  isDefault: boolean;
  groups: { group: string; skills: string[] }[];
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onMakeDefault: () => void;
  onUseOriginal: () => void;
  viewing: boolean;
  generating: boolean;
  saving: boolean;
}

export default function SkillsCard({
  hasSkills, isDefault, groups, busy,
  onView, onEdit, onMakeDefault, onUseOriginal, viewing, generating, saving,
}: SkillsCardProps) {
  const rows = groups.length > 0 ? groups : SAMPLE_GROUPS;
  const real = groups.length > 0;

  return (
    <div
      id="skills"
      className="relative overflow-hidden rounded-2xl scroll-mt-24"
      style={{ background: "linear-gradient(135deg, #100622 0%, #16072F 45%, #05020B 100%)" }}
      data-testid="skills-resume-block"
    >
      {/* Aurora: a wide violet sweep drifting across the card. Slow on purpose —
          a panel you look at while reading must not pulse at you. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-[180%] opacity-50"
        style={{
          background:
            "linear-gradient(100deg, transparent 12%, rgba(124,58,237,.38) 32%, rgba(196,181,253,.30) 47%, rgba(109,40,217,.34) 62%, transparent 86%)",
          filter: "blur(28px)",
          animation: "hdSkillsAurora 14s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes hdSkillsAurora {
          from { transform: translateX(-8%) }
          to   { transform: translateX(8%) }
        }
        @keyframes hdSkillsRow {
          from { opacity: 0; transform: translateY(8px) }
          to   { opacity: 1; transform: none }
        }
        @media (prefers-reduced-motion: reduce) {
          .hd-skills-aurora, .hd-skills-row { animation: none !important }
        }
      `}</style>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <IllustrationTailored size={44} className="hidden shrink-0 sm:block" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                Skills-First Version
              </p>
              <p className="mt-1 max-w-lg text-[14px] leading-relaxed text-white/85">
                {hasSkills
                  ? isDefault
                    ? "Your grouped skills lead the page; each role is one compact line."
                    : "Generated. Make it your default if you prefer leading with skills."
                  : "You list your skills, we group them and put them up front — work history compressed to 1-2 lines per role."}
              </p>
            </div>
          </div>
          {hasSkills && (
            <span
              className={[
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                isDefault
                  ? "border-green/40 bg-green/15 text-green"
                  : "border-white/15 bg-white/5 text-violet-200/80",
              ].join(" ")}
            >
              {isDefault ? "Active" : "Not active"}
            </span>
          )}
        </div>

        {/* The grouping, staggered in — this is the part Igor wanted alive */}
        <ul className="mt-5 space-y-2">
          {rows.map((g, i) => (
            <li
              key={`${g.group}-${i}`}
              className="hd-skills-row flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl
                border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
              style={{
                animation: `hdSkillsRow .5s cubic-bezier(.22,.61,.36,1) both`,
                animationDelay: `${120 + i * 110}ms`,
              }}
            >
              <span className="text-[13.5px] font-semibold text-white">{g.group}</span>
              <span className="text-[13px] text-violet-200/75">
                {(g.skills || []).join(" · ")}
              </span>
            </li>
          ))}
        </ul>

        {!real && (
          <p className="mt-2.5 text-[12.5px] text-violet-200/60">
            Example grouping — yours is built from the skills you write.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            className="rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-[#14082E]
              transition hover:bg-violet-50 disabled:opacity-40"
          >
            {generating ? "Generating…" : hasSkills ? "Edit skills & regenerate" : "List your skills"}
          </button>
          {hasSkills && (
            <button
              onClick={onView}
              disabled={viewing || generating}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-[14px] font-medium text-white
                transition hover:border-white/40 disabled:opacity-40"
            >
              {viewing ? "Loading…" : "View"}
            </button>
          )}
          {hasSkills && !isDefault && (
            <button
              onClick={onMakeDefault}
              disabled={saving}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-[14px] font-medium text-white
                transition hover:border-white/40 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Use Skills Version"}
            </button>
          )}
          {hasSkills && isDefault && (
            <button
              onClick={onUseOriginal}
              disabled={saving}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-[14px] font-medium text-white
                transition hover:border-white/40 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Use Original"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
