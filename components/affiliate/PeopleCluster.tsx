/**
 * The circle cluster: the people an affiliate already knows.
 *
 * Igor's reference (Notetaker's hero, 2026-09-21) is a dark panel whose right
 * half is photography, not decoration. Two rules came with it: circles of
 * DIFFERENT sizes, and STATIC — no float, no parallax, no entrance. Motion here
 * would read as a widget; stillness reads as a photograph.
 *
 * Faces are licensed Envato photography, cropped by
 * brand-visuals/crop_affiliate_people.py (2026-10-03 — Igor found the earlier
 * Flux faces unreal). Sharp single portraits take the big circles; faces cut
 * from the group shot go small. Never vector heads — a drawn face in a product
 * that pays real people reads as a placeholder.
 *
 * Positions are percentages of the box, so the whole cluster scales with its
 * container rather than breaking into a new layout at each width.
 */

import Image from "next/image";

interface Circle {
  /** public/people/face-<n>.jpg */
  n: number;
  /** diameter, % of container width */
  size: number;
  left: number;
  top: number;
  /** Dropped on narrow screens, where seven circles become confetti. */
  wide?: boolean;
}

const CIRCLES: Circle[] = [
  { n: 2, size: 32, left: 33, top: 2 },
  { n: 1, size: 25, left: 3, top: 22 },
  { n: 5, size: 21, left: 72, top: 12 },
  { n: 3, size: 19, left: 55, top: 50 },
  { n: 4, size: 17, left: 30, top: 55 },
  { n: 6, size: 14, left: 8, top: 62, wide: true },
  { n: 8, size: 11, left: 19, top: 4, wide: true },
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
            src={`/people/face-${c.n}.jpg`}
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
