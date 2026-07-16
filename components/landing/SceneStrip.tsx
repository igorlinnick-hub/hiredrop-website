import { Scene, type SceneName } from "@/components/illustrations/Scene";
import ScrollReveal from "./ScrollReveal";

const PILLARS: { name: SceneName; title: string; body: string }[] = [
  { name: "search", title: "Find roles worth it", body: "Matched and scored to your profile — you apply where you actually fit." },
  { name: "apply", title: "Applies from your browser", body: "Tailored resume and cover letter, submitted at a human pace." },
  { name: "safe", title: "Your account stays safe", body: "No captcha-cracking, no server bots. The safe way, every time." },
];

export default function SceneStrip() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {PILLARS.map((p, i) => (
          <ScrollReveal key={p.name} delay={i * 0.12}>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-3xl bg-white p-3 mb-5" style={{ boxShadow: "0 12px 36px rgba(108,92,231,0.10)" }}>
                <Scene name={p.name} size={180} />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-1.5">{p.title}</h3>
              <p className="text-sm text-[#6B6B8A] max-w-xs">{p.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
