"use client";

/**
 * Logged-out look at Drop — the HireDrop character and its chat.
 *
 * The orb is the REAL component; only the answers are canned here (the live one
 * answers from the account + the product fact sheet on the server).
 */

import { useState } from "react";
import Buddy from "@/components/buddy/Buddy";
import BuddyOrb, { type BuddyState } from "@/components/buddy/BuddyOrb";

const MOODS: { state: BuddyState; label: string; note: string }[] = [
  { state: "idle", label: "Idle", note: "Breathing, blinking every few seconds, watching your cursor. Never perfectly still — that is the whole trick." },
  { state: "listening", label: "Listening", note: "Chat open, cursor in the input. The pupil dilates and one ring breathes outward." },
  { state: "thinking", label: "Thinking", note: "Waiting on the model. The pupil contracts to a point and three sparks take an orbit — a mind at work, not a spinner." },
  { state: "speaking", label: "Speaking", note: "Answering. The core pulses against the words appearing below it." },
  { state: "success", label: "Success", note: "An application just went out. Green burst using the illustration set's own marks." },
  { state: "stuck", label: "Stuck", note: "Campaign stalled, cap hit, extension asleep. Desaturates, slows right down, looks at the floor — then offers the fix." },
];

/* Canned answers, worded the way the live one is instructed to answer:
   short, specific, and honest about what it doesn't know. */
const CANNED: [RegExp, string][] = [
  [/why.*(no|0|zero).*(application|applied|apply)|nothing.*(sent|went)/i,
   "Two reasons today. Your extension last checked in 6 hours ago, so nothing could run — reopen Chrome and hit Start. And 4 jobs you swiped are still approved but unsent; I can push those out first."],
  [/resume|cv/i,
   "You're sending the skills-first resume. Per job, I tailor it when the job posting has a real description; if not, it goes out as-is. You can switch the default in Settings → Resume."],
  [/safe|ban|block|risk|detect/i,
   "Applications go out from your own Chrome, in a visible window, at human pace — never from our servers. That's why there's a daily cap. We never solve captchas and we never click through a consent wall for you."],
  [/platform|indeed|linkedin|where/i,
   "Right now: Indeed, Greenhouse, Lever, Ashby and ZipRecruiter — all five verified end to end. LinkedIn and Workday are not live yet, and I won't pretend otherwise."],
  [/cost|price|pay|plan|billing/i,
   "$12 a week or $39 a month, cancel any time. You're on the weekly plan, renewing in 3 days."],
  [/cap|limit|how many/i,
   "Your cap is 30 applications a day, spread across the platforms you connected. You've used 11 today."],
];

const FALLBACK =
  "I don't know that one, and I'd rather say so than guess. Want me to pass it to the team? They answer from the dashboard.";

async function mockAsk(q: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  for (const [re, a] of CANNED) if (re.test(q)) return a;
  return FALLBACK;
}

export default function BuddyPreview() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<"context" | "moods">("context");
  const [mood, setMood] = useState<"idle" | "success" | "stuck">("stuck");

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="sticky top-0 z-[60] border-b border-border bg-surface/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-text mr-auto">Drop — brand character</p>
          <Segmented
            value={view}
            onChange={(v) => setView(v as "context" | "moods")}
            options={[["context", "In context"], ["moods", "All moods"]]}
          />
          {view === "context" && (
            <Segmented
              value={mood}
              onChange={(v) => setMood(v as "idle" | "success" | "stuck")}
              options={[["idle", "Idle"], ["success", "Just applied"], ["stuck", "Stalled"]]}
            />
          )}
          <button
            onClick={() => setDark((d) => !d)}
            className="px-3.5 py-2 rounded-xl border border-border text-sm font-medium text-text2
                       hover:text-text transition active:scale-[.97]"
          >
            {dark ? "Day" : "Night"}
          </button>
        </div>
      </div>

      {view === "context" ? <ContextView mood={mood} /> : <MoodsView />}
    </div>
  );
}

function Segmented({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex rounded-xl border border-border overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={[
            "px-3 py-2 text-sm font-medium transition",
            value === v ? "bg-accent text-white" : "text-text2 hover:text-text",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ContextView({ mood }: { mood: "idle" | "success" | "stuck" }) {
  const nudge =
    mood === "stuck"
      ? "Nothing has gone out today. I know why — want me to show you?"
      : null;

  return (
    <>
      <div className="flex min-h-[calc(100vh-57px)]">
        <aside className="hd-sidenav hidden lg:flex flex-col w-[236px] shrink-0 border-r border-border
                          bg-surface/75 backdrop-blur-xl px-3 py-5">
          <span className="px-3.5 mb-7 text-lg font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </span>
          {["Dashboard", "History", "Platforms", "Settings"].map((l, i) => (
            <span key={l} className={[
              "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium",
              i === 0 ? "nav-active bg-accent/10 text-accent" : "text-text2",
            ].join(" ")}>{l}</span>
          ))}
          <div className="mt-6 rounded-2xl border border-border p-3.5">
            <p className="text-[13px] font-semibold text-text mb-2">What&apos;s left</p>
            {[0, 1, 2].map((i) => <div key={i} className="h-3 rounded bg-surface2 mb-2" />)}
          </div>
        </aside>

        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold text-text mb-5">Your search</h2>
          <div className="hd-glass rounded-2xl p-5 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {["product manager", "program manager", "remote"].map((k) => (
                <span key={k} className="px-3 py-1.5 rounded-full bg-surface2 border border-border text-sm text-text2">{k}</span>
              ))}
            </div>
            <div className="flex gap-3">
              <span className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold">Start applying</span>
              <span className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text2">Find jobs</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {["Jobs found", "Applications", "Today"].map((l, i) => (
              <div key={l} className={["rounded-2xl p-5 border border-border", i === 1 ? "hd-tile-ink" : "bg-surface"].join(" ")}>
                <p className="text-[12.5px] text-text2">{l}</p>
                <p className="text-2xl font-bold text-text mt-1">{[719, 128, mood === "stuck" ? 0 : 3][i]}</p>
              </div>
            ))}
          </div>
          <div className="hd-glass rounded-2xl p-5 space-y-2 pb-28">
            <p className="text-sm font-semibold text-text mb-3">Your jobs</p>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface2/60 border border-border" />
            ))}
          </div>
        </div>
      </div>

      <Buddy ask={mockAsk} mood={mood} nudge={nudge} />
    </>
  );
}

function MoodsView() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <p className="text-[13px] text-text2 mb-10 leading-relaxed max-w-lg">
        One character, six moods. Nothing here is a looping GIF: the pupil follows your
        cursor, the blink is on a random timer, and the mood is set by what the product
        is actually doing.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
        {MOODS.map((m) => (
          <section key={m.state} className="flex gap-5 items-start">
            <div className="shrink-0 pt-1">
              <BuddyOrb size={78} state={m.state} />
            </div>
            <div className="min-w-0 pt-2">
              <p className="text-[13px] font-semibold text-text mb-1">{m.label}</p>
              <p className="text-[12.5px] text-text2 leading-snug">{m.note}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 pt-10 border-t border-border">
        <p className="text-[13px] font-semibold text-text mb-1">At the size it actually ships</p>
        <p className="text-[12.5px] text-text2 leading-snug mb-6 max-w-lg">
          58px in the corner of every dashboard route. Big enough to read as a creature,
          small enough to ignore.
        </p>
        <div className="flex items-center gap-8">
          {(["idle", "thinking", "stuck"] as BuddyState[]).map((s) => (
            <BuddyOrb key={s} size={58} state={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
