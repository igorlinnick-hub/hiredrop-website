"use client";

import { useEffect, useRef, useState } from "react";

export type CameoPose = "peek" | "sit" | "point" | "wave";

// Where Drop comes from when the spot scrolls into view. The pose sets the story
// (peeking from the page edge, hanging under a block…), the entrance sells it.
type Enter = "left" | "right" | "up" | "down" | "swing";

const FROM: Record<Enter, string> = {
  left: "translateX(-110%)",
  right: "translateX(110%)",
  up: "translateY(40%)",
  down: "translateY(-40%)",
  swing: "rotate(-14deg) translateY(-18%)",
};

interface Props {
  pose: CameoPose;
  /** Rendered width in px; height follows the cut-out's own aspect. */
  width: number;
  /** Positioning (absolute offsets, visibility breakpoints) — set by the host block. */
  className?: string;
  enter?: Enter;
  /** Mirror the pose, e.g. so "point" aims at what sits to its right. */
  flip?: boolean;
  delay?: number;
}

/**
 * Frameless Drop around the landing: a transparent cut-out of the canon character
 * (brand/character/cameos, `gen_character.py cameos` + `matte_character.py cameos`)
 * that slides in once when its spot is scrolled to, then stays still — Drop never
 * wobbles as a flat image.
 */
export default function DropCameo({ pose, width, className = "", enter = "up", flip, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{ width, transform: flip ? "scaleX(-1)" : undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- transparent WebP, fixed size, no optimizer needed */}
      <img
        src={`/character/cameos/${pose}.webp`}
        alt=""
        width={width}
        draggable={false}
        // reduced motion: !important utilities beat the inline transform — Drop just stands there
        className="block w-full h-auto motion-reduce:!transform-none motion-reduce:!opacity-100 motion-reduce:!transition-none"
        style={{
          transform: shown ? "none" : FROM[enter],
          transformOrigin: enter === "swing" ? "50% 0%" : "50% 100%",
          opacity: shown ? 1 : 0,
          transition: `transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s, opacity 0.5s ease ${delay}s`,
          filter: "drop-shadow(0 14px 18px rgba(26,26,46,0.14))",
        }}
      />
    </div>
  );
}
