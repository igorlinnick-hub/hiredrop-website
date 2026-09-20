"use client";

import { useState } from "react";
import TapProgressDock, { type DockDemo, type DockShape } from "@/components/dashboard/TapProgressDock";

/**
 * Logged-out look at the tap progress dock: both shapes, both themes, every state,
 * plus where it actually sits on a dashboard page. The dock is the REAL component
 * in demo mode (seeded numbers) — everything around it is a stand-in.
 */

const STATES: { label: string; note: string; demo: DockDemo }[] = [
  {
    label: "Applying",
    note: "A run is live and working through the cards you swiped. The dot pulses, the company is the one being filled right now, Stop is one click.",
    demo: {
      done: 3, waiting: 4, held: 0, running: true, doneToday: 3,
      next: { title: "Senior Product Manager", company: "Acme Robotics", platform: "greenhouse" },
    },
  },
  {
    label: "Stranded — the one that matters",
    note: "You swiped 10, six went out, then the browser closed. The four left are approved forever and nothing picks them up on its own. The fix is on the block, not in a reminder.",
    demo: {
      done: 6, waiting: 4, held: 0, running: false, doneToday: 6,
      next: { title: "Program Manager", company: "Northwind", platform: "lever" },
    },
  },
  {
    label: "Held by today's cap",
    note: "Ban-safety and the daily budget hold part of the batch back. Said out loud — a queue that shrank quietly looks exactly like a broken one.",
    demo: {
      done: 8, waiting: 5, held: 2, running: true, doneToday: 8,
      next: { title: "Operations Lead", company: "Cirrus Health", platform: "ashby" },
    },
  },
  {
    label: "Caught up",
    note: "The whole batch is with the employers. The arc goes green, and the dock retires itself after half a minute.",
    demo: { done: 7, waiting: 0, held: 0, running: true, doneToday: 7, next: null },
  },
];

const CONTEXT_DEMO: DockDemo = {
  done: 3, waiting: 4, held: 0, running: true, doneToday: 3,
  next: { title: "Senior Product Manager", company: "Acme Robotics", platform: "greenhouse" },
};

export default function TapDockPreview() {
  const [dark, setDark] = useState(false);
  const [shape, setShape] = useState<DockShape>("dome");
  const [view, setView] = useState<"states" | "context">("context");

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      {/* Controls ride above everything, including the fixed dock in context view. */}
      <div className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-text mr-auto">Tap progress dock</p>
          <Segmented
            value={view}
            onChange={(v) => setView(v as "states" | "context")}
            options={[["context", "In context"], ["states", "All states"]]}
          />
          <Segmented
            value={shape}
            onChange={(v) => setShape(v as DockShape)}
            options={[["dome", "Dome"], ["arch", "Arch"]]}
          />
          <button
            onClick={() => setDark((d) => !d)}
            className="px-3.5 py-2 rounded-xl border border-border text-sm font-medium text-text2
              hover:text-text transition active:scale-[.97]"
          >
            {dark ? "Day" : "Night"}
          </button>
        </div>
      </div>

      {view === "context" ? <ContextView shape={shape} /> : <StatesView shape={shape} />}
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

/** Where it lands: a stand-in dashboard with the real dock fixed to the viewport. */
function ContextView({ shape }: { shape: DockShape }) {
  return (
    <>
      <div className="flex min-h-[calc(100vh-57px)]">
        <aside className="hd-sidenav hidden lg:flex flex-col w-[236px] shrink-0 border-r border-border
          bg-surface/75 backdrop-blur-xl px-3 py-5">
          <span className="px-3.5 mb-7 text-lg font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </span>
          {["Dashboard", "History", "Platforms"].map((l, i) => (
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
                <p className="text-2xl font-bold text-text mt-1">{[719, 128, 3][i]}</p>
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

      <TapProgressDock demo={CONTEXT_DEMO} shape={shape} />
    </>
  );
}

function StatesView({ shape }: { shape: DockShape }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="hd-dock-static space-y-12">
        {STATES.map((s) => (
          <section key={s.label}>
            <p className="text-[13px] font-semibold text-text mb-1">{s.label}</p>
            <p className="text-[12.5px] text-text2 mb-3 leading-snug">{s.note}</p>
            <TapProgressDock demo={s.demo} shape={shape} />
          </section>
        ))}
      </div>
      <p className="mt-10 text-xs text-text2/70">
        On the real dashboard it is fixed to the bottom of the viewport on every route
        except the deck itself, and rises into place when you arrive.
      </p>
    </div>
  );
}
