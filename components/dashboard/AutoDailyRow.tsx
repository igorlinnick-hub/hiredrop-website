"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { detectBrowser } from "@/components/dashboard/StartReadiness";
import {
  type AutoDailyState,
  hourLabel,
  nextRunLabel,
  parseAutoDailyReply,
  todayLabel,
} from "@/lib/campaign/auto-daily";

// "Apply every day automatically" — under Start on the dashboard (jobflow ext auto-daily.js).
//
// Why: over 14 days 6 had zero applications — a run only happened when someone opened this
// page and pressed Start. With this on, the extension presses Start itself once a day.
//
// The setting lives in the extension (the schedule belongs to the machine where Chrome runs),
// so this row is a remote control over the ping.js bridge, and everything it shows — on/off,
// the hour, the next run, what happened today — is what the extension answered, never what
// we just sent. No answer = we say why there's nothing to control, instead of a switch that
// does nothing:
//   - not Chrome, or no bridge in this tab → it needs Chrome with the extension;
//   - a bridge that answers PING but not this → an older extension: update it;
//   - a bridge that answers "context_invalidated" → the extension was reloaded: refresh.

const REPLY_WAIT_MS = 3500;
const SET_WAIT_MS = 6000;
const REFRESH_MS = 60_000;

type Phase = "checking" | "ready" | "no-extension" | "not-desktop" | "needs-update" | "stale";

export default function AutoDailyRow() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [state, setState] = useState<AutoDailyState | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, setNowTick] = useState(0); // re-render so "next run" never reads stale
  const setTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = useCallback(() => window.postMessage({ type: "HIREDROP_GET_AUTO_DAILY" }, "*"), []);

  useEffect(() => {
    // Browser sniffing only on the client, after hydration (SSR always reads "chromium").
    const browser = detectBrowser();
    if (browser !== "chromium") {
      const t = setTimeout(() => setPhase(browser === "mobile" ? "not-desktop" : "no-extension"), 0);
      return () => clearTimeout(t);
    }
    let bridgeSeen = false;
    let answered = false;
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data) return;
      if (e.data === "HIREDROP_PONG") { bridgeSeen = true; return; }
      if (typeof e.data !== "object" || e.data.type !== "HIREDROP_AUTO_DAILY") return;
      if (setTimer.current) { clearTimeout(setTimer.current); setTimer.current = null; }
      setSaving(false);
      const parsed = parseAutoDailyReply(e.data);
      if (!parsed) {
        if (e.data.error === "context_invalidated") setPhase("stale");
        else setErr("The extension couldn't read this setting — try again in a moment.");
        return;
      }
      answered = true;
      setErr(null);
      setState(parsed);
      setPhase("ready");
    }
    window.addEventListener("message", onMsg);
    window.postMessage("HIREDROP_PING", "*");
    ask();
    const verdict = setTimeout(() => {
      if (!answered) setPhase(bridgeSeen ? "needs-update" : "no-extension");
    }, REPLY_WAIT_MS);
    const iv = setInterval(() => { setNowTick((n) => n + 1); if (!document.hidden) ask(); }, REFRESH_MS);
    window.addEventListener("focus", ask);
    return () => {
      window.removeEventListener("message", onMsg);
      window.removeEventListener("focus", ask);
      clearTimeout(verdict);
      clearInterval(iv);
      if (setTimer.current) clearTimeout(setTimer.current);
    };
  }, [ask]);

  function save(enabled: boolean, hour: number) {
    setSaving(true);
    setErr(null);
    window.postMessage({ type: "HIREDROP_SET_AUTO_DAILY", enabled, hour }, "*");
    if (setTimer.current) clearTimeout(setTimer.current);
    setTimer.current = setTimeout(() => {
      setSaving(false);
      setErr("The extension didn't answer — reload this tab and try again.");
      ask(); // show what it actually holds, not what we hoped to set
    }, SET_WAIT_MS);
  }

  const ready = phase === "ready" && state !== null;
  const on = ready && state.enabled;
  const hour = state?.hour ?? 9;
  const maxHour = state?.maxHour ?? 20;

  let status: string;
  if (phase === "checking") status = "Checking the HireDrop extension…";
  else if (phase === "not-desktop") status = "Set this on your computer — it runs in Chrome with the HireDrop extension.";
  else if (phase === "no-extension") status = "Needs Chrome with the HireDrop extension on this computer.";
  else if (phase === "needs-update") status = "Update the HireDrop extension to use this.";
  else if (phase === "stale") status = "The extension was just updated — refresh this tab to change this.";
  else if (!on) status = "Off — campaigns start only when you press Start.";
  else status = nextRunLabel(state!.nextRun) ?? `Every day around ${hourLabel(hour)}.`;
  const today = on ? todayLabel(state!.today) : null;
  const noLaunchYet = on && !state!.lastLaunch;

  return (
    <div
      className="rounded-xl border border-border bg-surface px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      data-testid="auto-daily-row"
      data-phase={phase}
      data-on={on ? "true" : "false"}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          aria-hidden="true"
          className={[
            "mt-0.5 grid place-items-center w-8 h-8 rounded-lg shrink-0 transition-colors",
            on ? "bg-accent/12 text-accent" : "bg-surface2 text-text2/70",
          ].join(" ")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 2.5M5 3 2.5 5.5M19 3l2.5 2.5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">Apply every day automatically</p>
          <p className="text-xs text-text2 mt-0.5" data-testid="auto-daily-status" aria-live="polite">{status}</p>
          {today && <p className="text-xs text-text2 mt-0.5" data-testid="auto-daily-today">{today}</p>}
          {noLaunchYet && (
            <p className="text-xs text-text2 mt-0.5">
              It repeats your last launch — press Start once and it takes over from there.
            </p>
          )}
          {err && <p className="text-xs text-red mt-0.5" data-testid="auto-daily-error">{err}</p>}
          <p className="text-[11px] text-text2/70 mt-1">Runs while your computer is on and Chrome is open.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
        <label className="relative">
          <span className="sr-only">Time to start each day</span>
          <select
            value={hour}
            disabled={!ready || saving}
            onChange={(e) => save(on, Number(e.target.value))}
            data-testid="auto-daily-hour"
            className="appearance-none pl-3 pr-6 py-1 text-xs font-medium rounded-full border border-border bg-surface
              text-text2 cursor-pointer hover:border-accent/40 hover:text-text focus:outline-none focus:border-accent/50
              disabled:opacity-50 disabled:cursor-not-allowed transition tabular-nums"
          >
            {Array.from({ length: maxHour + 1 }, (_, h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text2/50 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Apply every day automatically"
          disabled={!ready || saving}
          onClick={() => save(!on, hour)}
          data-testid="btn-auto-daily"
          className={[
            "relative w-10 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            on ? "bg-green" : "bg-text/20",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-[left]",
              on ? "left-[19px]" : "left-[3px]",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
}
