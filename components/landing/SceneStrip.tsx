import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

// Drop, the HireDrop character, walking through one run: find → tailor → send → done.
// Scenes are generated from the canon (brand/character/R1/white-idle.png) via
// `scripts/gen_character.py scenes` in the workspace root; white background so they
// sit seamlessly in the white tiles.
const PILLARS: { img: string; alt: string; title: string; body: string }[] = [
  {
    img: "find",
    alt: "Drop studying a board of job postings through a magnifying glass",
    title: "Find roles worth it",
    body: "Matched and scored to your profile — you apply where you actually fit.",
  },
  {
    img: "tailor",
    alt: "Drop stamping a stack of applications at a desk",
    title: "Tailored for each job",
    body: "Resume and cover letter rewritten for every role — from your real experience, nothing invented.",
  },
  {
    img: "apply",
    alt: "Drop typing at a laptop while paper planes fly off",
    title: "Applies from your browser",
    body: "Sent from your own Chrome, at a human pace.",
  },
  {
    img: "safe",
    alt: "Drop proudly looking at a tall stack of sent applications",
    title: "Your account stays safe",
    body: "No captcha-cracking, no server bots. The safe way, every time.",
  },
];

export default function SceneStrip() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {PILLARS.map((p, i) => (
          <ScrollReveal key={p.img} delay={i * 0.1}>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-3xl bg-white p-3 mb-5" style={{ boxShadow: "0 12px 36px rgba(108,92,231,0.10)" }}>
                <Image
                  src={`/illustrations/drop/${p.img}.webp`}
                  alt={p.alt}
                  width={200}
                  height={200}
                  className="rounded-2xl"
                  unoptimized
                />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-1.5">{p.title}</h3>
              <p className="text-sm text-[#6B6B8A] max-w-[15rem]">{p.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
