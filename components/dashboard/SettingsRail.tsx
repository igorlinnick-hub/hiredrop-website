"use client";

/**
 * SettingsRail — the section rail on Settings (Igor 09-23: «в settings мне бы
 * хотелось чтоб всё было простроено как надо… куча всего намешано»).
 *
 * Before this, Settings was one long column where "who you are", "what forms
 * ask about you", your résumé, billing and a poster all ran together, and the
 * only way to find anything was to scroll and read. The rail names the parts
 * out loud and shows one at a time: a section is a subject, not a scroll depth.
 *
 * It is deliberately dumb — a list of {id, label, hint} and a callback. The page
 * owns which section is open and the deep link (?tab=), so a link from the
 * Upgrade banner still lands on Billing.
 */

export interface SettingsSection {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

export default function SettingsRail({
  sections, active, onPick,
}: {
  sections: SettingsSection[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <nav className="hd-set-rail" aria-label="Settings sections">
      {sections.map((s) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            aria-current={on ? "page" : undefined}
            data-testid={`settings-tab-${s.id}`}
            className={["hd-set-tab", on ? "is-on" : ""].join(" ")}
          >
            <span className="hd-set-tab-icon" aria-hidden>{s.icon}</span>
            <span className="min-w-0">
              <span className="hd-set-tab-label">{s.label}</span>
              <span className="hd-set-tab-hint">{s.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Rail glyphs: 20×20 strokes, sized and coloured by the CSS recipe. ── */
const g = {
  fill: "none" as const, stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export function IconPerson() {
  return (
    <svg viewBox="0 0 20 20" {...g} aria-hidden>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 16.5c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" />
    </svg>
  );
}
export function IconForm() {
  return (
    <svg viewBox="0 0 20 20" {...g} aria-hidden>
      <path d="M12 3H6.5A1.5 1.5 0 0 0 5 4.5v11A1.5 1.5 0 0 0 6.5 17h7a1.5 1.5 0 0 0 1.5-1.5V6l-3-3Z" />
      <path d="M12 3v3h3M8 10h4M8 13h4" />
    </svg>
  );
}
export function IconDoc() {
  return (
    <svg viewBox="0 0 20 20" {...g} aria-hidden>
      <rect x="4" y="3" width="12" height="14" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </svg>
  );
}
export function IconCard() {
  return (
    <svg viewBox="0 0 20 20" {...g} aria-hidden>
      <rect x="2.5" y="5" width="15" height="10" rx="2" />
      <path d="M2.5 8.5h15" />
    </svg>
  );
}
export function IconShare() {
  return (
    <svg viewBox="0 0 20 20" {...g} aria-hidden>
      <circle cx="6" cy="10" r="2.2" />
      <circle cx="14" cy="5.5" r="2.2" />
      <circle cx="14" cy="14.5" r="2.2" />
      <path d="M8 9l4-2.3M8 11l4 2.3" />
    </svg>
  );
}
