/**
 * The circle cluster: the people an affiliate already knows.
 *
 * Igor's reference (Notetaker's hero, 2026-09-21) is a dark panel whose right
 * half is photography, not decoration. Two rules came with it: circles of
 * DIFFERENT sizes, and STATIC — no float, no parallax, no entrance. Motion here
 * would read as a widget; stillness reads as a photograph.
 *
 * Faces are ours: brand-visuals/gen_affiliate_people.py generates them through
 * Replicate Flux with one lighting recipe, so nine separate generations sit in
 * one cluster instead of looking like a stock grid. Never vector heads — a
 * drawn face in a product that pays real people reads as a placeholder.
 *
 * Positions are percentages of the box, so the whole cluster scales with its
 * container rather than breaking into a new layout at each width.
 */

import Image from "next/image";

interface Circle {
  /** public/people file index */
  n: number;
  /** diameter, % of container width */
  size: number;
  left: number;
  top: number;
  /** Dropped on narrow screens, where nine circles become confetti. */
  wide?: boolean;
}

const CIRCLES: Circle[] = [
  { n: 2, size: 35, left: 30, top: 3 },
  { n: 1, size: 27, left: 0, top: 24 },
  { n: 5, size: 23, left: 71, top: 14 },
  { n: 3, size: 22, left: 61, top: 52 },
  { n: 4, size: 19, left: 28, top: 57, wide: true },
];

export default function PeopleCluster({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-[5/4] w-full ${className}`} aria-hidden>
      {CIRCLES.map((c) => (
        <div
          key={c.n}
          className={`absolute overflow-hidden rounded-full ring-1 ring-white/20 ${
            c.wide ? "hidden sm:block" : ""
          }`}
          style={{
            width: `${c.size}%`,
            aspectRatio: "1",
            left: `${c.left}%`,
            top: `${c.top}%`,
            // Lifts the circles off the dark ground without a visible border —
            // the reference gets the same separation from a real camera's
            // depth of field, which flat crops don't have.
            boxShadow: "0 18px 40px -12px rgba(0,0,0,.65)",
          }}
        >
          <Image
            src={`/people/p${c.n}.jpg`}
            alt=""
            fill
            sizes="160px"
            className="object-cover"
            priority={c.size > 20}
          />
        </div>
      ))}
    </div>
  );
}
