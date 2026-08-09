// Premium per-step header for the onboarding quiz: a brand glass/space PHOTO
// (generated, public/onboarding/step-N.jpg) filling a banner, with a soft left
// scrim and one short message overlaid in Space Grotesk — so the person instantly
// gets what the step is for. No icons. Text is CSS (crisp + editable), never baked
// into the image.

const MSG: Record<number, string> = {
  1: "The basics we'll put on every application.",
  2: "What you're after — so we match the right roles.",
  3: "How HireDrop applies without risking your account.",
  4: "Where HireDrop should apply for you.",
  5: "Your resume — we tailor a fresh one for every role.",
  6: "A quick check so it gets past the filters.",
  7: "Your voice — so cover letters sound like you.",
  8: "Start free — 40 applications, no card.",
  9: "The piece that actually applies — right from your browser.",
  10: "You're set — here's what happens next.",
};

export default function StepHeader({ step }: { step: number }) {
  const msg = MSG[step];
  if (!msg) return null;
  // Full-bleed image: fills the card's width edge-to-edge (the card's rounded
  // overflow-hidden clips the top corners). No border/rounding/margin here.
  return (
    <div className="relative w-full h-44 sm:h-52 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/onboarding/step-${step}.jpg`}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* left scrim for legibility + a faint violet→mint brand edge at the bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,18,0.86) 0%, rgba(9,9,18,0.45) 48%, rgba(9,9,18,0.05) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #6C5CE7, #00B894)", opacity: 0.9 }}
      />
      <div className="relative h-full flex items-end p-6 sm:p-7">
        <p
          className="text-white text-xl sm:text-2xl font-semibold leading-snug max-w-md"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}
        >
          {msg}
        </p>
      </div>
    </div>
  );
}
