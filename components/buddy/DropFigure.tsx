"use client";

/*
  Drop's body — the plush character, on video.

  Replaces the orb this component family started with (BuddyOrb). Same API, so
  Buddy/BuddyPanel didn't have to change: it takes a BuddyState and a size.

  Framing is solved in the FOOTAGE, not in CSS. A 16:9 clip cannot sit well inside a
  circle: fit it to the height and the figure is tiny, fill the circle and the curve
  eats the feet and shoulders — which is exactly what happened through several rounds
  of tweaking percentages. scripts/square_loops.py crops a square around the character
  and pads it with the clip's own white, leaving deliberate air on every side. So here
  the video simply fills the circle: object-fit cover, no offsets, nothing to tune.

  Two clips, two meanings — and nothing else pretends:
    · resting  — stands, faces you, blinks every 3s, does not move. This is the canon.
    · working  — sits at the desk and types. Plays while a campaign is actually running.
  The coffee take is deliberately NOT used here: it is a different pose (eyes closed,
  mug up) and reads as a second character next to the canon.

  Every other mood is carried by the RING around the circle, not by new footage: a mood
  must be legible in a still frame, and a ring is legible instantly.
*/

import { useEffect, useState } from "react";
import type { BuddyState } from "./BuddyOrb";

const REST = "/character/idle.mp4";     // stands, faces you, blinks — the canon
const WORK = "/character/desk.mp4";     // sits at the desk and types
const POSTER = "/character/idle-poster.jpg";

// The ring is the mood tell. Colours come from the ink-day palette already on the site.
const RING: Record<BuddyState, { color: string; width: number; pulse: boolean }> = {
  idle:      { color: "transparent",        width: 0, pulse: false },
  listening: { color: "rgba(176,124,10,.5)", width: 2, pulse: true },
  thinking:  { color: "rgba(176,124,10,.85)", width: 2, pulse: true },
  speaking:  { color: "rgba(176,124,10,.6)", width: 2, pulse: false },
  success:   { color: "rgba(22,163,74,.75)", width: 3, pulse: false },
  stuck:     { color: "rgba(16,16,20,.22)",  width: 2, pulse: false },
};

export default function DropFigure({
  size = 116,
  state = "idle",
  working = false,
}: {
  size?: number;
  state?: BuddyState;
  /** A campaign is actually running — Drop sits down at the desk and works. */
  working?: boolean;
}) {
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCalm(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const ring = RING[state];
  const clip = working ? WORK : REST;

  return (
    <div
      className="relative overflow-hidden rounded-full bg-white"
      style={{
        width: size,
        height: size,
        border: "1px solid rgba(16,16,20,.10)",
        boxShadow: "0 6px 20px rgba(16,16,20,.12)",
        filter: state === "stuck" ? "saturate(.55) brightness(.97)" : undefined,
      }}
    >
      <video
        key={clip}
        src={calm ? undefined : clip}
        autoPlay={!calm}
        loop
        muted
        playsInline
        poster={POSTER}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {ring.width > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 0 ${ring.width}px ${ring.color}`,
            animation: ring.pulse && !calm ? "dropRing 1.6s ease-in-out infinite" : undefined,
          }}
        />
      )}

      <style>{`@keyframes dropRing{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
    </div>
  );
}
