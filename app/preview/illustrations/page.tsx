import { Scene, type SceneName } from "@/components/illustrations/Scene";

// TEMPORARY preview gallery — do NOT ship.
export const metadata = { title: "Preview — Illustrations" };

const SCENES: { name: SceneName; use: string }[] = [
  { name: "welcome", use: "Welcome / done" },
  { name: "setup", use: "Setup preferences" },
  { name: "search", use: "Find roles" },
  { name: "tailored", use: "Tailored applications" },
  { name: "apply", use: "Apply for you" },
  { name: "safe", use: "Ban-safe / account safety" },
];

export default function IllustrationsPreview() {
  return (
    <div className="min-h-screen bg-background app-ui py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-1">Illustration identity — human scenes</h1>
        <p className="text-text2 mb-10">Monoline · deep violet · generated (Recraft) · consistent set</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {SCENES.map(({ name, use }) => (
            <div
              key={name}
              className="rounded-2xl border border-border bg-surface p-5 flex flex-col items-center text-center"
            >
              <Scene name={name} size={220} />
              <p className="mt-3 text-sm font-semibold text-text">{use}</p>
              <p className="text-xs text-text2 mt-0.5">{name}.png</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
