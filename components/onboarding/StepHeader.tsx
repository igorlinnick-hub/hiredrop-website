import type { ReactNode } from "react";

// Premium per-step header band for the onboarding quiz — replaces the old thin
// monoline StepIcon. A colored glass tile + a friendly icon + one short message
// so the person instantly gets what this step is for. Cohesive brand band,
// accent varies by beat (violet default; mint for the "safe / free / done" steps).

type Accent = "violet" | "mint";
const C: Record<Accent, [string, string]> = {
  violet: ["#7d6ff0", "#6C5CE7"],
  mint: ["#2fd6ac", "#00B894"],
};

const I = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">{d}</svg>
);

const STEP: Record<number, { msg: string; accent: Accent; icon: ReactNode }> = {
  1: { accent: "violet", msg: "The basics we'll put on every application.",
       icon: I(<><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" /></>) },
  2: { accent: "violet", msg: "What you're after — so we match the right roles.",
       icon: I(<><path d="M4 6h16M7 12h10M10 18h4" /></>) },
  3: { accent: "mint", msg: "How HireDrop applies without risking your account.",
       icon: I(<><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>) },
  4: { accent: "violet", msg: "Where HireDrop should apply for you.",
       icon: I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>) },
  5: { accent: "violet", msg: "Your resume — we tailor a fresh one for every role.",
       icon: I(<><path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>) },
  6: { accent: "violet", msg: "A quick check so it gets past the filters.",
       icon: I(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6M11 8v6" /></>) },
  7: { accent: "violet", msg: "Your voice — so cover letters sound like you.",
       icon: I(<><path d="M4 20l4-1L19 8a2 2 0 00-3-3L5 16l-1 4z" /><path d="M14 6l4 4" /></>) },
  8: { accent: "mint", msg: "Start free — 40 applications, no card.",
       icon: I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>) },
  9: { accent: "violet", msg: "The piece that actually applies — right from your browser.",
       icon: I(<path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />) },
  10: { accent: "mint", msg: "You're set — here's what happens next.",
        icon: I(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>) },
};

export default function StepHeader({ step }: { step: number }) {
  const s = STEP[step];
  if (!s) return null;
  const [c1, c2] = C[s.accent];
  return (
    <div className="flex items-center gap-4 mb-7 p-4 rounded-2xl border border-border overflow-hidden relative"
      style={{ background: `linear-gradient(120deg, ${c1}14, ${c2}08 60%, transparent)` }}>
      <span aria-hidden className="absolute -right-6 -top-10 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c1}22, transparent 70%)`, filter: "blur(8px)" }} />
      <span className="relative shrink-0 flex items-center justify-center w-12 h-12 rounded-xl text-white"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `0 10px 22px -8px ${c2}, inset 0 1px 0 rgba(255,255,255,.3)` }}>
        {s.icon}
      </span>
      <p className="relative text-[15px] sm:text-base font-semibold text-text leading-snug"
        style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        {s.msg}
      </p>
    </div>
  );
}
