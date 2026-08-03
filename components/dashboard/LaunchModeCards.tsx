"use client";

// Two tall mode cards with a big 3D-ish illustration that sits to the side and
// spills past the frame. Each has its own colour; a resting perspective tilt gives
// a sense of space, and on hover the object turns to face you + lifts while its
// floor shadow shrinks (floating). Auto = a self-filling application stack; Tap = a
// glassy card deck that fans out. Visuals only — submit_mode logic stays upstream.
interface Props {
  mode: "auto" | "tap";
  onAuto: () => void;
  onTap: () => void;
}

export default function LaunchModeCards({ mode, onAuto, onTap }: Props) {
  return (
    <div className="lmc grid grid-cols-2 gap-3 pt-2">
      <style>{`
        .lmc-card { transition: border-color .2s, background-color .2s, box-shadow .3s; }
        .lmc-on-auto { box-shadow: 0 0 32px -8px rgba(108,92,231,.5); }
        .lmc-on-tap  { box-shadow: 0 0 32px -8px rgba(0,184,148,.45); }

        .lmc-illo { transition: transform .5s cubic-bezier(.34,1.28,.5,1); will-change: transform; }
        .lmc-shadow { transition: transform .5s, opacity .5s; }

        /* Auto — resting 3D pose → faces you + lifts on hover; floor shadow shrinks. */
        .lmc-auto-card .lmc-illo { transform: rotateX(16deg) rotateY(-18deg) rotateZ(-2deg); }
        .lmc-auto-card:hover .lmc-illo { transform: rotateX(7deg) rotateY(-9deg) translateY(-12px) scale(1.05); }
        .lmc-auto-card:hover .lmc-shadow { transform: scaleX(.8); opacity: .5; }
        .lmc-tick { opacity: 0; transition: opacity .2s; }
        .lmc-auto-card:hover .lmc-r1 .lmc-tick, .lmc-on-auto .lmc-r1 .lmc-tick { opacity: 1; transition-delay: .06s; }
        .lmc-auto-card:hover .lmc-r2 .lmc-tick, .lmc-on-auto .lmc-r2 .lmc-tick { opacity: 1; transition-delay: .19s; }
        .lmc-auto-card:hover .lmc-r3 .lmc-tick, .lmc-on-auto .lmc-r3 .lmc-tick { opacity: 1; transition-delay: .32s; }
        .lmc-spark { transform-origin: center; opacity: .4; }
        .lmc-auto-card:hover .lmc-spark, .lmc-on-auto .lmc-spark { animation: lmcSpark .9s ease-in-out infinite; }
        @keyframes lmcSpark { 0%,100% { opacity:.4; transform: scale(.8) rotate(0deg); } 50% { opacity:1; transform: scale(1.2) rotate(25deg); } }

        /* Tap — resting 3D pose → faces you + lifts; deck fans out; shadow shrinks. */
        .lmc-tap-card .lmc-illo { transform: rotateX(16deg) rotateY(18deg) rotateZ(2deg); }
        .lmc-tap-card:hover .lmc-illo { transform: rotateX(7deg) rotateY(9deg) translateY(-12px) scale(1.05); }
        .lmc-tap-card:hover .lmc-shadow { transform: scaleX(.8); opacity: .5; }
        .lmc-piece { transform-origin: 70px 128px; transition: transform .42s cubic-bezier(.34,1.4,.5,1); }
        .lmc-c1 { transform: rotate(-6deg); } .lmc-c3 { transform: rotate(6deg); }
        .lmc-tap-card:hover .lmc-c1, .lmc-on-tap .lmc-c1 { transform: rotate(-26deg) translate(-15px,7px); }
        .lmc-tap-card:hover .lmc-c2, .lmc-on-tap .lmc-c2 { transform: translateY(-7px); }
        .lmc-tap-card:hover .lmc-c3, .lmc-on-tap .lmc-c3 { transform: rotate(26deg) translate(15px,7px); }
        .lmc-check { opacity: 0; transition: opacity .2s .12s; }
        .lmc-tap-card:hover .lmc-check, .lmc-on-tap .lmc-check { opacity: 1; }

        @media (prefers-reduced-motion: reduce) {
          .lmc-illo, .lmc-shadow, .lmc-piece { transition: none; }
          .lmc-auto-card .lmc-illo, .lmc-tap-card .lmc-illo { transform: none; }
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
          "lmc-card lmc-auto-card relative flex flex-col justify-end min-h-[176px] p-4 rounded-2xl border overflow-visible [perspective:900px]",
          mode === "auto"
            ? "lmc-on-auto border-accent/60 bg-accent/[0.08]"
            : "border-border hover:border-accent/45 hover:bg-accent/[0.03]",
        ].join(" ")}
      >
        <span aria-hidden className="lmc-shadow absolute right-4 top-[128px] h-[16px] w-[104px] rounded-[50%]"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.42), transparent 72%)", filter: "blur(4px)" }} />
        <span aria-hidden className="lmc-illo absolute -top-8 -right-4 w-[146px] h-[168px]">
          <svg viewBox="0 0 130 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="lmcAutoFace" x1="55" y1="14" x2="55" y2="132" gradientUnits="userSpaceOnUse">
                <stop stopColor="#b4a4ff" />
                <stop offset="1" stopColor="#6c5ce7" />
              </linearGradient>
            </defs>
            {/* stacked sheets for depth (peek bottom-right) */}
            <rect x="26" y="30" width="78" height="106" rx="8" fill="#4c3fb0" fillOpacity="0.55" />
            <rect x="21" y="24" width="78" height="106" rx="8" fill="#7d6de0" fillOpacity="0.7" />
            {/* front sheet with folded corner */}
            <path d="M16 24 a6 6 0 0 1 6 -6 H70 L92 40 V124 a6 6 0 0 1 -6 6 H22 a6 6 0 0 1 -6 -6 Z"
              fill="url(#lmcAutoFace)" stroke="#d4c9ff" strokeOpacity="0.55" strokeWidth="1.4" />
            <path d="M70 18 V34 a6 6 0 0 0 6 6 H92" fill="none" stroke="#d4c9ff" strokeOpacity="0.55" strokeWidth="1.4" />
            {/* auto-filled fields */}
            <g className="lmc-r1">
              <rect x="26" y="56" width="34" height="4" rx="2" fill="#fff" fillOpacity="0.75" />
              <path className="lmc-tick" d="M65 58 l3 3 5.5 -6.5" stroke="#f2eeff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="lmc-r2">
              <rect x="26" y="74" width="34" height="4" rx="2" fill="#fff" fillOpacity="0.75" />
              <path className="lmc-tick" d="M65 76 l3 3 5.5 -6.5" stroke="#f2eeff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="lmc-r3">
              <rect x="26" y="92" width="26" height="4" rx="2" fill="#fff" fillOpacity="0.75" />
              <path className="lmc-tick" d="M57 94 l3 3 5.5 -6.5" stroke="#f2eeff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* highlight + sparkle */}
            <path d="M21 118 L21 30 C21 26 24 23 24 23" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
            <path className="lmc-spark" d="M86 18 l1.9 5.3 5.3 1.9 -5.3 1.9 -1.9 5.3 -1.9 -5.3 -5.3 -1.9 5.3 -1.9 Z" fill="#fff" fillOpacity="0.92" />
          </svg>
        </span>
        <span className="relative z-10">
          <span className="block text-base font-bold text-accent">Auto</span>
          <span className="block text-xs text-text2 mt-0.5">Fills &amp; sends for you</span>
        </span>
      </button>

      {/* TAP */}
      <button
        type="button"
        onClick={onTap}
        aria-pressed={mode === "tap"}
        title="Tap — review and approve each application on a card"
        className={[
          "lmc-card lmc-tap-card relative flex flex-col justify-end min-h-[176px] p-4 rounded-2xl border overflow-visible [perspective:900px]",
          mode === "tap"
            ? "lmc-on-tap border-green/60 bg-green/[0.08]"
            : "border-border hover:border-green/45 hover:bg-green/[0.03]",
        ].join(" ")}
      >
        <span aria-hidden className="lmc-shadow absolute right-4 top-[130px] h-[16px] w-[110px] rounded-[50%]"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.42), transparent 72%)", filter: "blur(4px)" }} />
        <span aria-hidden className="lmc-illo absolute -top-8 -right-3 w-[150px] h-[168px]">
          <svg viewBox="0 0 140 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="lmcTapFace" x1="70" y1="20" x2="70" y2="128" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7cf0d8" />
                <stop offset="1" stopColor="#00b894" />
              </linearGradient>
            </defs>
            <rect className="lmc-piece lmc-c1" x="38" y="22" width="64" height="104" rx="10" fill="url(#lmcTapFace)" stroke="#0a8f74" strokeOpacity="0.55" strokeWidth="1.6" />
            <rect className="lmc-piece lmc-c2" x="38" y="22" width="64" height="104" rx="10" fill="url(#lmcTapFace)" stroke="#0a8f74" strokeOpacity="0.55" strokeWidth="1.6" />
            <rect className="lmc-piece lmc-c3" x="38" y="22" width="64" height="104" rx="10" fill="url(#lmcTapFace)" stroke="#0a8f74" strokeOpacity="0.65" strokeWidth="1.7" />
            <path className="lmc-check" d="M55 72 l10 10 20 -22" stroke="#08543f" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        <span className="relative z-10">
          <span className="block text-base font-bold text-green">Tap</span>
          <span className="block text-xs text-text2 mt-0.5">Review each on a card</span>
        </span>
      </button>
    </div>
  );
}
