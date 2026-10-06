// Per-step onboarding header. Most steps show a context-specific brand glass/space
// PHOTO (public/onboarding/step-N.jpg) filling the card edge-to-edge. Step 4
// (Platforms) is glass cubes carrying the REAL platform logos on the same
// deep-space ground — icons IN the cubes, so "where should we apply" reads at a glance.

import type { ReactNode } from "react";

import { STEPS } from "@/lib/onboarding/steps";
import DropCameo, { type CameoPose } from "@/components/landing/DropCameo";

const PLATFORMS = ["indeed", "linkedin", "ziprecruiter", "greenhouse", "lever", "ashby"];
const OFFSET = [10, -8, 6, -10, 8, -4];
const ROT = [-6, 4, -3, 5, -4, 6];

function PlatformsHeader() {
  return (
    <div
      className="relative w-full h-40 sm:h-48 overflow-hidden"
      style={{ background: "radial-gradient(120% 110% at 50% 125%, #2a2158 0%, #14102e 52%, #0a0a14 100%)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center gap-2.5 sm:gap-4 px-4">
        {PLATFORMS.map((id, i) => (
          <div
            key={id}
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{
              width: 58,
              height: 58,
              transform: `translateY(${OFFSET[i]}px) rotate(${ROT[i]}deg)`,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 14px 28px -12px rgba(108,92,231,0.6)",
            }}
          >
            <span
              className="flex items-center justify-center rounded-xl overflow-hidden"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,0.96)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/onboarding/logos/${id}.png`} alt="" aria-hidden style={{ width: 24, height: 24, objectFit: "contain" }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Drop stands on the white card body under the header, at its right edge — outside the
// picture, never over it. One pose per step, so the wizard reads as a little quiz with Drop as the host.
const DROP_POSE: Partial<Record<number, { pose: CameoPose; width: number; className: string }>> = {
  2: { pose: "point", width: 112, className: "right-6 top-full" },
  4: { pose: "peek", width: 92, className: "right-0 top-full" },
  6: { pose: "standing", width: 112, className: "right-6 top-full" },
  8: { pose: "waving", width: 112, className: "right-6 top-full" },
  10: { pose: "sit", width: 112, className: "right-6 top-full" },
};

// One plain line icon per step on a cream field, so each header says what the step is about.
const ICON_PATHS: Record<number, ReactNode> = {
  1: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>, // Profile
  2: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>, // Preferences — search
  3: <path d="M12 3l7 3v5c0 5-3.2 8.2-7 10-3.8-1.8-7-5-7-10V6l7-3z" />, // Safety — shield
  5: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9.5 13h5M9.5 17h5" /></>, // Resume
  6: <><path d="M5 6l2 2 3-3M5 14l2 2 3-3" /><path d="M13 7h6M13 15h6" /></>, // ATS — checklist
  7: <path d="M4 5h16v11H9l-5 4V5z" />, // Answers — message
  8: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>, // Style — sliders
  9: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>, // Plan — card
  10: <><path d="M9 3v5M15 3v5" /><path d="M7 8h10v3a5 5 0 0 1-10 0V8z" /><path d="M12 16v5" /></>, // Connect — plug
  11: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>, // Done — check
};

function IconHeader({ step }: { step: number }) {
  return (
    <div className="relative w-full h-40 sm:h-48 overflow-hidden flex items-center justify-center" style={{ background: "#F3EEE3" }}>
      <svg
        viewBox="0 0 24 24"
        width={72}
        height={72}
        fill="none"
        stroke="#101014"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {ICON_PATHS[step]}
      </svg>
    </div>
  );
}

export default function StepHeader({ step }: { step: number }) {
  const art = STEPS[step - 1]?.art;
  if (!art) return null;
  const header = art === 4 ? <PlatformsHeader /> : <IconHeader step={step} />;
  const drop = DROP_POSE[step];
  if (!drop) return header;
  return (
    <div className="relative">
      {header}
      <DropCameo pose={drop.pose} width={drop.width} enter="up" className={`hidden sm:block absolute ${drop.className}`} />
    </div>
  );
}

