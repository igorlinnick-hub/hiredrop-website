// Per-step header for the onboarding quiz. Most steps show a context-specific
// brand glass/space PHOTO (public/onboarding/step-N.jpg) filling the card
// edge-to-edge, no text. Step 4 (Platforms) is a CSS composite of glass tiles
// carrying the real platform monograms in their brand colours — so "where should
// we apply" reads instantly (AI can't render real logos reliably).

const PLATFORMS = [
  { m: "In", c: "#5B9BF0" }, // Indeed
  { m: "in", c: "#3B82F6" }, // LinkedIn
  { m: "ZR", c: "#34D399" }, // ZipRecruiter
  { m: "GH", c: "#2FD6AC" }, // Greenhouse
  { m: "Le", c: "#F2836B" }, // Lever
  { m: "A", c: "#A78BFA" }, // Ashby
];
const OFFSET = [10, -8, 6, -10, 8, -4];
const ROT = [-6, 4, -3, 5, -4, 6];

function PlatformsHeader() {
  return (
    <div
      className="relative w-full h-40 sm:h-48 overflow-hidden"
      style={{ background: "radial-gradient(120% 110% at 50% 125%, #2a2158 0%, #14102e 52%, #0a0a14 100%)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center gap-2.5 sm:gap-4 px-4">
        {PLATFORMS.map((p, i) => (
          <div
            key={p.m}
            className="relative flex items-center justify-center rounded-2xl shrink-0"
            style={{
              width: 58,
              height: 58,
              transform: `translateY(${OFFSET[i]}px) rotate(${ROT[i]}deg)`,
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 12px 26px -12px ${p.c}, 0 0 22px -10px ${p.c}`,
            }}
          >
            <span className="font-bold" style={{ color: p.c, fontSize: 20, textShadow: `0 0 14px ${p.c}88` }}>
              {p.m}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StepHeader({ step }: { step: number }) {
  if (step < 1 || step > 10) return null;
  if (step === 4) return <PlatformsHeader />;
  return (
    <div className="relative w-full h-40 sm:h-48 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/onboarding/step-${step}.jpg`}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scale(1.12)" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to top, rgba(9,9,18,0.28), transparent)" }}
      />
    </div>
  );
}
