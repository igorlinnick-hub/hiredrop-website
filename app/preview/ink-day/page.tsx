"use client";

import { useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import LaunchModeCards from "@/components/dashboard/LaunchModeCards";
import Button from "@/components/ui/Button";

/**
 * Design-review page for the INK day skin (Igor 09-19: the dashboard goes
 * black-and-white like the extension popup, with amber and violet carried by
 * PICTURES instead of by a page-wide tint).
 *
 * Public and mock-only, same as /preview/mode-cards — it exists so the day and
 * night skins can be judged side by side without a campaign, a login or real
 * data. Every surface here uses the SAME classes the dashboard does; nothing is
 * re-styled locally, so what you see is what ships.
 */

const NAV = [
  { label: "Dashboard", active: true },
  { label: "History", active: false },
  { label: "Platforms", active: false },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-text uppercase tracking-wide">{title}</h2>
        {note && <p className="text-xs text-text2 mt-1">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PreviewInkDay() {
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<"auto" | "tap">("auto");

  return (
    <div className={`hd-dash-root app-ui ${dark ? "dark" : ""} min-h-screen bg-background`}>
      <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">
              <span className="text-accent">Hire</span>Drop — ink skin
            </h1>
            <p className="text-xs text-text2 mt-1">
              Black actions · paper cards · colour only in the photographs
            </p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="theme-toggle text-xs font-medium text-text2 border border-border rounded-full px-3 py-1.5 hover:text-text"
          >
            {dark ? "☀︎ Day" : "☾ Night"}
          </button>
        </header>

        <Section
          title="Stats"
          note="One tile inverts against its siblings — the popup's black/white mix, applied to the metric that matters."
        >
          <StatsCards totalJobs={1056} totalApplications={43} applicationsToday={7} />
        </Section>

        <Section title="Actions" note="One recipe for every primary action: ink face, white type, gold only as the hover halo.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Start Campaign</Button>
            <Button variant="secondary">Open Dashboard</Button>
            <Button variant="ghost">Cancel</Button>
            <Button disabled>Start Campaign</Button>
            <Button variant="danger">Stop</Button>
          </div>
        </Section>

        <Section title="Navigation" note="Active item = ink tile, gold icon. Everything else stays quiet.">
          <nav className="hd-sidenav w-[236px] rounded-2xl border border-border bg-surface/75 p-3 space-y-1">
            {NAV.map((item) => (
              <span
                key={item.label}
                className={[
                  "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition cursor-default",
                  item.active ? "nav-active bg-accent/10 text-accent" : "text-text2",
                ].join(" ")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                {item.label}
              </span>
            ))}
          </nav>
        </Section>

        <Section
          title="Live Activity"
          note="The violet moment: by day this card wears the night photograph, exactly like the popup's live-process card."
        >
          <div className="max-w-md">
            <div className="hd-wellcard relative isolate bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
              <div aria-hidden className="hd-well-img absolute inset-0 -z-10 pointer-events-none" />
              <div aria-hidden className="hd-well-wash absolute inset-0 -z-10 pointer-events-none" />
              <div className="px-5 py-3.5 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold text-text">Live Activity</h3>
              </div>
              <div className="relative px-5 pt-32 pb-10 min-h-[340px] flex flex-col justify-end text-center overflow-hidden shrink-0">
                <div className="relative flex flex-col items-center">
                  <div className="hd-plate">
                    <div className="hd-glass-num relative text-[4.25rem] font-bold leading-none tabular-nums">7</div>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-text2">
                    applications sent today
                  </p>
                  <p className="mt-1.5 text-xs text-text2">128 jobs ready in the queue</p>
                </div>
              </div>
              <div className="px-5 pb-5 shrink-0 text-center text-xs text-text2">
                Filling the application form — Senior Designer @ Figma
              </div>
              <div className="w-full px-5 py-2.5 border-t border-border text-center text-[11px] font-medium text-text2">
                Show activity log
              </div>
            </div>
          </div>
        </Section>

        <Section title="Modes" note="The amber moment: the Auto/Tap cards keep the warm fan. Selected = ink ring, not a glow.">
          <div className="max-w-md">
            <LaunchModeCards mode={mode} onAuto={() => setMode("auto")} onTap={() => setMode("tap")} />
          </div>
        </Section>
      </div>
    </div>
  );
}
