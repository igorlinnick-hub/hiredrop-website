"use client";

/*
  Drop — the HireDrop character.

  Not a new mascot: this is the brand's AI orb (components/landing/AIOrb.tsx,
  ILLUSTRATION_IDENTITY.md) given a nervous system. The identity rules still
  hold — no human figures, purple family, scattered + × ✳ marks.

  Built like a lit sphere, not a blurred gradient: occlusion at the bottom edge,
  a hard specular highlight top-left, a second tiny catchlight, a rim light
  bottom-right and a 1px terminator line. That stack is the difference between
  "glowing circle" and "glass marble sitting on the page".

  What makes it read as ALIVE:
    1. It looks at you — the bright core is a pupil on a spring toward the cursor.
    2. It breathes — a scale cycle that never settles.
    3. It blinks — the pupil squashes on Y for ~120ms every 4-9s.
    4. Its moods are legible in a still frame: pupil size, halo colour, eyelid.
       A mood you can only tell apart by watching for 3 seconds isn't a mood.
    5. The mood comes from the product (a run finished, a campaign stalled),
       not from a timer.

  Perf: 3 plasma layers, no mixBlendMode on the hot path, transforms only.
  Honors prefers-reduced-motion.
*/

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

export type BuddyState =
  | "idle"       // nothing happening — breathing, occasional blink
  | "listening"  // chat open, input focused — pupil dilates, one ring breathes
  | "thinking"   // waiting on the model — pupil contracts, sparks orbit
  | "speaking"   // answering — pupil pulses
  | "success"    // an application went out — the whole eye goes green
  | "stuck";     // stalled / capped — cools to slate, half-lids, looks down

type Cfg = {
  breathe: number[];
  breatheDur: number;
  pupil: number;     // pupil diameter as a fraction of the orb
  halo: string;      // colour of the glow around the pupil — the mood tell
  lid: number;       // 1 = wide open, <1 = half-lidded
  track: number;     // how far the pupil travels toward the cursor
  plasma: number;    // speed multiplier — lower is faster
  hue: string;       // filter applied to the whole body
  ring: number;      // listening ripple opacity
  restY: number;     // resting gaze offset (stuck looks down)
};

const CFG: Record<BuddyState, Cfg> = {
  idle: {
    breathe: [1, 1.022, 1], breatheDur: 4.6, pupil: 0.2, halo: "rgba(167,139,250,0.85)",
    lid: 1, track: 1, plasma: 1, hue: "none", ring: 0, restY: 0,
  },
  listening: {
    breathe: [1, 1.045, 1], breatheDur: 2.4, pupil: 0.3, halo: "rgba(196,181,253,1)",
    lid: 1, track: 1.35, plasma: 0.8, hue: "saturate(1.15)", ring: 0.55, restY: 0,
  },
  thinking: {
    breathe: [1, 1.03, 1], breatheDur: 1.7, pupil: 0.1, halo: "rgba(167,139,250,1)",
    lid: 1, track: 0.15, plasma: 0.3, hue: "saturate(1.2)", ring: 0, restY: 0,
  },
  speaking: {
    breathe: [1, 1.035, 1], breatheDur: 1.2, pupil: 0.23, halo: "rgba(255,255,255,0.95)",
    lid: 1, track: 0.55, plasma: 0.7, hue: "saturate(1.1)", ring: 0, restY: 0,
  },
  success: {
    breathe: [1, 1.09, 1], breatheDur: 1.0, pupil: 0.34, halo: "rgba(0,184,148,1)",
    lid: 1, track: 0.35, plasma: 0.5, hue: "saturate(1.25)", ring: 0, restY: -0.03,
  },
  stuck: {
    breathe: [1, 1.01, 1], breatheDur: 7.5, pupil: 0.18, halo: "rgba(148,163,184,0.85)",
    lid: 0.55, track: 0.25, plasma: 2.4, hue: "saturate(0.22) brightness(0.92)", ring: 0, restY: 0.14,
  },
};

const PLASMA = [
  {
    size: "104%",
    gradient: "radial-gradient(circle at 34% 34%, #ffffff 0%, #c4b5fd 46%, #7c5ce0 86%, transparent 100%)",
    animate: { x: [0, 9, -6, 12, 0], y: [0, -8, 10, -5, 0], scale: [1, 1.1, 0.94, 1.14, 1] },
    duration: 12, opacity: 0.85,
  },
  {
    size: "92%",
    gradient: "radial-gradient(circle at 72% 64%, #a78bfa 0%, #ede9fe 40%, #6C5CE7 80%, transparent 100%)",
    animate: { x: [0, -10, 7, -4, 0], y: [0, 8, -7, 11, 0], scale: [1.06, 0.9, 1.16, 0.96, 1.06] },
    duration: 15, opacity: 0.6,
  },
  {
    size: "78%",
    gradient: "radial-gradient(circle at 46% 26%, #5b46c9 0%, #8b6df0 40%, transparent 74%)",
    animate: { x: [0, 7, -9, 5, 0], y: [0, -10, 6, -8, 0], scale: [0.94, 1.14, 0.98, 1.1, 0.94] },
    duration: 11, opacity: 0.5,
  },
];

/* The identity's signature marks. Positions are rotated per mood so two orbs on
   the same page never read as copies of one sprite. */
const MARKS = [
  { d: "M0 -5 V5 M-5 0 H5", s: 0.85 },                   // +
  { d: "M-4 -4 L4 4 M4 -4 L-4 4", s: 0.7 },              // ×
  { d: "M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3", s: 0.75 }, // ✳
];
const MARK_SPOTS = [
  [-0.16, 0.1], [1.1, 0.16], [0.98, 0.9], [0.04, -0.12], [-0.13, 0.72], [0.82, -0.1],
];
const MOOD_OFFSET: Record<BuddyState, number> = {
  idle: 0, listening: 1, thinking: 2, speaking: 3, success: 4, stuck: 5,
};

export default function BuddyOrb({
  size = 64,
  state = "idle",
  className = "",
}: {
  size?: number;
  state?: BuddyState;
  className?: string;
}) {
  const cfg = CFG[state];
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);

  // ── Gaze ──────────────────────────────────────────────────────────────────
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const sx = useSpring(gx, { stiffness: 110, damping: 16, mass: 0.7 });
  const sy = useSpring(gy, { stiffness: 110, damping: 16, mass: 0.7 });

  // The body leans a couple of px (parallax); the pupil travels much further.
  const bodyX = useTransform(sx, (v) => v * size * 0.03);
  const bodyY = useTransform(sy, (v) => v * size * 0.03);
  const pupilX = useTransform(sx, (v) => v * size * 0.13 * cfg.track);
  const pupilY = useTransform(sy, (v) => v * size * 0.13 * cfg.track + size * cfg.restY);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 400);
      gx.set((dx / d) * reach);
      gy.set((dy / d) * reach);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [gx, gy, reduced]);

  // ── Blink ─────────────────────────────────────────────────────────────────
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (reduced || state === "thinking") return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        schedule();
      }, 4000 + Math.random() * 5000);
    };
    schedule();
    return () => clearTimeout(t);
  }, [reduced, state]);

  const pupilPx = size * cfg.pupil;
  const haloPx = pupilPx * 2.6;
  const marks = MARKS.map((m, i) => {
    const spot = MARK_SPOTS[(i + MOOD_OFFSET[state]) % MARK_SPOTS.length];
    return { ...m, x: spot[0] * size, y: spot[1] * size, delay: i * 1.2 };
  });

  return (
    <div ref={wrap} className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Ambient light thrown onto the page behind it */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: "-42%",
          background:
            state === "success"
              ? "radial-gradient(circle, rgba(0,184,148,0.34) 0%, rgba(108,92,231,0.10) 46%, transparent 70%)"
              : state === "stuck"
                ? "radial-gradient(circle, rgba(100,116,139,0.20) 0%, transparent 66%)"
                : "radial-gradient(circle, rgba(108,92,231,0.30) 0%, rgba(167,139,250,0.08) 46%, transparent 70%)",
          filter: `blur(${Math.round(size * 0.16)}px)`,
        }}
        animate={reduced ? undefined : { scale: [1, 1.1, 1], opacity: [0.6, 0.95, 0.6] }}
        transition={{ duration: cfg.breatheDur * 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Contact shadow — grounds the sphere on whatever it floats over */}
      <div
        className="absolute rounded-[50%] pointer-events-none"
        style={{
          width: size * 0.7, height: size * 0.16,
          left: size * 0.15, top: size * 0.94,
          background: "radial-gradient(ellipse, rgba(49,32,120,0.30) 0%, transparent 70%)",
          filter: `blur(${Math.round(size * 0.05)}px)`,
        }}
      />

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          x: reduced ? 0 : bodyX,
          y: reduced ? 0 : bodyY,
          filter: cfg.hue,
          willChange: "transform",
        }}
        animate={reduced ? undefined : { scale: cfg.breathe }}
        transition={{ duration: cfg.breatheDur, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Base: lit from top-left, dark at the bottom-right limb */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, #f3efff 0%, #c9b8fb 30%, #8b6df0 62%, #4c35a8 92%, #3b2885 100%)",
          }}
        />

        {PLASMA.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: p.size, height: p.size,
              top: "50%", left: "50%",
              marginTop: `-${parseInt(p.size) / 2}%`,
              marginLeft: `-${parseInt(p.size) / 2}%`,
              background: p.gradient,
              borderRadius: "50%",
              opacity: p.opacity,
              filter: `blur(${Math.max(5, Math.round(size * 0.1))}px)`,
              willChange: "transform",
            }}
            animate={reduced ? undefined : p.animate}
            transition={{ duration: p.duration * cfg.plasma, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Occlusion — the bottom-right limb stays dark no matter what the plasma does.
            Without this the sphere flattens into a disc. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 26% 22%, transparent 0%, transparent 44%, rgba(40,24,96,0.42) 86%, rgba(30,17,74,0.62) 100%)",
          }}
        />

        {/* ── The eye ──────────────────────────────────────────────────────
            Halo carries the mood colour; the pupil is small, bright and hard-
            edged so the gaze is readable at 40px. */}
        <motion.div
          className="absolute"
          style={{
            width: haloPx, height: haloPx,
            top: "50%", left: "50%",
            marginTop: -haloPx / 2, marginLeft: -haloPx / 2,
            x: reduced ? 0 : pupilX,
            y: reduced ? 0 : pupilY,
            willChange: "transform",
          }}
        >
          {/* Halo */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, ${cfg.halo} 0%, transparent 62%)` }}
            animate={{ opacity: state === "speaking" ? [0.55, 1, 0.65, 1, 0.55] : [0.6, 0.85, 0.6] }}
            transition={{ duration: state === "speaking" ? 1.3 : 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Pupil */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: pupilPx, height: pupilPx,
              top: "50%", left: "50%",
              marginTop: -pupilPx / 2, marginLeft: -pupilPx / 2,
              background: state === "success"
                ? "radial-gradient(circle at 40% 36%, #ffffff 0%, #b8f5e4 60%, #00B894 100%)"
                : "radial-gradient(circle at 40% 36%, #ffffff 0%, #ffffff 55%, rgba(237,233,254,0.9) 100%)",
              boxShadow: `0 0 ${Math.round(size * 0.14)}px ${cfg.halo}`,
            }}
            animate={{
              scaleY: blink ? 0.12 : cfg.lid,
              scaleX: blink ? 1.1 : 1,
              scale: state === "speaking" && !blink ? [1, 1.16, 0.95, 1.2, 1] : undefined,
            }}
            transition={
              blink
                ? { duration: 0.06, ease: "easeOut" }
                : state === "speaking"
                  ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" }
                  : { type: "spring", stiffness: 150, damping: 14 }
            }
          />
        </motion.div>

        {/* Specular highlight — one fixed light source, top-left. Hard-ish edge. */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: size * 0.26, height: size * 0.17,
            top: size * 0.13, left: size * 0.17,
            borderRadius: "50%",
            transform: "rotate(-28deg)",
            background: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.45) 55%, transparent 78%)",
            filter: `blur(${Math.max(0.6, size * 0.012)}px)`,
          }}
        />
        {/* Second catchlight — the tell that says "glass" rather than "plastic" */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.075, height: size * 0.075,
            top: size * 0.33, left: size * 0.13,
            background: "rgba(255,255,255,0.8)",
            filter: `blur(${Math.max(0.5, size * 0.008)}px)`,
          }}
        />

        {/* Rim light — bounce along the bottom-right limb */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 76% 84%, rgba(214,199,255,0.65) 0%, rgba(214,199,255,0.14) 16%, transparent 30%)",
          }}
        />

        {/* Terminator — a 1px inner edge so the silhouette stays crisp on any surface */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.28), inset 0 -2px 6px rgba(35,20,88,0.45)" }}
        />
      </motion.div>

      {/* Outer drop shadow — kept off the clipped body so it isn't cut away */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ boxShadow: `0 ${size * 0.08}px ${size * 0.3}px rgba(49,32,120,0.30)` }}
      />

      {/* Listening ripple */}
      {cfg.ring > 0 && !reduced && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: "1.5px solid rgba(167,139,250,0.9)" }}
          animate={{ scale: [1, 1.45], opacity: [cfg.ring, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Thinking: three sparks on an orbit — a mind at work, not a spinner */}
      {state === "thinking" && !reduced && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
        >
          {[0, 120, 240].map((deg, i) => (
            <motion.div
              key={deg}
              className="absolute rounded-full"
              style={{
                width: Math.max(3, size * 0.065), height: Math.max(3, size * 0.065),
                top: "50%", left: "50%",
                marginTop: Math.max(-1.5, -size * 0.0325), marginLeft: Math.max(-1.5, -size * 0.0325),
                background: "#a78bfa",
                boxShadow: "0 0 7px rgba(167,139,250,0.95)",
                transform: `rotate(${deg}deg) translateY(-${size * 0.66}px)`,
              }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }}
            />
          ))}
        </motion.div>
      )}

      {/* Success: a burst using the identity's own marks */}
      {state === "success" && !reduced && (
        <div className="absolute inset-0 pointer-events-none">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <motion.div
              key={deg}
              className="absolute rounded-full"
              style={{
                width: Math.max(2, size * 0.045), height: Math.max(2, size * 0.045),
                top: "50%", left: "50%", background: "#00B894",
              }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: Math.cos((deg * Math.PI) / 180) * size * 0.82,
                y: Math.sin((deg * Math.PI) / 180) * size * 0.82,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.7, ease: "easeOut" }}
            />
          ))}
        </div>
      )}

      {/* Signature marks — only at sizes where they read as texture, not noise */}
      {!reduced && size >= 56 && (
        <svg className="absolute pointer-events-none overflow-visible"
             style={{ inset: 0, width: size, height: size }} aria-hidden>
          {marks.map((m, i) => (
            <motion.g
              key={i}
              transform={`translate(${m.x}, ${m.y}) scale(${m.s * (size / 70)})`}
              animate={{ opacity: [0.2, 0.75, 0.2] }}
              transition={{ duration: 3.6, repeat: Infinity, delay: m.delay, ease: "easeInOut" }}
            >
              <path d={m.d} stroke={state === "stuck" ? "#94a3b8" : "#a78bfa"}
                    strokeWidth={1.7} strokeLinecap="round" fill="none" />
            </motion.g>
          ))}
        </svg>
      )}
    </div>
  );
}
