"use client";

// Two clean mode cards (both themes, no heavy colour). Auto = a pen flies across
// and writes a line in a script hand (Caveat) with an underline drawing in; Tap =
// a little deck of platform cards swiping fully to the right, each with a mint
// "approved" check. Titles in Space Grotesk (the sans), the written word in Caveat
// (the script) — the two-font mix. Visuals only; submit_mode logic stays upstream.
interface Props {
  mode: "auto" | "tap";
  onAuto: () => void;
  onTap: () => void;
}

const SWIPE = [
  { id: "greenhouse", d: 0 },
  { id: "linkedin", d: -1 },
  { id: "indeed", d: -2 },
];

export default function LaunchModeCards({ mode, onAuto, onTap }: Props) {
  return (
    <div className="lmc grid grid-cols-2 gap-3 pt-2">
      <style>{`
        .lmc-card{display:flex;flex-direction:column;align-items:center;padding:18px 16px 16px;border-radius:18px;
          border:1px solid var(--color-border);background:var(--color-surface);text-align:center;
          transition:border-color .2s,box-shadow .3s,transform .12s;overflow:hidden}
        .lmc-card:hover{border-color:color-mix(in srgb,var(--color-accent) 40%,transparent)}
        .lmc-card:active{transform:scale(.99)}
        .lmc-card.on{border-color:color-mix(in srgb,var(--color-accent) 60%,transparent);
          box-shadow:0 0 26px -10px var(--color-accent)}
        .lmc-card.on-tap{border-color:color-mix(in srgb,var(--color-green) 60%,transparent);
          box-shadow:0 0 26px -10px var(--color-green)}
        .lmc-scene{position:relative;height:78px;width:100%;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
        .lmc-title{font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:20px;color:var(--color-text);line-height:1}
        .lmc-sub{font-size:12px;color:var(--color-text2);margin-top:4px}

        /* AUTO — flying pen writes a script line + underline draws in */
        .lmc-writebox{position:relative;width:186px;height:52px}
        .lmc-script{position:absolute;left:2px;top:2px;font-family:'Caveat',cursive;font-weight:700;font-size:32px;
          color:var(--color-accent);white-space:nowrap;clip-path:inset(0 101% 0 0);
          animation:lmcReveal 3.6s ease-in-out infinite}
        @keyframes lmcReveal{0%{clip-path:inset(0 101% 0 0)}50%{clip-path:inset(0 -3% 0 0)}80%{clip-path:inset(0 -3% 0 0)}100%{clip-path:inset(0 101% 0 0)}}
        .lmc-underline{position:absolute;left:2px;bottom:2px;height:2px;width:150px;border-radius:2px;background:var(--color-accent);
          opacity:.35;transform-origin:left;transform:scaleX(0);animation:lmcUnder 3.6s ease-in-out infinite}
        @keyframes lmcUnder{0%{transform:scaleX(0)}50%{transform:scaleX(1)}80%{transform:scaleX(1)}100%{transform:scaleX(0)}}
        .lmc-pen{position:absolute;left:-10px;top:-16px;color:var(--color-text);animation:lmcPen 3.6s ease-in-out infinite;transform-origin:bottom left}
        @keyframes lmcPen{0%{transform:translateX(0) rotate(-8deg)}50%{transform:translateX(150px) rotate(-8deg)}78%{transform:translateX(150px) rotate(-8deg)}84%{transform:translateX(150px) rotate(4deg)}100%{transform:translateX(0) rotate(-8deg)}}

        /* TAP — platform cards swipe fully to the right, mint check on approve */
        .lmc-deck{position:relative;width:118px;height:76px}
        .lmc-mini{position:absolute;inset:0;border-radius:12px;background:var(--color-surface);
          border:1px solid var(--color-border);box-shadow:0 8px 18px -8px rgba(0,0,0,.28);
          padding:9px;display:flex;flex-direction:column;gap:6px;animation:lmcSwipe 3s ease-in-out infinite}
        @keyframes lmcSwipe{
          0%{transform:translateX(0) rotate(0) scale(.98);opacity:0}
          7%{opacity:1;transform:translateX(0) rotate(0) scale(1)}
          30%{transform:translateX(0) rotate(0) scale(1);opacity:1}
          46%{transform:translateX(165%) rotate(17deg);opacity:0}
          100%{transform:translateX(165%) rotate(17deg);opacity:0}
        }
        .lmc-logo{width:24px;height:24px;border-radius:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);
          display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
        .lmc-line{height:5px;border-radius:3px;background:color-mix(in srgb,var(--color-text) 14%,transparent)}
        .lmc-check{position:absolute;right:-7px;top:-7px;width:26px;height:26px;border-radius:50%;
          background:var(--color-green);color:#fff;display:flex;align-items:center;justify-content:center;
          opacity:0;animation:lmcCheck 3s ease-in-out infinite}
        @keyframes lmcCheck{0%,32%{opacity:0;transform:scale(.4)}39%{opacity:1;transform:scale(1)}50%{opacity:0;transform:scale(1.35)}100%{opacity:0}}

        @media (prefers-reduced-motion: reduce){
          .lmc-script,.lmc-underline,.lmc-pen,.lmc-mini,.lmc-check{animation:none}
          .lmc-script{clip-path:none}.lmc-underline{transform:scaleX(1)}
          .lmc-mini{opacity:1;transform:none}
        }
      `}</style>

      {/* AUTO */}
      <button type="button" onClick={onAuto} aria-pressed={mode === "auto"}
        className={`lmc-card ${mode === "auto" ? "on" : ""}`}>
        <div className="lmc-scene">
          <div className="lmc-writebox">
            <span className="lmc-script">your cover letter</span>
            <span className="lmc-underline" />
            <svg className="lmc-pen" width="30" height="30" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              <path d="M14.5 5.5l3 3" />
            </svg>
          </div>
        </div>
        <span className="lmc-title">Auto</span>
        <span className="lmc-sub">Fills &amp; sends for you</span>
      </button>

      {/* TAP */}
      <button type="button" onClick={onTap} aria-pressed={mode === "tap"}
        className={`lmc-card ${mode === "tap" ? "on-tap" : ""}`}>
        <div className="lmc-scene">
          <div className="lmc-deck">
            {SWIPE.map((s) => (
              <div key={s.id} className="lmc-mini" style={{ animationDelay: `${s.d}s` }}>
                <div className="lmc-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/onboarding/logos/${s.id}.png`} alt="" aria-hidden style={{ width: 18, height: 18, objectFit: "contain" }} />
                </div>
                <div className="lmc-line" style={{ width: "82%" }} />
                <div className="lmc-line" style={{ width: "60%" }} />
                <div className="lmc-check" style={{ animationDelay: `${s.d}s` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="lmc-title">Tap</span>
        <span className="lmc-sub">Review each on a card</span>
      </button>
    </div>
  );
}
