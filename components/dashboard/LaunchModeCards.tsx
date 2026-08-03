"use client";

// Two big illustrated mode cards that replace the small Auto/Tap segmented toggle.
// Each has its own colour + a 3D-ish transparent illustration with a hover micro-effect:
//   Auto (violet)  — a glossy rocket that lifts + ignites, "preparing for launch".
//   Tap  (mint)    — a glassy card deck that fans out like a hand of cards on hover.
// Pure visuals — the submit_mode logic (saveMode / goTap) stays in QuickActions.
interface Props {
  mode: "auto" | "tap";
  onAuto: () => void;
  onTap: () => void;
}

export default function LaunchModeCards({ mode, onAuto, onTap }: Props) {
  return (
    <div className="lmc grid grid-cols-2 gap-3">
      <style>{`
        .lmc-card { transition: border-color .2s, background-color .2s, box-shadow .3s, transform .2s; }
        .lmc-card:active { transform: scale(.985); }
        .lmc-on-auto { box-shadow: 0 0 28px -8px rgba(108,92,231,.55); }
        .lmc-on-tap  { box-shadow: 0 0 28px -8px rgba(0,184,148,.5); }

        /* Auto — an application form fills itself: checks cascade in + a sparkle. */
        .lmc-doc { transition: transform .35s cubic-bezier(.34,1.35,.5,1); }
        .lmc-auto-card:hover .lmc-doc { transform: translateY(-5px); }
        .lmc-tick { opacity: 0; transition: opacity .2s; }
        .lmc-auto-card:hover .lmc-r1 .lmc-tick, .lmc-on-auto .lmc-r1 .lmc-tick { opacity: 1; transition-delay: .05s; }
        .lmc-auto-card:hover .lmc-r2 .lmc-tick, .lmc-on-auto .lmc-r2 .lmc-tick { opacity: 1; transition-delay: .18s; }
        .lmc-auto-card:hover .lmc-r3 .lmc-tick, .lmc-on-auto .lmc-r3 .lmc-tick { opacity: 1; transition-delay: .31s; }
        .lmc-spark { transform-origin: 80px 24px; opacity: .4; }
        .lmc-auto-card:hover .lmc-spark, .lmc-on-auto .lmc-spark { animation: lmcSpark .9s ease-in-out infinite; }
        @keyframes lmcSpark { 0%,100% { opacity:.4; transform: scale(.8) rotate(0deg); } 50% { opacity:1; transform: scale(1.15) rotate(25deg); } }

        /* Tap — the deck fans out from its base. */
        .lmc-card-piece { transform-origin: 60px 72px; transition: transform .4s cubic-bezier(.34,1.4,.5,1); }
        .lmc-c1 { transform: rotate(-5deg) translateX(-2px); }
        .lmc-c3 { transform: rotate(5deg) translateX(2px); }
        .lmc-tap-card:hover .lmc-c1, .lmc-on-tap .lmc-c1 { transform: rotate(-22deg) translate(-17px, 4px); }
        .lmc-tap-card:hover .lmc-c2, .lmc-on-tap .lmc-c2 { transform: translateY(-4px); }
        .lmc-tap-card:hover .lmc-c3, .lmc-on-tap .lmc-c3 { transform: rotate(22deg) translate(17px, 4px); }
        .lmc-check { opacity: 0; transition: opacity .2s .12s; }
        .lmc-tap-card:hover .lmc-check, .lmc-on-tap .lmc-check { opacity: 1; }

        @media (prefers-reduced-motion: reduce) {
          .lmc-doc, .lmc-card-piece { transition: none; }
          .lmc-spark { animation: none; }
        }
      `}</style>

      {/* AUTO */}
      <button
        type="button"
        onClick={onAuto}
        aria-pressed={mode === "auto"}
        title="Auto — HireDrop fills and sends applications for you"
        className={[
          "lmc-card lmc-auto-card relative flex flex-col items-center gap-1 p-3 rounded-2xl border text-center",
          mode === "auto"
            ? "lmc-on-auto border-accent/60 bg-accent/[0.08]"
            : "border-border hover:border-accent/45 hover:bg-accent/[0.03]",
        ].join(" ")}
      >
        <svg viewBox="0 0 120 84" className="w-full h-[64px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lmcAuto" x1="60" y1="14" x2="60" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a78bfa" stopOpacity="0.85" />
              <stop offset="1" stopColor="#6c5ce7" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <g className="lmc-doc">
            {/* application sheet with a folded corner */}
            <path d="M46 15 H66 L76 25 V67 a4 4 0 0 1 -4 4 H50 a4 4 0 0 1 -4 -4 V19 a4 4 0 0 1 4 -4 Z"
              fill="url(#lmcAuto)" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="1.4" />
            <path d="M66 15 V21 a4 4 0 0 0 4 4 H76" fill="none" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="1.4" />
            {/* fields that get auto-checked */}
            <g className="lmc-row lmc-r1">
              <rect x="51" y="31" width="13" height="3.2" rx="1.6" fill="#fff" fillOpacity="0.7" />
              <path className="lmc-tick" d="M66 32.6 l2 2 3.6 -4.2" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="lmc-row lmc-r2">
              <rect x="51" y="42" width="13" height="3.2" rx="1.6" fill="#fff" fillOpacity="0.7" />
              <path className="lmc-tick" d="M66 43.6 l2 2 3.6 -4.2" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="lmc-row lmc-r3">
              <rect x="51" y="53" width="10" height="3.2" rx="1.6" fill="#fff" fillOpacity="0.7" />
              <path className="lmc-tick" d="M63 54.6 l2 2 3.6 -4.2" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
          {/* auto-fill sparkle */}
          <path className="lmc-spark" d="M80 17 l1.5 4.4 4.4 1.5 -4.4 1.5 -1.5 4.4 -1.5 -4.4 -4.4 -1.5 4.4 -1.5 Z"
            fill="#fff" fillOpacity="0.9" />
        </svg>
        <span className="text-sm font-bold text-accent">Auto</span>
        <span className="text-[11px] text-text2 leading-tight">Fills &amp; sends for you</span>
      </button>

      {/* TAP */}
      <button
        type="button"
        onClick={onTap}
        aria-pressed={mode === "tap"}
        title="Tap — review and approve each application on a card"
        className={[
          "lmc-card lmc-tap-card relative flex flex-col items-center gap-1 p-3 rounded-2xl border text-center",
          mode === "tap"
            ? "lmc-on-tap border-green/60 bg-green/[0.08]"
            : "border-border hover:border-green/45 hover:bg-green/[0.03]",
        ].join(" ")}
      >
        <svg viewBox="0 0 120 84" className="w-full h-[64px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lmcTap" x1="60" y1="20" x2="60" y2="68" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5eead4" stopOpacity="0.9" />
              <stop offset="1" stopColor="#00b894" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <rect className="lmc-card-piece lmc-c1" x="42" y="20" width="36" height="48" rx="7" fill="url(#lmcTap)" stroke="#00b894" strokeOpacity="0.5" strokeWidth="1.3" />
          <rect className="lmc-card-piece lmc-c2" x="42" y="20" width="36" height="48" rx="7" fill="url(#lmcTap)" stroke="#00b894" strokeOpacity="0.5" strokeWidth="1.3" />
          <rect className="lmc-card-piece lmc-c3" x="42" y="20" width="36" height="48" rx="7" fill="url(#lmcTap)" stroke="#00b894" strokeOpacity="0.65" strokeWidth="1.4" />
          <path className="lmc-check" d="M51 44 l6 6 12 -13" stroke="#00b894" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-bold text-green">Tap</span>
        <span className="text-[11px] text-text2 leading-tight">Review each on a card</span>
      </button>
    </div>
  );
}
