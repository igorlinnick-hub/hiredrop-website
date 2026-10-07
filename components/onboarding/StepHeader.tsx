// Per-step onboarding header. Most steps show a scene with Drop acting out the step
// (public/onboarding/step-N.jpg) at the scene's own proportions, so nothing is cut.
// Step 4 (Platforms) is built in code on the same cream ground: Drop (approved cut-out
// pose) presenting the REAL platform logos — a model can't draw those logos faithfully.

import { STEPS } from "@/lib/onboarding/steps";
import DropCameo from "@/components/landing/DropCameo";
import { dropArt } from "@/lib/dropArt";

const PLATFORMS = ["indeed", "linkedin", "ziprecruiter", "greenhouse", "lever", "ashby"];

function PlatformsHeader() {
  return (
    <div
      className="relative w-full aspect-[16/7] overflow-hidden"
      style={{ background: "radial-gradient(90% 120% at 50% 35%, #FBF8F2 0%, #F4F0E8 55%, #EAE2D3 100%)" }}
    >
      {/* Scales with the header like the generated scenes: about 2/3 of its height. */}
      <div className="absolute bottom-[6%] left-[9%] w-[25%]">
        <DropCameo pose="point" width={150} flip enter="up" className="!w-full" />
      </div>
      <div className="absolute inset-y-0 right-[7%] flex w-[56%] items-center justify-center">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {PLATFORMS.map((id) => (
            <span
              key={id}
              className="flex aspect-square w-11 sm:w-[72px] items-center justify-center rounded-2xl bg-white border border-[#E7E0D2]"
              style={{ boxShadow: "0 10px 24px -14px rgba(58,44,18,0.35)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/onboarding/logos/${id}.png`} alt="" aria-hidden className="w-6 h-6 sm:w-9 sm:h-9 object-contain" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function StepHeader({ step }: { step: number }) {
  const art = STEPS[step - 1]?.art;
  if (!art) return null;
  return art === 4 ? <PlatformsHeader /> : <PhotoHeader art={art} />;
}

function PhotoHeader({ art }: { art: number }) {
  // The scenes are 16:7 (1536×672); the box takes the same ratio, so Drop and his props
  // are never cropped.
  return (
    <div className="relative w-full aspect-[16/7] overflow-hidden bg-[#F4F0E8]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dropArt(`/onboarding/step-${art}.jpg`)}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
