"use client";

import { useEffect, useRef, useState } from "react";

// "Tracking pop-up" switch under Start in the launch dialog (Igor 09-30, mockup
// https://claude.ai/artifact/2tzxmqTTw1X3dEoszGrry8). On = the extension's edge pill shows
// on every site, not only on job boards. That needs Chrome's optional <all_urls> access,
// which only an extension page can ask for — so "on" makes the extension open its own
// small window with an Allow button (ext 1.8.28, ping.js HIREDROP_SET_PILL_EVERYWHERE),
// and we poll until the human has answered Chrome. Off drops the access directly.
//
// Rendered only once the extension has answered: an older extension (the store lags main)
// doesn't know these messages, and a switch that does nothing is worse than no switch.

const POLL_MS = 1500;
const POLL_FOR_MS = 120_000;

type Reply = { type?: string; ok?: boolean; on?: boolean; pending?: boolean };

export default function TrackingPopupRow() {
  const [known, setKnown] = useState(false);
  const [on, setOn] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ask = () => window.postMessage({ type: "HIREDROP_GET_PILL_EVERYWHERE" }, "*");
    const stopPoll = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      const d = e.data as Reply;
      if (d.type !== "HIREDROP_PILL_EVERYWHERE" || !d.ok) return;
      setKnown(true);
      setOn(!!d.on);
      if (d.on) stopPoll();
    }
    window.addEventListener("message", onMsg);
    window.addEventListener("focus", ask); // back from Chrome's prompt
    ask();
    return () => {
      window.removeEventListener("message", onMsg);
      window.removeEventListener("focus", ask);
      stopPoll();
    };
  }, []);

  if (!known) return null;

  const toggle = () => {
    const next = !on;
    window.postMessage({ type: "HIREDROP_SET_PILL_EVERYWHERE", on: next }, "*");
    if (!next) {
      setOn(false);
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    const started = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - started > POLL_FOR_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      window.postMessage({ type: "HIREDROP_GET_PILL_EVERYWHERE" }, "*");
    }, POLL_MS);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border flex items-center gap-3" data-testid="tracking-popup-row">
      <style>{`
        .hd-trk-mini{width:52px;height:36px;flex-shrink:0;border-radius:8px;border:1px solid var(--border);background:var(--surface2);position:relative;overflow:hidden}
        .hd-trk-mini::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:color-mix(in srgb,var(--text) 8%,transparent)}
        .hd-trk-ln{position:absolute;left:6px;height:3px;border-radius:2px;background:color-mix(in srgb,var(--text) 14%,transparent)}
        .hd-trk-pill{position:absolute;right:3px;top:11px;height:18px;width:4px;border-radius:99px;background:#101014;box-shadow:0 0 0 1px rgba(255,255,255,.5);overflow:hidden;display:flex;align-items:center;justify-content:flex-end;animation:hdTrkSlide 3.6s cubic-bezier(.2,.8,.2,1) infinite}
        .dark .hd-trk-pill{background:#F4F2FF;box-shadow:none}
        .hd-trk-pill::before{content:"";position:absolute;left:0;bottom:0;width:100%;height:3px;background:linear-gradient(90deg,#4F44C9,#7B6CF6,#C85FD6)}
        .hd-trk-pill em{position:relative;z-index:1;font-style:normal;font-weight:700;font-size:9px;line-height:1;color:#fff;padding-right:5px;opacity:0;white-space:nowrap;font-variant-numeric:tabular-nums;animation:hdTrkNum 3.6s ease infinite}
        .dark .hd-trk-pill em{color:#14141C}
        @keyframes hdTrkSlide{0%,18%{width:4px}34%,72%{width:34px}88%,100%{width:4px}}
        @keyframes hdTrkNum{0%,26%{opacity:0}38%,66%{opacity:1}80%,100%{opacity:0}}
        @media (prefers-reduced-motion: reduce){.hd-trk-pill{animation:none;width:34px}.hd-trk-pill em{animation:none;opacity:1}}
      `}</style>
      <div className="hd-trk-mini" aria-hidden="true">
        <i className="hd-trk-ln" style={{ top: 12, width: 20 }} />
        <i className="hd-trk-ln" style={{ top: 19, width: 26 }} />
        <i className="hd-trk-ln" style={{ top: 26, width: 16 }} />
        <div className="hd-trk-pill"><em>12/30</em></div>
      </div>
      <span className="flex-1 min-w-0 text-sm font-semibold text-text">Tracking pop-up</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Tracking pop-up"
        data-testid="btn-tracking-popup"
        onClick={toggle}
        className={[
          "relative w-10 h-6 rounded-full shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
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
  );
}
