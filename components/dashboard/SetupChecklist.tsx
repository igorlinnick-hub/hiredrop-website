"use client";

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  cta: string;
}

interface Props {
  onboardingComplete: boolean;
  hasResume: boolean;
  hasKeywords: boolean;
}

export default function SetupChecklist({ onboardingComplete, hasResume, hasKeywords }: Props) {
  const profileDone = onboardingComplete && hasKeywords;
  const allDone = profileDone && hasResume;

  if (allDone) return null;

  const steps: Step[] = [
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add your name, job keywords, preferred location, and platforms.",
      done: profileDone,
      href: onboardingComplete ? "/dashboard/settings" : "/onboarding",
      cta: onboardingComplete ? "Edit profile →" : "Start setup →",
    },
    {
      id: "resume",
      label: "Upload your resume",
      description: "HireDrop uses your PDF to fill application forms and generate cover letters.",
      done: hasResume,
      href: "/dashboard/settings",
      cta: "Upload resume →",
    },
    {
      id: "extension",
      label: "Install the Chrome extension",
      description: "The extension is what actually submits applications on Indeed. Install it and click Connect Account.",
      done: false,
      href: "https://hiredrop.io/extension",
      cta: "Get extension →",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text text-sm">Get ready to launch</h3>
          <p className="text-xs text-text2 mt-0.5">{doneCount} of {steps.length} steps complete</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-surface2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-text2 font-medium tabular-nums">{pct}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-border">
        {steps.map((step, i) => (
          <div key={step.id} className={`flex items-start gap-4 px-5 py-4 ${step.done ? "opacity-60" : ""}`}>
            {/* Step number / checkmark */}
            <div className={[
              "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              step.done
                ? "bg-green/15 text-green"
                : "bg-accent/10 text-accent border border-accent/20",
            ].join(" ")}>
              {step.done ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-text2" : "text-text"}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="text-xs text-text2 mt-0.5 leading-relaxed">{step.description}</p>
              )}
            </div>

            {/* CTA */}
            {!step.done && step.href && (
              <a
                href={step.href}
                target={step.href.startsWith("http") ? "_blank" : undefined}
                rel={step.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex-shrink-0 text-xs font-semibold text-accent hover:text-accent2 transition whitespace-nowrap mt-0.5"
              >
                {step.cta}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
