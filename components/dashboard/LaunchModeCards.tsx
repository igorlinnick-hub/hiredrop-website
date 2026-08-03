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

        /* Auto — rocket lifts, flame ignites, a charge ring pulses out. */
        .lmc-rocket { transition: transform .35s cubic-bezier(.34,1.35,.5,1); }
        .lmc-auto-card:hover .lmc-rocket { transform: translateY(-7px); }
        .lmc-flame { transform-origin: 60px 62px; opacity: 0; transition: opacity .2s; }
        .lmc-auto-card:hover .lmc-flame, .lmc-on-auto .lmc-flame { opacity: 1; animation: lmcFlame .26s ease-in-out infinite alternate; }
        .lmc-charge { opacity: 0; transform-origin: 60px 42px; }
        .lmc-auto-card:hover .lmc-charge { animation: lmcCharge 1.1s ease-out infinite; }
        @keyframes lmcFlame { from { transform: scaleY(.65); } to { transform: scaleY(1.15); } }
        @keyframes lmcCharge { 0% { opacity:.55; transform: scale(.55);} 100% { opacity:0; transform: scale(1.35);} }

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
          .lmc-rocket, .lmc-card-piece { transition: none; }
          .lmc-flame, .lmc-charge { animation: none; }
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
            <linearGradient id="lmcAuto" x1="60" y1="9" x2="60" y2="62" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="1" stopColor="#6c5ce7" stopOpacity="0.32" />
            </linearGradient>
            <linearGradient id="lmcFlame" x1="60" y1="60" x2="60" y2="84" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" />
              <stop offset="0.55" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="1" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle className="lmc-charge" cx="60" cy="42" r="30" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.6" />
          <g className="lmc-flame">
            <path d="M53 60 C54 74 60 84 60 84 C60 84 66 74 67 60 C64 66 56 66 53 60 Z" fill="url(#lmcFlame)" />
          </g>
          <g className="lmc-rocket">
            <path d="M48 60 L48 38 C48 20 60 9 60 9 C60 9 72 20 72 38 L72 60 Z" fill="url(#lmcAuto)" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="1.5" />
            <path d="M48 52 L37 65 L48 60 Z" fill="#6c5ce7" fillOpacity="0.55" />
            <path d="M72 52 L83 65 L72 60 Z" fill="#6c5ce7" fillOpacity="0.55" />
            <circle cx="60" cy="34" r="6.5" fill="#fff" fillOpacity="0.9" />
            <circle cx="60" cy="34" r="6.5" stroke="#6c5ce7" strokeOpacity="0.5" strokeWidth="1.3" />
            <path d="M54 56 L54 34 C54 24 58 17 58 17" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          </g>
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
