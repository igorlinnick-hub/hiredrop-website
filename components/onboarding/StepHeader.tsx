// Per-step header for the onboarding quiz: a context-specific brand glass/space
// PHOTO (public/onboarding/step-N.jpg) filling the card edge-to-edge. No text —
// the step's own title/form sits below; the image alone sets the mood. Full-bleed,
// scaled a touch, with a faint bottom fade so it grounds into the white content.
export default function StepHeader({ step }: { step: number }) {
  if (step < 1 || step > 10) return null;
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
