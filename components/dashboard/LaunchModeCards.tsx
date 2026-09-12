"use client";

import type { CSSProperties } from "react";

// Auto/Tap launch cards, rebuilt to the product's real atmosphere (Igor's refs,
// 2026-08-12): a dark frosted-glass slab with a violet→blue light bloom glowing
// UP THROUGH the glass and a soft halo arc pooling beneath the card, all on
// near-black. Not white plates. Fully themed — light frosted glass + violet bloom
// by day, deep dark glass + brighter bloom by night. Motion is HOVER-ONLY (Igor:
// "не хочу чтоб анимация всё время работала, только когда навожу"): at rest each
// card shows its finished state (Auto = the written line; Tap = a neat deck), and
// only on hover does the Auto reel scroll employers / the Tap deck swipe away with
// mint checks. A subtle 3D tilt on hover adds depth. Titles in Space Grotesk.
//
// Auto's scene was a pen flying across "your cover letter" in Caveat. Igor 09-11:
// "вместо ручки летающей — просто блок с вакансией, и при наведении компании
// начинают прокручиваться". The pen showed what we WRITE; a job block shows what
// the run is actually for, in the same language the Tap deck already speaks — and
// the card keeps its exact size. Logic stays upstream.
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
// The employers on the Auto reel are a decorative sample, not data — the real run
// pulls from the user's own pool. Monogram tint = the company's own brand color, so
// the strip reads as postings rather than as placeholder chips.
const REEL = [
  { c: "Stripe", r: "Product Designer", w: "Remote · US", k: "#635BFF" },
  { c: "Notion", r: "Frontend Engineer", w: "Hybrid · NY", k: "#2F2F2F" },
  { c: "Figma", r: "Design Systems", w: "Remote", k: "#F24E1E" },
  { c: "Shopify", r: "Growth Marketer", w: "Remote · CA", k: "#5E8E3E" },
  { c: "Linear", r: "Product Manager", w: "Remote", k: "#5E6AD2" },
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
        /* --halo used to live on .lmc-card, but the halo is the card's SIBLING —
           custom properties don't cross siblings, so the arc never rendered.
           Declared on the slot (their shared parent), both themes. */
        .lmc-slot{position:relative;--halo:rgba(255,204,110,.32)}
        .dark .lmc-slot{--halo:rgba(108,92,231,.72)}
        /* halo pooling under the card — the glow arc from the reference */
        .lmc-halo{position:absolute;left:50%;bottom:-16%;width:78%;height:58%;transform:translateX(-50%);
          border-radius:50%;background:radial-gradient(circle,var(--halo),transparent 62%);filter:blur(22px);
          z-index:0;pointer-events:none;opacity:.9;transition:opacity .4s}
        .lmc-slot:hover .lmc-halo{opacity:1}

        .lmc-card{
          /* DAY (base): cream/white glass with a soft butter-yellow bloom (Igor
             09-11: "не фиолетовые — крем, белый, жёлтый, слегка полупрозрачно").
             Violet stays the SELECTED-state ring (that's the functional accent),
             day's atmosphere is warm. Night keeps the violet world. */
          --card:linear-gradient(165deg,#fffefa 0%,#fdf4e3 100%);
          --body:linear-gradient(180deg,#fffdf6 0%,#faf0da 100%);
          --edge:rgba(198,158,74,.20);
          --bloomA:rgba(255,216,130,.48); --bloomB:rgba(255,240,205,.30);
          --halo:rgba(255,204,110,.32); --star:rgba(206,158,64,.55);
          --title:#2A2418; --sub:rgba(110,95,64,.82);
          --pen:#5a5040; --script:#B8860B;
          /* the card IS the space window: scene runs edge-to-edge under the frame,
             title/sub sit on top of it at the bottom (Igor 08-15: "заполняла рамку целиком") */
          position:relative;z-index:1;display:block;width:100%;height:172px;overflow:hidden;
          padding:0;border-radius:22px;border:1px solid var(--edge);background:var(--body);
          text-align:center;transform:perspective(950px) rotateX(0) rotateY(0);transform-style:preserve-3d;
          transition:transform .5s cubic-bezier(.25,1,.4,1),box-shadow .35s,border-color .25s;
          box-shadow:0 20px 45px -22px rgba(178,138,58,.38),inset 0 1px 0 rgba(255,255,255,.85)}
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
          box-shadow:0 30px 60px -20px rgba(178,138,58,.44)}
        .dark .lmc-card:hover{box-shadow:0 30px 60px -20px rgba(108,92,231,.5)}
        .lmc-tap:hover{transform:perspective(950px) rotateX(5deg) rotateY(6deg) translateY(-4px)}
        .lmc-card.on{border-color:color-mix(in srgb,var(--color-accent) 60%,transparent);
          box-shadow:0 0 30px -6px var(--color-accent),0 20px 45px -22px rgba(178,138,58,.38)}
        .lmc-card.on-tap{border-color:color-mix(in srgb,var(--color-green) 60%,transparent);
          box-shadow:0 0 30px -6px var(--color-green),0 20px 45px -22px rgba(178,138,58,.38)}
        .dark .lmc-card.on{box-shadow:0 0 30px -6px var(--color-accent),0 20px 45px -22px rgba(108,92,231,.42)}
        .dark .lmc-card.on-tap{box-shadow:0 0 30px -6px var(--color-green),0 20px 45px -22px rgba(108,92,231,.42)}

        /* the glass window that the bloom glows through */
        .lmc-body{position:absolute;inset:0;overflow:hidden;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -1px 0 rgba(0,0,0,.15)}
        /* bloom sits under the scene, above the caption band — its lower edge feathers into
           the caption so the text stays readable without a hard scrim */
        .lmc-bloom{position:absolute;left:50%;bottom:22px;width:92%;height:78%;transform:translateX(-50%);
          background:radial-gradient(58% 54% at 50% 68%,var(--bloomA),var(--bloomB) 46%,transparent 73%);
          filter:blur(9px);pointer-events:none;z-index:0}
        .lmc-stars{position:absolute;inset:0;pointer-events:none;z-index:1}
        .lmc-star{position:absolute;border-radius:50%;background:var(--star)}
        /* scene occupies the space above the caption band */
        .lmc-scene{position:absolute;left:0;right:0;top:0;bottom:56px;display:flex;align-items:center;justify-content:center;z-index:2}
        .dark .lmc-job{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.14);
          box-shadow:0 10px 22px -12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.1)}

        /* caption band overlaid on the bottom of the scene */
        .lmc-caption{position:absolute;left:0;right:0;bottom:0;padding:0 14px 15px;z-index:3;pointer-events:none;
          display:flex;flex-direction:column;align-items:center}
        .lmc-title{font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:20px;color:var(--title);line-height:1;
          text-shadow:0 1px 10px rgba(0,0,0,.18)}
        .lmc-sub{font-size:12px;color:var(--sub);margin-top:4px}

        /* ── AUTO: rest = one job block; hover = the reel scrolls employers ──
           The rail holds the list TWICE and travels exactly -50%, so the loop has no
           visible seam. That only holds if every item contributes the SAME height to
           both halves — hence margin-bottom on each row instead of a flex gap, which omits
           the trailing step and would drift the seam by one gap every cycle.
           Edges fade with mask-image, never a gradient overlay: an overlay would smear
           a grey band across the bloom glowing up through the glass. The mask is applied
           ON HOVER ONLY, so the resting job block keeps crisp edges. */
        /* Geometry per Igor's read of the comparison (09-11): wider (210px), sits LOW —
           the second job peeks half-cut behind the "Auto" caption — and always dissolves
           toward the card's bottom, so the caption reads over the ghost of the next
           posting. On hover the top edge fades too, and the loop runs at half speed. */
        .lmc-scene-auto{bottom:6px}
        .lmc-reel{position:relative;width:252px;height:134px;overflow:hidden;
          -webkit-mask-image:linear-gradient(180deg,#000 0,#000 52%,transparent 97%);
          mask-image:linear-gradient(180deg,#000 0,#000 52%,transparent 97%)}
        .lmc-card:hover .lmc-reel{
          -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 52%,transparent 97%);
          mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 52%,transparent 97%)}
        .lmc-rail{display:block;will-change:transform}
        .lmc-card:hover .lmc-rail{animation:lmcReel 14s linear infinite}
        @keyframes lmcReel{from{transform:translateY(0)}to{transform:translateY(-50%)}}
        /* Glass, not a white plate (Igor 09-11): barely-there translucency so the bloom
           glows THROUGH the row. Alpha lives in the background color + backdrop blur —
           never in opacity, which would dim the text with the frame. Night flips the
           text light because the glass there is dark. */
        .lmc-job{height:84px;margin-bottom:8px;border-radius:14px;padding:0 14px;text-align:left;
          background:rgba(255,255,255,.40);border:1px solid rgba(255,255,255,.55);
          backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
          box-shadow:0 10px 22px -12px rgba(150,116,48,.30), inset 0 1px 0 rgba(255,255,255,.5);
          display:grid;grid-template-columns:34px 1fr;column-gap:10px;row-gap:2px;align-content:center}
        .lmc-mono{grid-row:1 / span 2;align-self:center;width:34px;height:34px;border-radius:10px;
          background:var(--k);color:#fff;font-weight:700;font-size:15px;line-height:1;
          font-family:'Space Grotesk','Inter',sans-serif;
          display:flex;align-items:center;justify-content:center}
        .lmc-jr{font-size:12.5px;font-weight:600;color:#2A2418;line-height:1.2;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lmc-jc{grid-column:2;font-size:10.5px;color:rgba(90,78,50,.78);line-height:1.2;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dark .lmc-jr{color:#f2f1fa}
        .dark .lmc-jc{color:rgba(199,200,216,.75)}

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
          .lmc-card:hover .lmc-rail,
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
            <div className="lmc-scene lmc-scene-auto">
              {/* Decorative in full: the button already says Auto / "Fills & sends for you". */}
              <div className="lmc-reel" aria-hidden>
                <div className="lmc-rail">
                  {[...REEL, ...REEL].map((j, i) => (
                    <div key={`${j.c}-${i}`} className="lmc-job"
                      style={{ "--k": j.k } as CSSProperties}>
                      <span className="lmc-mono">{j.c[0]}</span>
                      <span className="lmc-jr">{j.r}</span>
                      <span className="lmc-jc">{j.c} · {j.w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lmc-caption">
              <span className="lmc-title">Auto</span>
              <span className="lmc-sub">Fills &amp; sends for you</span>
            </div>
          </div>
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
            <div className="lmc-caption">
              <span className="lmc-title">Tap</span>
              <span className="lmc-sub">Review each on a card</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
