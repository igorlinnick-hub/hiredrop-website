"use client";

import Link from "next/link";

const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/hiredrop-%E2%80%94-auto-apply-on/bjideoimenmpcpnhppneehmjplkgkede";

/**
 * Animated demo of the install + connect flow.
 *
 * Loops through three "frames" via CSS opacity keyframes:
 *   1. Chrome Web Store install — "Add to Chrome" button pulses
 *   2. Browser toolbar — HireDrop icon highlighted, popup opens
 *   3. Connected state — green check on the dashboard
 *
 * Pure CSS, no deps, no JS state machine. The whole cycle is 9s.
 */
export default function InstallFlow() {
  return (
    <div>
      {/* keyframes scoped to this component via a styled-jsx block */}
      <style jsx>{`
        @keyframes hd-frame-1 {
          0%, 28% { opacity: 1; }
          33%, 100% { opacity: 0; }
        }
        @keyframes hd-frame-2 {
          0%, 33% { opacity: 0; }
          38%, 61% { opacity: 1; }
          66%, 100% { opacity: 0; }
        }
        @keyframes hd-frame-3 {
          0%, 66% { opacity: 0; }
          71%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes hd-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(108,92,231,0.55); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(108,92,231,0); }
        }
        @keyframes hd-dot {
          0%, 28% { background:#6c5ce7; transform: scale(1.25); }
          33%, 100% { background: rgba(255,255,255,0.18); transform: scale(1); }
        }
        @keyframes hd-dot-2 {
          0%, 33% { background: rgba(255,255,255,0.18); transform: scale(1); }
          38%, 61% { background:#6c5ce7; transform: scale(1.25); }
          66%, 100% { background: rgba(255,255,255,0.18); transform: scale(1); }
        }
        @keyframes hd-dot-3 {
          0%, 66% { background: rgba(255,255,255,0.18); transform: scale(1); }
          71%, 100% { background:#6c5ce7; transform: scale(1.25); }
        }
        .frame { animation-duration: 9s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
        .pulse-btn { animation: hd-pulse 1.6s ease-in-out infinite; }
        .dot { width: 6px; height: 6px; border-radius: 9999px; transition: none; }
        .dot1 { animation: hd-dot 9s ease-in-out infinite; }
        .dot2 { animation: hd-dot-2 9s ease-in-out infinite; }
        .dot3 { animation: hd-dot-3 9s ease-in-out infinite; }
      `}</style>

      {/* The animated demo canvas */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0f1117] to-[#1a1d27]">
        {/* ────── Frame 1: Chrome Web Store ────── */}
        <div
          className="frame absolute inset-0 flex items-center justify-center p-6"
          style={{ animationName: "hd-frame-1" }}
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="ml-3 truncate">chromewebstore.google.com</span>
            </div>
            <div className="flex items-center gap-4 px-5 py-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] text-base font-bold text-white">
                HD
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">
                  HireDrop — Auto-Apply on Indeed
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">hiredrop.io · Productivity</div>
              </div>
              <button
                type="button"
                className="pulse-btn shrink-0 rounded-full bg-[#1a73e8] px-4 py-2 text-xs font-medium text-white"
              >
                Add to Chrome
              </button>
            </div>
          </div>
        </div>

        {/* ────── Frame 2: Browser toolbar + extension popup ────── */}
        <div
          className="frame absolute inset-0 flex items-center justify-center p-6"
          style={{ animationName: "hd-frame-2" }}
        >
          <div className="w-full max-w-md">
            {/* Mock browser top bar */}
            <div className="rounded-t-lg bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
                <span className="text-gray-300 text-sm">← → ↻</span>
                <div className="flex-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-500">
                  hiredrop.io/dashboard
                </div>
                <span className="text-gray-300 text-sm">🧩</span>
                <div className="pulse-btn grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] text-[10px] font-bold text-white">
                  HD
                </div>
              </div>
            </div>
            {/* Popup hanging below toolbar */}
            <div className="ml-auto mt-2 w-64 rounded-lg bg-[#1a1d27] p-4 text-white shadow-2xl ring-1 ring-white/5">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] text-[10px] font-bold">
                  HD
                </div>
                <span className="text-xs font-semibold">HireDrop</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] text-red-400">Not connected</span>
              </div>
              <button
                type="button"
                className="pulse-btn w-full rounded-md bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] py-2 text-xs font-semibold"
              >
                Connect Account →
              </button>
            </div>
          </div>
        </div>

        {/* ────── Frame 3: Connected state ────── */}
        <div
          className="frame absolute inset-0 flex items-center justify-center p-6"
          style={{ animationName: "hd-frame-3" }}
        >
          <div className="w-full max-w-md rounded-lg bg-[#1a1d27] p-6 shadow-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] text-sm font-bold text-white">
                HD
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">HireDrop is connected</div>
                <div className="mt-0.5 text-[11px] text-white/60">
                  Auto-apply ready on Indeed
                </div>
              </div>
              <div className="grid h-7 w-7 place-items-center rounded-full bg-green-500/20 text-green-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-[11px] text-white/70">
              <span>Today</span>
              <span className="font-mono text-white">7 / 50 applications</span>
            </div>
          </div>
        </div>

        {/* Step dots indicator */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
          <span className="dot dot1" />
          <span className="dot dot2" />
          <span className="dot dot3" />
        </div>

        {/* Step label (changes via opacity) */}
        <div className="absolute top-3 left-3 flex gap-1 text-[10px] uppercase tracking-wider text-white/40">
          <span className="frame" style={{ animationName: "hd-frame-1" }}>1. Install</span>
          <span className="frame" style={{ animationName: "hd-frame-2" }}>2. Connect</span>
          <span className="frame" style={{ animationName: "hd-frame-3" }}>3. Ready</span>
        </div>
      </div>

      {/* Primary + secondary CTA — external link uses plain <a> (Button helper
          only supports internal Next Link). Classes mirror Button primary/lg. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={CHROME_WEB_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25 px-8 py-3.5 text-lg font-semibold transition cursor-pointer"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5c2.07 0 3.95.84 5.31 2.19l-2.65 2.66A4.48 4.48 0 0 0 12 8c-2.21 0-4.04 1.6-4.4 3.7L3.55 9.34A8.49 8.49 0 0 1 12 4.5zm0 15c-2.62 0-4.95-1.34-6.32-3.36l3.96-2.36A4.5 4.5 0 0 0 12 16.5c.74 0 1.43-.18 2.04-.5l2.04 3.54A8.45 8.45 0 0 1 12 19.5zm8.45-7.5c0 .51-.05 1.01-.13 1.5h-4.42a4.49 4.49 0 0 0 .1-1.5 4.5 4.5 0 0 0-.41-1.85l3.85-2.22A8.5 8.5 0 0 1 20.45 12z" />
          </svg>
          Add to Chrome — free
        </a>
        <Link
          href="/extension/connect"
          className="text-sm text-text2 hover:text-text underline underline-offset-4"
        >
          Already installed? Connect account →
        </Link>
      </div>
    </div>
  );
}
