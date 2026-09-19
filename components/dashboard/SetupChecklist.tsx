"use client";

import { useEffect, useState } from "react";

import { PLATFORMS } from "@/lib/constants";
import { checkExtensionPresent, detectBrowser, type BrowserKind } from "./StartReadiness";
import { isLiveConnected, type Conn } from "./PlatformsIndicator";

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
}

interface Props {
  onboardingComplete: boolean;
  hasResume: boolean;
  hasKeywords: boolean;
  // Either source counts: generated skill_groups or the typed skills_description.
  hasSkills: boolean;
}

const CONNECTABLE = PLATFORMS.filter((p) => p.connectable);

// Personalized "what's left" card. Server-known steps (profile, resume) come as
// props; the two steps the server CANNOT know — extension installed on THIS
// browser, platform accounts logged in — are probed live: the PING bridge for
// presence, HIREDROP_GET_PLATFORM_CONNECTIONS for per-platform login state
// (same protocol as PlatformsIndicator). The card hides only when EVERYTHING
// is done — the old version hid on profile+resume while still listing an
// extension step that was hardcoded undone.
export default function SetupChecklist({ onboardingComplete, hasResume, hasKeywords, hasSkills }: Props) {
  const profileDone = onboardingComplete && hasKeywords;
  const serverDone = profileDone && hasResume && hasSkills;

  // null = still probing. While probing AND the server steps are done we render
  // nothing: the common visitor is fully set up, and flashing a checklist at
  // them for 100ms on every dashboard load is worse than a late pop-in for the
  // rare half-configured one.
  const [extPresent, setExtPresent] = useState<boolean | null>(null);
  const [browser, setBrowser] = useState<BrowserKind>("chromium");
  const [connections, setConnections] = useState<Record<string, Conn>>({});

  useEffect(() => {
    let cancelled = false;
    // Browser kind rides along with the async probe (instead of a sync setState
    // in the effect body): it only changes what we render once probing resolves.
    const probe = () =>
      checkExtensionPresent().then((v) => {
        if (cancelled) return;
        setExtPresent(v);
        setBrowser(detectBrowser());
      });
    probe();

    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_PLATFORM_CONNECTIONS" && e.data.ok) {
        setConnections(e.data.connections || {});
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_PLATFORM_CONNECTIONS" }, "*");
    ask();
    const onVisible = () => {
      if (document.hidden) return;
      probe();
      ask();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(ask, 10000);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  const connectedCount = CONNECTABLE.filter((p) => isLiveConnected(connections[p.id])).length;
  const platformsDone = connectedCount > 0;
  const extDone = extPresent === true;
  // Only a desktop Chromium browser can ever host the extension. Elsewhere the
  // two live steps are not actionable — don't hold the card hostage to them
  // (MobileHandoff already tells phone visitors where applying actually runs).
  const chromium = browser === "chromium";

  const allDone = serverDone && (!chromium || (extDone && platformsDone));
  const probing = extPresent === null;
  if (allDone || (serverDone && probing)) return null;

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
      id: "skills",
      label: "List your skills",
      description:
        "Describe what you're good at in Settings → Resume & ATS — we group your skills and build a skills-first resume from them.",
      done: hasSkills,
      href: "/dashboard/settings",
      cta: "Describe skills →",
    },
    {
      id: "extension",
      label: "Install the Chrome extension",
      description: chromium
        ? "The extension is what actually submits applications. Install it, then reload this page."
        : browser === "mobile"
          ? "HireDrop applies from Chrome on your computer — finish this step there."
          : "You're not in Chrome — open this page in Chrome to install the extension.",
      done: extDone,
      href: chromium ? "/extension" : undefined,
      cta: chromium ? "Get extension →" : undefined,
    },
    {
      id: "platforms",
      label: "Connect your job platforms",
      description: extDone
        ? "Log in to Indeed and ZipRecruiter so HireDrop can apply as you."
        : "Needs the extension first — it checks that you're logged in.",
      done: platformsDone,
      href: extDone ? "/dashboard/platforms" : undefined,
      cta: extDone ? "Connect →" : undefined,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden" data-testid="setup-checklist">
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
          <div
            key={step.id}
            data-testid={`checklist-step-${step.id}`}
            className={`flex items-start gap-4 px-5 py-4 ${step.done ? "opacity-60" : ""}`}
          >
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
