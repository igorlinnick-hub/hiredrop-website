"use client";

import { useEffect, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";

const DISMISS_KEY = "hd_coach_offer_dismissed";

/** localStorage-backed "did they dismiss this?" flag, as an external store.
 *
 *  Module scope, like InterviewRoom's covered-answers store: `useSyncExternalStore`
 *  keeps the read out of render-triggered state, so dismissing re-renders without a
 *  setState-inside-effect. The server snapshot is `true` — SSR renders nothing and the
 *  card appears after hydration, once we can actually read the flag.
 */
const dismissStore = (() => {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot(): boolean {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false; // Private mode / blocked storage — show it, they can dismiss again.
      }
    },
    getServerSnapshot: (): boolean => true,
    dismiss() {
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
      listeners.forEach((l) => l());
    },
  };
})();

// Fake-door test for the coaching bundle (see docs/handoff/coach-offer.md).
// We do NOT run the coaching — a partner platform does. This card measures one
// thing: does a high-volume applicant click through once the real price is on
// the card? No URL in the env ⇒ the card does not exist. That is deliberate:
// the door never opens onto nothing.
//
// Honesty rules baked in, do not "optimize" them away:
//   • the partner's real starting price is on the card, before the click;
//   • the affiliate relationship is disclosed (FTC 16 CFR 255) — hence rel="sponsored";
//   • no outcome promise ("get hired", "guaranteed interviews") — that is FTC territory.
export default function CoachOffer({ totalApplications }: { totalApplications: number }) {
  const url = process.env.NEXT_PUBLIC_COACH_URL;
  const price = process.env.NEXT_PUBLIC_COACH_PRICE_NOTE ?? "from $70/week";
  const threshold = Number(process.env.NEXT_PUBLIC_COACH_MIN_APPLICATIONS ?? 50);

  const dismissed = useSyncExternalStore(
    dismissStore.subscribe,
    dismissStore.getSnapshot,
    dismissStore.getServerSnapshot,
  );

  const visible = Boolean(url) && totalApplications >= threshold && !dismissed;

  useEffect(() => {
    if (!visible) return;
    // Denominator of the test: how many people saw the price at all.
    track("coach_offer_shown", { applications: totalApplications });
    // Once per mount — re-firing on every applications tick would inflate the denominator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="hd-glass rounded-2xl p-5 border border-accent/25">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-xl leading-none mt-0.5">🎯</span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">
            {totalApplications} applications in. Want a human to look at where they are going?
          </p>
          <p className="text-xs text-text2 mt-1">
            HireDrop handles the sending. A career coach works on the other half — which roles to
            target, how your resume reads to a recruiter, what to say once someone replies.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => track("coach_offer_click", { applications: totalApplications })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                bg-accent text-white hover:bg-accent2 transition"
            >
              Talk to a career coach →
            </a>
            <span className="text-xs text-text2">{price}</span>
          </div>

          <p className="mt-3 text-[11px] text-text2/70">
            Independent partner service, billed by them, not by HireDrop. We may earn a commission
            if you subscribe.
          </p>
        </div>

        <button
          onClick={() => { dismissStore.dismiss(); track("coach_offer_dismissed"); }}
          aria-label="Dismiss"
          className="shrink-0 p-1 rounded-lg text-text2/60 hover:text-text hover:bg-text/5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
