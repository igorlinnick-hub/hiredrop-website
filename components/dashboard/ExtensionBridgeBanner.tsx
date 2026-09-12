"use client";

import { useExtensionBridge } from "@/lib/extension-bridge";

/**
 * "The extension was reloaded — reload this tab."
 *
 * Mounted once in DashboardLayout so it covers every dashboard page, /dashboard/tap
 * included. Renders nothing unless the bridge is provably dead (see useExtensionBridge
 * for why "provably" is the whole trick — an orphaned content script still answers the
 * install check, so a live-looking dashboard can be completely disconnected).
 *
 * Styling is the app's existing warning convention — `bg-yellow/10 border-yellow/30`
 * with a `text-yellow` glyph and an accent action, the same shape CampaignView's captcha
 * and signed-out cards use. No colours of its own on purpose: warning surfaces must move
 * together when the palette moves, and they cannot do that through hardcoded hex.
 *
 * Deliberately NOT auto-reloading here — the dashboard may be mid-run with an open
 * campaign view, and yanking the page out from under the user is worse than telling them.
 * (TapView keeps its own one-shot auto-heal on the faster LIVE_STATE pulse; when its
 * sessionStorage guard has already spent that one reload, this banner is what the user
 * sees instead of a silent dead page.)
 */
export default function ExtensionBridgeBanner() {
  const health = useExtensionBridge();
  if (health !== "dead") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-yellow/10 border border-yellow/30"
    >
      <svg className="w-5 h-5 text-yellow shrink-0 mt-0.5" fill="none" stroke="currentColor"
        strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>

      <div className="text-sm flex-1 min-w-0">
        <p className="font-semibold text-text">The extension was reloaded — reload this tab</p>
        <p className="text-xs text-text2 mt-0.5">
          This tab lost its link to the HireDrop extension, so Start won&apos;t reach it. One reload reconnects.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 px-3.5 py-2 rounded-lg text-xs font-medium bg-accent text-white
          hover:bg-accent-hover transition"
      >
        Reload this tab
      </button>
    </div>
  );
}
