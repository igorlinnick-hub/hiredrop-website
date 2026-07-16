import ScrollReveal from "./ScrollReveal";
import DecorMarks from "./DecorMarks";

const MODES = [
  {
    label: "Broad",
    tagline: "Explore the market",
    body: "Apply widely across your field — great for early search or maximum exposure. Skips only clearly unrelated roles.",
  },
  {
    label: "Standard",
    tagline: "Focused by specialty",
    body: "Apply to roles that match your experience and job type. Balanced between reach and relevance — the right default.",
    highlighted: true,
  },
  {
    label: "Precise",
    tagline: "Only the best match",
    body: "Describe your ideal role and the AI compares every listing against it — skipping anything that deviates.",
  },
];

export default function ApplyModes() {
  return (
    <section id="modes" className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="glow-purple" style={{ width: 460, height: 460, top: -140, left: "50%", transform: "translateX(-50%)" }} />
      <DecorMarks />
      <div className="relative z-10 max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-14">
          <span className="inline-block mb-4 px-3.5 py-1.5 rounded-full bg-[#EEE9FF] text-[#6C5CE7] text-xs font-semibold">
            You&apos;re in control
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            You choose how selective it is
          </h2>
          <p className="mt-4 text-lg text-[#6B6B8A] max-w-2xl mx-auto">
            Apply Modes let you dial in the precision — from exploring widely to only your best-fit roles.
            Quality over volume, always your call.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((m, i) => (
            <ScrollReveal key={m.label} delay={i * 0.12}>
              <div
                className={[
                  "card-lift rounded-2xl p-7 h-full",
                  m.highlighted
                    ? "bg-white border-2 border-accent shadow-xl shadow-accent/10"
                    : "bg-[#F7F7FB] border border-[#E8E8F0]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-[#1A1A2E]">{m.label}</h3>
                  {m.highlighted && (
                    <span className="text-[10px] font-semibold text-accent bg-accent-light px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-accent mb-3">{m.tagline}</p>
                <p className="text-sm text-[#6B6B8A]">{m.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <p className="text-center text-sm text-[#6B6B8A] mt-8 max-w-2xl mx-auto">
          Strong-match roles get a resume tailored to that job. The more precise your mode, the more
          of your applications are tailored — Precise tailors nearly every one.
        </p>
      </div>
    </section>
  );
}
