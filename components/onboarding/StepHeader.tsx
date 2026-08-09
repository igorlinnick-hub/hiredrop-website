// Per-step onboarding header. Most steps show a context-specific brand glass/space
// PHOTO (public/onboarding/step-N.jpg) filling the card edge-to-edge. Step 4
// (Platforms) is glass cubes carrying the REAL platform logos on the same
// deep-space ground — icons IN the cubes, so "where should we apply" reads at a glance.

const PLATFORMS = ["indeed", "linkedin", "ziprecruiter", "greenhouse", "lever", "ashby"];
const OFFSET = [10, -8, 6, -10, 8, -4];
const ROT = [-6, 4, -3, 5, -4, 6];

function PlatformsHeader() {
  return (
    <div
      className="relative w-full h-40 sm:h-48 overflow-hidden"
      style={{ background: "radial-gradient(120% 110% at 50% 125%, #2a2158 0%, #14102e 52%, #0a0a14 100%)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center gap-2.5 sm:gap-4 px-4">
        {PLATFORMS.map((id, i) => (
          <div
            key={id}
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{
              width: 58,
              height: 58,
              transform: `translateY(${OFFSET[i]}px) rotate(${ROT[i]}deg)`,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 14px 28px -12px rgba(108,92,231,0.6)",
            }}
          >
            <span
              className="flex items-center justify-center rounded-xl overflow-hidden"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,0.96)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/onboarding/logos/${id}.png`} alt="" aria-hidden style={{ width: 24, height: 24, objectFit: "contain" }} />
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
