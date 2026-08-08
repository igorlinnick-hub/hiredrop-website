"use client";

// Live hero visual — the product's actual magic in the brand glass/space language:
// a fanned deck of glass cards; the top one loops back(brand) → front(job) → a mint
// "applied" ring, over a violet well with a slow starfall. Committed dark (the hero is
// a dark section). Pure CSS loop, reduced-motion falls back to the job face.
function Droplet({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 100 122" fill="none" className="w-full h-full" aria-hidden>
      <defs>
        <radialGradient id={id} cx="37%" cy="26%" r="82%">
          <stop offset="0" stopColor="#efe8ff" />
          <stop offset="42%" stopColor="#8b7cf0" />
          <stop offset="100%" stopColor="#3f2f95" />
        </radialGradient>
      </defs>
      <path d="M50 8 C30 44 18 62 18 78 a32 32 0 0 0 64 0 C82 62 70 44 50 8Z" fill={`url(#${id})`} />
      <ellipse cx="37" cy="48" rx="9" ry="15" fill="#fff" opacity=".5" transform="rotate(-18 37 48)" />
    </svg>
  );
}

function Back({ id }: { id: string }) {
  return (
    <div className="hdd-glass h-full w-full grid place-items-center relative">
      <span className="hdd-well" aria-hidden />
      <div style={{ width: 58, height: 72, filter: "drop-shadow(0 12px 24px rgba(108,92,231,.6))" }}>
        <Droplet id={id} />
      </div>
      <span className="absolute bottom-5 left-0 right-0 text-center text-[9px] font-bold"
        style={{ color: "rgba(217,210,255,.6)", letterSpacing: "3.5px" }}>HIREDROP</span>
    </div>
  );
}

const STARS = [
  { l: 14, d: 12, dl: 0, o: 0.55, s: 2 }, { l: 30, d: 17, dl: -6, o: 0.32, s: 1.5 },
  { l: 47, d: 10, dl: -3, o: 0.5, s: 2 }, { l: 64, d: 15, dl: -9, o: 0.3, s: 1.5 },
  { l: 80, d: 12, dl: -5, o: 0.45, s: 2 }, { l: 91, d: 18, dl: -12, o: 0.35, s: 1.5 },
];

export default function HeroDeck() {
  return (
    <div className="hdd-wrap" aria-hidden>
      <style>{`
        .hdd-wrap{position:relative;width:300px;max-width:78vw;aspect-ratio:5/7;perspective:1500px}
        .hdd-glass{
          position:relative;overflow:hidden;border-radius:20px;
          background:radial-gradient(120% 90% at 50% 108%, #3a2d7a 0%, #1a1536 42%, #0c0b14 78%);
          border:1px solid rgba(255,255,255,.12);
          box-shadow:0 30px 70px -28px rgba(70,48,150,.7), inset 0 1px 0 rgba(255,255,255,.14);
        }
        .hdd-glass::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
          background:radial-gradient(90% 60% at 18% -8%, rgba(255,255,255,.12), transparent 55%)}
        .hdd-well{position:absolute;left:50%;bottom:-14%;width:135%;aspect-ratio:1;transform:translateX(-50%);
          border-radius:9999px;background:radial-gradient(circle, rgba(58,45,122,.85), transparent 62%);filter:blur(8px)}
        .hdd-card{position:absolute;inset:0}
        .hdd-b2{transform:translateY(26px) scale(.92) rotate(3deg);opacity:.55}
        .hdd-b1{transform:translateY(13px) scale(.96) rotate(-2.4deg);opacity:.8}

        .hdd-flip{position:relative;width:100%;height:100%;transform-style:preserve-3d;
          animation:hddFlip 9s ease-in-out infinite}
        @keyframes hddFlip{0%,30%{transform:rotateY(0deg)}42%,82%{transform:rotateY(180deg)}94%,100%{transform:rotateY(0deg)}}
        .hdd-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
        .hdd-front{transform:rotateY(180deg)}

        .hdd-stars{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
        .hdd-star{position:absolute;top:0;border-radius:9999px;background:#fff;animation:hddStar linear infinite}
        @keyframes hddStar{0%{transform:translateY(-20px);opacity:0}12%{opacity:var(--o)}86%{opacity:var(--o)}100%{transform:translateY(430px);opacity:0}}

        .hdd-ring{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:9999px;
          border:1.6px solid rgba(0,184,148,.85);box-shadow:0 0 24px rgba(0,184,148,.5);pointer-events:none;
          animation:hddRing 9s ease-out infinite}
        @keyframes hddRing{0%,54%{opacity:0;transform:scale(.4)}60%{opacity:.9}74%,100%{opacity:0;transform:scale(1.85)}}

        @media (prefers-reduced-motion: reduce){
          .hdd-flip{animation:none;transform:rotateY(180deg)}
          .hdd-star{animation:none;opacity:.4}
          .hdd-ring{display:none}
        }
      `}</style>

      {/* fanned brand backs behind */}
      <div className="hdd-card hdd-b2"><Back id="hddB2" /></div>
      <div className="hdd-card hdd-b1"><Back id="hddB1" /></div>

      {/* top card: flips brand-back → job-front, loops */}
      <div className="hdd-card">
        <div className="hdd-flip">
          {/* BACK (brand) */}
          <div className="hdd-face"><Back id="hddTop" /></div>

          {/* FRONT (a sample job) */}
          <div className="hdd-face hdd-front">
            <div className="hdd-glass h-full w-full p-5 flex flex-col">
              <div className="hdd-stars">
                {STARS.map((st, i) => (
                  <span key={i} className="hdd-star" style={{
                    left: `${st.l}%`, width: st.s, height: st.s,
                    animationDuration: `${st.d}s`, animationDelay: `${st.dl}s`,
                    ["--o" as string]: st.o,
                  }} />
                ))}
              </div>
              <div className="relative flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold shrink-0"
                    style={{ background: "rgba(108,92,231,.28)", color: "#c7bcff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)" }}>G</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A78BFA" }}>Greenhouse · Glossier</p>
                    <h3 className="text-lg font-bold leading-tight mt-0.5" style={{ color: "#f4f2ff" }}>Social Media Manager</h3>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(108,92,231,.2)", color: "#c7bcff" }}>Remote</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,184,148,.18)", color: "#5eead4" }}>Fit 8/10</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: "92%", background: "rgba(255,255,255,.1)" }} />
                  <div className="h-1.5 rounded-full" style={{ width: "80%", background: "rgba(255,255,255,.08)" }} />
                  <div className="h-1.5 rounded-full" style={{ width: "88%", background: "rgba(255,255,255,.08)" }} />
                  <div className="h-1.5 rounded-full" style={{ width: "56%", background: "rgba(255,255,255,.06)" }} />
                </div>
                <div className="mt-auto pt-4">
                  <div className="h-px w-full rounded-full" style={{ background: "linear-gradient(90deg,#6C5CE7,#00B894)", opacity: .8 }} />
                  <p className="text-center text-[8px] font-bold mt-1.5" style={{ color: "rgba(199,188,255,.55)", letterSpacing: "3px" }}>HIREDROP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className="hdd-ring" />
      </div>
    </div>
  );
}
