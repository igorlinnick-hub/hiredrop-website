"use client";

// Search-radius control for non-remote campaigns: a compact stylized mini-map
// with a pin at the user's area and an animated circle that grows/shrinks with
// the selected radius, plus a "sonar" pulse. Not a real geocoded map (no tiles /
// API keys / network) — an abstract, theme-aware SVG that reads instantly and
// stays crisp offline. Pairs with a 10/25/50/100-mile chip selector.

const STEPS = [10, 25, 50, 100] as const;
export type RadiusMiles = (typeof STEPS)[number];

// Miles → circle radius in SVG units. Non-linear so 10 and 100 both read well
// inside the fixed viewBox (100×100, pin at center 50,50).
const R_BY_MILES: Record<RadiusMiles, number> = { 10: 16, 25: 26, 50: 36, 100: 46 };

export default function RadiusMap({
  value,
  onChange,
  areaLabel,
}: {
  value: RadiusMiles | null;
  onChange: (miles: RadiusMiles) => void;
  areaLabel?: string;
}) {
  const active = (value && (STEPS as readonly number[]).includes(value) ? value : 25) as RadiusMiles;
  const r = R_BY_MILES[active];

  return (
    <div className="rounded-xl border border-border bg-surface2/30 p-3 flex items-center gap-4">
      <style>{`
        @keyframes hdSonar {
          0%   { transform: scale(0.35); opacity: 0.55; }
          70%  { opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes hdPinPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>

      {/* Mini-map */}
      <div className="relative shrink-0" style={{ width: 92, height: 92 }}>
        <svg viewBox="0 0 100 100" width="92" height="92" className="block">
          <defs>
            <clipPath id="hdMapClip"><rect x="0" y="0" width="100" height="100" rx="12" /></clipPath>
            <radialGradient id="hdRingFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.06" />
            </radialGradient>
          </defs>

          <g clipPath="url(#hdMapClip)">
            {/* Map base + faint "streets" */}
            <rect x="0" y="0" width="100" height="100" fill="var(--surface)" />
            <g stroke="var(--border)" strokeWidth="1.4" opacity="0.9">
              <line x1="0" y1="30" x2="100" y2="22" />
              <line x1="0" y1="64" x2="100" y2="72" />
              <line x1="26" y1="0" x2="34" y2="100" />
              <line x1="70" y1="0" x2="64" y2="100" />
              <line x1="0" y1="0" x2="100" y2="100" opacity="0.5" />
            </g>
            {/* a couple of "blocks" for texture */}
            <g fill="var(--border)" opacity="0.35">
              <rect x="6" y="34" width="14" height="24" rx="2" />
              <rect x="78" y="30" width="16" height="20" rx="2" />
              <rect x="40" y="74" width="20" height="14" rx="2" />
            </g>

            {/* Sonar pulse — continuous, sized to the active radius */}
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="1.5"
              style={{ transformOrigin: "50px 50px", animation: "hdSonar 2.6s ease-out infinite" }} />

            {/* The selected radius disc — animates its r on change */}
            <circle cx="50" cy="50" r={r} fill="url(#hdRingFill)" stroke="var(--accent)" strokeWidth="1.75"
              style={{ transition: "r .45s cubic-bezier(.34,1.56,.64,1)" }} />
          </g>

          {/* Center pin (drawn above the clip so its tip isn't cut) */}
          <g style={{ transformOrigin: "50px 50px", animation: "hdPinPulse 2.2s ease-in-out infinite" }}>
            <circle cx="50" cy="50" r="3.4" fill="var(--accent)" />
            <circle cx="50" cy="50" r="6.5" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity="0.5" />
          </g>
        </svg>
      </div>

      {/* Selector */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-text">Search radius</p>
          <p className="text-[11px] text-text2/60 truncate">
            {active} mi{areaLabel ? ` · around ${areaLabel}` : " · around you"}
          </p>
        </div>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((m) => {
            const on = active === m;
            return (
              <button key={m} type="button" onClick={() => onChange(m)}
                aria-pressed={on}
                className={[
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition",
                  on
                    ? "bg-accent text-white border-accent shadow-[0_0_12px_rgba(108,92,231,0.35)]"
                    : "bg-surface text-text2 border-border hover:border-accent/50 hover:text-text",
                ].join(" ")}
              >
                {m}
              </button>
            );
          })}
          <span className="self-center text-[11px] text-text2/50 pl-0.5">mi</span>
        </div>
      </div>
    </div>
  );
}
