"use client";

// Auto/Tap mode cards with a real sense of space. Each card holds a glassy
// "space window" — a violet well, a slow starfall, soft depth — and tilts in 3D
// on hover. Auto = a pen flies across and writes 'your cover letter' in a script
// hand (Caveat) as an underline draws in; Tap = a little deck of platform cards
// swiping fully right, each with a mint approved-check. Fully themed: airy
// lavender + violet stars by day, deep space + white starfall by night. Titles in
// Space Grotesk (sans), the written word in Caveat (script). Logic stays upstream.
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
const STARS = [
  { l: 12, d: 11, dl: 0, o: 0.7, s: 2 }, { l: 30, d: 16, dl: -6, o: 0.4, s: 1.5 },
  { l: 48, d: 9, dl: -3, o: 0.6, s: 2 }, { l: 66, d: 14, dl: -9, o: 0.35, s: 1.5 },
  { l: 82, d: 11, dl: -5, o: 0.55, s: 2 }, { l: 92, d: 17, dl: -12, o: 0.4, s: 1.5 },
];

export default function LaunchModeCards({ mode, onAuto, onTap }: Props) {
  return (
    <div className="lmc grid grid-cols-2 gap-3 pt-2" style={{ perspective: "900px" }}>
      <style>{`
        .lmc-card{
          --scene:radial-gradient(135% 150% at 50% 125%, #e7e0ff 0%, #f4f1ff 56%, #ffffff 100%);
          --star:#8b7cf0; --glow:rgba(124,108,255,.30); --pen:#4a4668; --script:#6C5CE7;
          position:relative;display:flex;flex-direction:column;align-items:center;padding:14px 14px 16px;
          border-radius:20px;border:1px solid var(--color-border);background:var(--color-surface);text-align:center;
          transform:perspective(900px) rotateX(0) rotateY(0);transform-style:preserve-3d;
          transition:transform .45s cubic-bezier(.3,1,.4,1),box-shadow .3s,border-color .2s;
          box-shadow:0 10px 30px -16px rgba(60,50,120,.35)}
        .dark .lmc-card{
          --scene:radial-gradient(135% 150% at 50% 125%, #3a2d7a 0%, #1a1536 55%, #0e0c1c 100%);
          --star:#ffffff; --glow:rgba(124,108,255,.42); --pen:#e6e2ff; --script:#b9a9ff;
          box-shadow:0 16px 40px -18px rgba(0,0,0,.7)}
        .lmc-card:hover{transform:perspective(900px) rotateX(5deg) rotateY(-6deg) translateY(-4px)}
        .lmc-tap-c:hover{transform:perspective(900px) rotateX(5deg) rotateY(6deg) translateY(-4px)}
        .lmc-card.on{border-color:color-mix(in srgb,var(--color-accent) 60%,transparent);box-shadow:0 0 28px -8px var(--color-accent)}
        .lmc-card.on-tap{border-color:color-mix(in srgb,var(--color-green) 60%,transparent);box-shadow:0 0 28px -8px var(--color-green)}

        /* the space window */
        .lmc-scene{position:relative;width:100%;height:86px;border-radius:14px;overflow:hidden;margin-bottom:12px;
          background:var(--scene);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -20px 30px -20px var(--glow)}
        .lmc-glow{position:absolute;left:50%;bottom:-40%;width:120%;aspect-ratio:1;transform:translateX(-50%);
          border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 62%);filter:blur(10px);pointer-events:none}
        .lmc-stars{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .lmc-star{position:absolute;top:0;border-radius:50%;background:var(--star);animation:lmcStar linear infinite}
        @keyframes lmcStar{0%{transform:translateY(-12px);opacity:0}14%{opacity:var(--o)}84%{opacity:var(--o)}100%{transform:translateY(130px);opacity:0}}
        .lmc-inner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}

        .lmc-title{font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:20px;color:var(--color-text);line-height:1}
        .lmc-sub{font-size:12px;color:var(--color-text2);margin-top:4px}

        /* AUTO — flying pen writes a script line + underline draws in */
        .lmc-writebox{position:relative;width:180px;height:46px}
        .lmc-script{position:absolute;left:2px;top:0;font-family:'Caveat',cursive;font-weight:700;font-size:31px;
          color:var(--script);white-space:nowrap;clip-path:inset(0 101% 0 0);animation:lmcReveal 3.6s ease-in-out infinite;
          text-shadow:0 1px 6px var(--glow)}
        @keyframes lmcReveal{0%{clip-path:inset(0 101% 0 0)}50%{clip-path:inset(0 -3% 0 0)}80%{clip-path:inset(0 -3% 0 0)}100%{clip-path:inset(0 101% 0 0)}}
        .lmc-underline{position:absolute;left:2px;bottom:2px;height:2px;width:146px;border-radius:2px;background:var(--script);
          opacity:.5;transform-origin:left;transform:scaleX(0);animation:lmcUnder 3.6s ease-in-out infinite}
        @keyframes lmcUnder{0%{transform:scaleX(0)}50%{transform:scaleX(1)}80%{transform:scaleX(1)}100%{transform:scaleX(0)}}
        .lmc-pen{position:absolute;left:-10px;top:-18px;color:var(--pen);animation:lmcPen 3.6s ease-in-out infinite;transform-origin:bottom left;
          filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))}
        @keyframes lmcPen{0%{transform:translateX(0) rotate(-8deg)}50%{transform:translateX(146px) rotate(-8deg)}78%{transform:translateX(146px) rotate(-8deg)}84%{transform:translateX(146px) rotate(4deg)}100%{transform:translateX(0) rotate(-8deg)}}

        /* TAP — platform cards swipe fully right, mint check on approve */
        .lmc-deck{position:relative;width:116px;height:78px}
        .lmc-mini{position:absolute;inset:0;border-radius:12px;background:rgba(255,255,255,.95);
          border:1px solid rgba(0,0,0,.06);box-shadow:0 10px 22px -8px rgba(0,0,0,.35);
          padding:9px;display:flex;flex-direction:column;gap:6px;animation:lmcSwipe 3s ease-in-out infinite}
        @keyframes lmcSwipe{
          0%{transform:translateX(0) rotate(0) scale(.98);opacity:0}
          7%{opacity:1;transform:translateX(0) rotate(0) scale(1)}
          30%{transform:translateX(0) rotate(0) scale(1);opacity:1}
          46%{transform:translateX(165%) rotate(17deg);opacity:0}
          100%{transform:translateX(165%) rotate(17deg);opacity:0}}
        .lmc-logo{width:24px;height:24px;border-radius:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);
          display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
        .lmc-line{height:5px;border-radius:3px;background:rgba(30,30,50,.14)}
        .lmc-check{position:absolute;right:-7px;top:-7px;width:26px;height:26px;border-radius:50%;
          background:var(--color-green);color:#fff;display:flex;align-items:center;justify-content:center;
          opacity:0;animation:lmcCheck 3s ease-in-out infinite;box-shadow:0 4px 12px -2px rgba(0,184,148,.7)}
        @keyframes lmcCheck{0%,32%{opacity:0;transform:scale(.4)}39%{opacity:1;transform:scale(1)}50%{opacity:0;transform:scale(1.35)}100%{opacity:0}}

        @media (prefers-reduced-motion: reduce){
          .lmc-card,.lmc-card:hover,.lmc-tap-c:hover{transform:none;transition:none}
          .lmc-star,.lmc-script,.lmc-underline,.lmc-pen,.lmc-mini,.lmc-check{animation:none}
          .lmc-script{clip-path:none}.lmc-underline{transform:scaleX(1)}.lmc-mini{opacity:1;transform:none}
        }
      `}</style>

      {/* AUTO */}
      <button type="button" onClick={onAuto} aria-pressed={mode === "auto"}
        className={`lmc-card ${mode === "auto" ? "on" : ""}`}>
        <div className="lmc-scene">
          <span className="lmc-glow" aria-hidden />
          <div className="lmc-stars" aria-hidden>
            {STARS.map((st, i) => (
              <span key={i} className="lmc-star" style={{
                left: `${st.l}%`, width: st.s, height: st.s,
                animationDuration: `${st.d}s`, animationDelay: `${st.dl}s`, ["--o" as string]: st.o,
              }} />
            ))}
          </div>
          <div className="lmc-inner">
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
        </div>
        <span className="lmc-title">Auto</span>
        <span className="lmc-sub">Fills &amp; sends for you</span>
      </button>

      {/* TAP */}
      <button type="button" onClick={onTap} aria-pressed={mode === "tap"}
        className={`lmc-card lmc-tap-c ${mode === "tap" ? "on-tap" : ""}`}>
        <div className="lmc-scene">
          <span className="lmc-glow" aria-hidden />
          <div className="lmc-stars" aria-hidden>
            {STARS.map((st, i) => (
              <span key={i} className="lmc-star" style={{
                left: `${(st.l + 20) % 100}%`, width: st.s, height: st.s,
                animationDuration: `${st.d + 2}s`, animationDelay: `${st.dl - 2}s`, ["--o" as string]: st.o,
              }} />
            ))}
          </div>
          <div className="lmc-inner">
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
        </div>
        <span className="lmc-title">Tap</span>
        <span className="lmc-sub">Review each on a card</span>
      </button>
    </div>
  );
}
