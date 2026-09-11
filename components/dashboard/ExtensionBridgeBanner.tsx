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
 * The fix is offered where the failure is, not as an exit: one button, one reload, the
 * bridge is back. Deliberately NOT auto-reloading here — the dashboard may be mid-run
 * with an open campaign view, and yanking the page out from under the user is worse
 * than telling them. (TapView keeps its own one-shot auto-heal on the faster
 * LIVE_STATE pulse; when its sessionStorage guard has already spent that one reload,
 * this banner is what the user sees instead of a silent dead page.)
 */
export default function ExtensionBridgeBanner() {
  const health = useExtensionBridge();
  if (health !== "dead") return null;

  return (
    <div role="status" aria-live="polite" className="hd-bridge-alert mb-5 flex items-center gap-3 rounded-2xl px-4 py-3">
      <style>{`
        /* Both themes are first-class (Igor's rule): every colour is a var on the
           component root, and .dark flips the world — same structure as .hd-card-glass. */
        .hd-bridge-alert{
          --hdb-bg:rgba(245,158,11,.10); --hdb-bd:rgba(245,158,11,.34);
          --hdb-icon:#B45309; --hdb-title:#7C4A03; --hdb-sub:rgba(124,74,3,.72);
          --hdb-btn-bg:#D97706; --hdb-btn-tx:#ffffff; --hdb-btn-bg-h:#B45309;
          --hdb-shadow:0 2px 10px rgba(180,83,9,.10);
          background:var(--hdb-bg); border:1px solid var(--hdb-bd); box-shadow:var(--hdb-shadow);
        }
        .dark .hd-bridge-alert{
          --hdb-bg:rgba(245,158,11,.12); --hdb-bd:rgba(245,158,11,.32);
          --hdb-icon:#FBBF24; --hdb-title:#FCD34D; --hdb-sub:rgba(253,230,138,.75);
          --hdb-btn-bg:#F59E0B; --hdb-btn-tx:#1F1405; --hdb-btn-bg-h:#FBBF24;
          --hdb-shadow:0 2px 14px rgba(0,0,0,.35);
        }
      `}</style>

      <svg className="w-5 h-5 shrink-0" style={{ color: "var(--hdb-icon)" }} fill="none"
        stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug" style={{ color: "var(--hdb-title)" }}>
          The extension was reloaded — reload this tab
        </p>
        <p className="text-xs leading-snug mt-0.5" style={{ color: "var(--hdb-sub)" }}>
          This tab lost its link to the HireDrop extension, so Start won&apos;t reach it. One reload reconnects.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="hd-bridge-btn shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition"
        style={{ background: "var(--hdb-btn-bg)", color: "var(--hdb-btn-tx)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hdb-btn-bg-h)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--hdb-btn-bg)"; }}
      >
        Reload this tab
      </button>
    </div>
  );
}
