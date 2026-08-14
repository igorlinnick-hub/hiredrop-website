"use client";

// Auto/Tap launch cards, rebuilt to the product's real atmosphere (Igor's refs,
// 2026-08-12): a dark frosted-glass slab with a violet→blue light bloom glowing
// UP THROUGH the glass and a soft halo arc pooling beneath the card, all on
// near-black. Not white plates. Fully themed — light frosted glass + violet bloom
// by day, deep dark glass + brighter bloom by night. Motion is HOVER-ONLY (Igor:
// "не хочу чтоб анимация всё время работала, только когда навожу"): at rest each
// card shows its finished state (Auto = the written line; Tap = a neat deck), and
// only on hover does the pen fly & write / the deck swipe away with mint checks.
// A subtle 3D tilt on hover adds depth. Titles in Space Grotesk, the written word
// in Caveat. Logic stays upstream.
interface Props {
  mode: "auto" | "tap";
  onAuto: () => void;
  onTap: () => void;
}

const SWIPE = [
  { id: "greenhouse", d: 0 },
  { id: "linkedin", d: 0.9 },
  { id: "indeed", d: 1.8 },
];
const STARS = [
  { l: 14, t: 22, s: 2, o: 0.7 }, { l: 34, t: 58, s: 1.5, o: 0.4 },
  { l: 52, t: 30, s: 2, o: 0.6 }, { l: 70, t: 66, s: 1.5, o: 0.35 },
  { l: 86, t: 40, s: 2, o: 0.55 }, { l: 92, t: 18, s: 1.5, o: 0.4 },
];

export default function LaunchModeCards({ mode, onAuto, onTap }: Props) {
  return (
    <div className="lmc grid grid-cols-2 gap-4 pt-2" style={{ perspective: "950px" }}>
      <style>{`
        .lmc-slot{position:relative}
        /* halo pooling under the card — the glow arc from the reference */
        .lmc-halo{position:absolute;left:50%;bottom:-16%;width:78%;height:58%;transform:translateX(-50%);
          border-radius:50%;background:radial-gradient(circle,var(--halo),transparent 62%);filter:blur(22px);
          z-index:0;pointer-events:none;opacity:.9;transition:opacity .4s}
        .lmc-slot:hover .lmc-halo{opacity:1}

        .lmc-card{
          /* DAY (base): light frosted glass, soft violet bloom */
          --card:linear-gradient(165deg,#fcfbff 0%,#efeaff 100%);
          --body:linear-gradient(180deg,#f6f3ff 0%,#eae4ff 100%);
          --edge:rgba(108,92,231,.16);
          --bloomA:rgba(139,124,240,.55); --bloomB:rgba(91,108,255,.26);
          --halo:rgba(124,108,255,.30); --star:rgba(108,92,231,.55);
          --title:#1A1A2E; --sub:rgba(75,75,110,.82);
          --pen:#4a4668; --script:#6C5CE7;
          position:relative;z-index:1;display:flex;flex-direction:column;width:100%;
          padding:14px 14px 15px;border-radius:22px;border:1px solid var(--edge);background:var(--card);
          text-align:center;transform:perspective(950px) rotateX(0) rotateY(0);transform-style:preserve-3d;
          transition:transform .5s cubic-bezier(.25,1,.4,1),box-shadow .35s,border-color .25s;
          box-shadow:0 20px 45px -22px rgba(108,92,231,.42),inset 0 1px 0 rgba(255,255,255,.8)}
        .dark .lmc-card{
          /* NIGHT: deep dark glass, bright violet→blue bloom through the slab */
          --card:linear-gradient(165deg,#1b1830 0%,#100d1c 100%);
          --body:linear-gradient(180deg,#151222 0%,#0c0a15 100%);
          --edge:rgba(255,255,255,.12);
          --bloomA:rgba(146,138,255,.92); --bloomB:rgba(74,98,240,.42);
          --halo:rgba(108,92,231,.72); --star:#ffffff;
          --title:#f2f1fa; --sub:rgba(199,200,216,.72);
          --pen:#e8e4ff; --script:#c3b6ff;
          box-shadow:0 26px 55px -22px rgba(70,48,150,.6),inset 0 1px 0 rgba(255,255,255,.12)}
        .lmc-card:hover{transform:perspective(950px) rotateX(5deg) rotateY(-6deg) translateY(-4px);
          box-shadow:0 30px 60px -20px rgba(108,92,231,.5)}
        .lmc-tap:hover{transform:perspective(950px) rotateX(5deg) rotateY(6deg) translateY(-4px)}
        .lmc-card.on{border-color:color-mix(in srgb,var(--color-accent) 60%,transparent);
          box-shadow:0 0 30px -6px var(--color-accent),0 20px 45px -22px rgba(108,92,231,.42)}
        .lmc-card.on-tap{border-color:color-mix(in srgb,var(--color-green) 60%,transparent);
          box-shadow:0 0 30px -6px var(--color-green),0 20px 45px -22px rgba(108,92,231,.42)}

        /* the glass window that the bloom glows through */
        .lmc-body{position:relative;width:100%;height:106px;border-radius:15px;overflow:hidden;margin-bottom:11px;
          background:var(--body);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -1px 0 rgba(0,0,0,.15)}
        .lmc-bloom{position:absolute;left:50%;bottom:0;width:88%;height:82%;transform:translateX(-50%);
          background:radial-gradient(58% 54% at 50% 66%,var(--bloomA),var(--bloomB) 46%,transparent 73%);
          filter:blur(7px);pointer-events:none;z-index:0}
        .lmc-stars{position:absolute;inset:0;pointer-events:none;z-index:1}
        .lmc-star{position:absolute;border-radius:50%;background:var(--star)}
        .lmc-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2}

        .lmc-title{font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:20px;color:var(--title);line-height:1}
        .lmc-sub{font-size:12px;color:var(--sub);margin-top:4px}

        /* ── AUTO: rest = written line; hover = pen flies & rewrites ── */
        .lmc-writebox{position:relative;width:172px;height:44px}
        .lmc-script{position:absolute;left:2px;top:2px;font-family:'Caveat',cursive;font-weight:700;font-size:30px;
          color:var(--script);white-space:nowrap;text-shadow:0 1px 8px var(--bloomA)}
        .lmc-underline{position:absolute;left:2px;bottom:2px;height:2px;width:140px;border-radius:2px;
          background:var(--script);opacity:.55;transform-origin:left;transform:scaleX(1)}
        .lmc-pen{position:absolute;left:-8px;top:-16px;color:var(--pen);opacity:0;transform-origin:bottom left;
          filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
        .lmc-card:hover .lmc-script{animation:lmcReveal 3.4s ease-in-out infinite}
        .lmc-card:hover .lmc-underline{animation:lmcUnder 3.4s ease-in-out infinite}
        .lmc-card:hover .lmc-pen{animation:lmcPen 3.4s ease-in-out infinite}
        @keyframes lmcReveal{0%{clip-path:inset(0 101% 0 0)}42%{clip-path:inset(0 -3% 0 0)}82%{clip-path:inset(0 -3% 0 0)}100%{clip-path:inset(0 -3% 0 0)}}
        @keyframes lmcUnder{0%{transform:scaleX(0)}42%{transform:scaleX(1)}100%{transform:scaleX(1)}}
        @keyframes lmcPen{0%{opacity:1;transform:translateX(0) rotate(-8deg)}42%{opacity:1;transform:translateX(140px) rotate(-8deg)}70%{opacity:1;transform:translateX(140px) rotate(-8deg)}82%{opacity:0;transform:translateX(140px) rotate(-8deg)}100%{opacity:0}}

        /* ── TAP: rest = neat deck; hover = cards swipe away + mint check ── */
        .lmc-deck{position:relative;width:108px;height:80px}
        .lmc-mini{position:absolute;inset:0;border-radius:12px;background:rgba(255,255,255,.96);
          border:1px solid rgba(0,0,0,.06);box-shadow:0 10px 22px -8px rgba(0,0,0,.4);
          padding:9px;display:flex;flex-direction:column;gap:6px}
        .lmc-mini:nth-child(1){transform:translateY(-7px) scale(1);z-index:3}
        .lmc-mini:nth-child(2){transform:translateY(1px) scale(.95);z-index:2}
        .lmc-mini:nth-child(3){transform:translateY(9px) scale(.9);z-index:1}
        .lmc-card:hover .lmc-mini{animation:lmcSwipe 3s ease-in-out infinite}
        @keyframes lmcSwipe{
          0%{transform:translateY(-7px) scale(1);opacity:1}
          22%{transform:translateY(-7px) scale(1);opacity:1}
          40%{transform:translateX(150%) translateY(-7px) rotate(16deg);opacity:0}
          100%{transform:translateX(150%) translateY(-7px) rotate(16deg);opacity:0}}
        .lmc-logo{width:24px;height:24px;border-radius:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);
          display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
        .lmc-line{height:5px;border-radius:3px;background:rgba(30,30,50,.14)}
        .lmc-check{position:absolute;right:-7px;top:-7px;width:26px;height:26px;border-radius:50%;
          background:var(--color-green);color:#fff;display:flex;align-items:center;justify-content:center;
          opacity:0;box-shadow:0 4px 12px -2px rgba(0,184,148,.7)}
        .lmc-card:hover .lmc-check{animation:lmcCheck 3s ease-in-out infinite}
        @keyframes lmcCheck{0%,26%{opacity:0;transform:scale(.4)}33%{opacity:1;transform:scale(1)}40%{opacity:0;transform:scale(1.3)}100%{opacity:0}}

        @media (prefers-reduced-motion: reduce){
          .lmc-card:hover,.lmc-tap:hover{transform:none}
          .lmc-card:hover .lmc-script,.lmc-card:hover .lmc-underline,.lmc-card:hover .lmc-pen,
          .lmc-card:hover .lmc-mini,.lmc-card:hover .lmc-check{animation:none}
        }
      `}</style>

      {/* AUTO */}
      <div className="lmc-slot">
        <span className="lmc-halo" aria-hidden />
        <button type="button" onClick={onAuto} aria-pressed={mode === "auto"}
          className={`lmc-card ${mode === "auto" ? "on" : ""}`}>
          <div className="lmc-body">
            <span className="lmc-bloom" aria-hidden />
            <div className="lmc-stars" aria-hidden>
              {STARS.map((st, i) => (
                <span key={i} className="lmc-star" style={{
                  left: `${st.l}%`, top: `${st.t}%`, width: st.s, height: st.s, opacity: st.o,
                }} />
              ))}
            </div>
            <div className="lmc-scene">
              <div className="lmc-writebox">
                <span className="lmc-script">your cover letter</span>
                <span className="lmc-underline" />
                <svg className="lmc-pen" width="28" height="28" viewBox="0 0 24 24" fill="none"
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
      </div>

      {/* TAP */}
      <div className="lmc-slot">
        <span className="lmc-halo" aria-hidden />
        <button type="button" onClick={onTap} aria-pressed={mode === "tap"}
          className={`lmc-card lmc-tap ${mode === "tap" ? "on-tap" : ""}`}>
          <div className="lmc-body">
            <span className="lmc-bloom" aria-hidden />
            <div className="lmc-stars" aria-hidden>
              {STARS.map((st, i) => (
                <span key={i} className="lmc-star" style={{
                  left: `${(st.l + 22) % 100}%`, top: `${st.t}%`, width: st.s, height: st.s, opacity: st.o,
                }} />
              ))}
            </div>
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
          </div>
          <span className="lmc-title">Tap</span>
          <span className="lmc-sub">Review each on a card</span>
        </button>
      </div>
    </div>
  );
}
