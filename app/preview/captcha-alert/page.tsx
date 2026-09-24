"use client";

import { useState } from "react";
import { CaptchaPanel, type CaptchaShape } from "@/components/dashboard/CaptchaAlert";

/**
 * Logged-out look at the captcha hand-off block (Igor, 09-24: not a red banner —
 * the poster-panel language, "как куб"). Both shapes, both themes, both kinds
 * (captcha / consent wall). The panel is the REAL component with fake data.
 */

const CAPTCHA = { site: "Indeed", kind: "captcha", at: Date.now() };
const TERMS = { site: "Greenhouse", kind: "terms", at: Date.now() };

export default function CaptchaAlertPreview() {
  const [dark, setDark] = useState(true);
  const [shape, setShape] = useState<CaptchaShape>("cube");

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-text mr-auto">Captcha hand-off block</p>
          <div className="flex rounded-full border border-border bg-surface2 p-0.5 text-xs font-medium">
            {(["cube", "wide"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setShape(s)}
                className={["px-3 py-1 rounded-full transition capitalize",
                  shape === s ? "bg-text text-background" : "text-text2 hover:text-text"].join(" ")}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setDark((d) => !d)}
            className="px-3 py-1 rounded-full border border-border bg-surface2 text-xs font-medium text-text2 hover:text-text transition">
            {dark ? "Day" : "Night"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-10">
        <section>
          <p className="mb-1 text-sm font-semibold text-text">Captcha</p>
          <p className="mb-4 text-xs text-text2/70 max-w-lg">
            Shows on every dashboard page while the extension holds a captcha hand-off
            (campaign page keeps its own richer banner). Clears itself the moment the
            wall is solved.
          </p>
          <CaptchaPanel captcha={CAPTCHA} shape={shape} />
        </section>

        <section>
          <p className="mb-1 text-sm font-semibold text-text">Consent wall</p>
          <p className="mb-4 text-xs text-text2/70 max-w-lg">
            Same block, the terms flavor — we never click Accept for the user.
          </p>
          <CaptchaPanel captcha={TERMS} shape={shape} />
        </section>
      </div>
    </div>
  );
}
