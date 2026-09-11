"use client";

import { useEffect, useState } from "react";

import { detectBrowser } from "@/components/dashboard/StartReadiness";

/**
 * Dead-bridge detector for the dashboard.
 *
 * The problem it solves: reloading (or OFF/ON-ing) the extension orphans the ping.js
 * content script in every ALREADY-OPEN dashboard tab. The script keeps running — it
 * still answers HIREDROP_PING with HIREDROP_PONG, because that branch never touches
 * `chrome.*` — but every call that DOES cross into the extension now fails. So the
 * presence check (#120) still reads "extension installed" while Start silently never
 * arrives. That false positive is the bug: the user sees nothing, and presses Start
 * into the void.
 *
 * The pulse we listen to already exists: QuickActions asks
 * HIREDROP_GET_PLATFORM_CONNECTIONS every 10s, TapView asks HIREDROP_GET_LIVE_STATE
 * every 1.5s. We add our own 10s ask so the signal doesn't depend on which page is
 * mounted, and read BOTH reply types. No new extension code, no new message type.
 *
 * Two independent death signals, because an orphaned script can fail either way:
 *   1. EXPLICIT — ping.js wraps both handlers in try/catch and posts back
 *      `error: "context_invalidated"` when `chrome.storage.local.get` throws
 *      synchronously. Unambiguous, and it arrives on the very next heartbeat (~10s).
 *   2. SILENCE — when the context dies without a synchronous throw, the storage
 *      callback is simply never invoked and nothing comes back at all. Caught by
 *      MISS_LIMIT consecutive unanswered asks (~25-30s).
 *
 * The #127 rule guards signal 2: silence is only evidence of DEATH if this tab has
 * heard a reply at least once. Otherwise silence just means "no bridge here, and
 * that's legitimate" — a phone, Safari, or Chrome without the extension installed —
 * which is the install gate's job (#120), not this banner's. That same latch doubles
 * as the grace period on first load: the banner cannot appear until the bridge has
 * proven itself alive once, so a slow-injecting content script never flashes it.
 *
 * Signal 1 needs no such latch: a reply saying "context_invalidated" is itself proof
 * that a content script exists in this tab, so it sets the latch on arrival.
 */

export type BridgeHealth = "unknown" | "alive" | "dead";

const HEARTBEAT_MS = 10_000;
// 3 unanswered asks ≈ 25-30s from death to banner — inside the acceptance window, and
// far enough above a single dropped round trip to not fire on a hiccup.
const MISS_LIMIT = 3;

export function useExtensionBridge(): BridgeHealth {
  const [health, setHealth] = useState<BridgeHealth>("unknown");

  useEffect(() => {
    // Only a desktop Chromium browser can host the MV3 extension. Elsewhere there is no
    // bridge to be dead, so we never even open the question (the ever-replied latch below
    // would catch it too — this is the cheap first gate).
    if (detectBrowser() !== "chromium") return;

    let stopped = false;
    let everReplied = false; // #127 latch: has a bridge EVER answered in this tab?
    let misses = 0;

    const markAlive = () => {
      everReplied = true;
      misses = 0;
      if (!stopped) setHealth("alive");
    };

    const markDead = () => {
      if (!everReplied || stopped) return;
      setHealth("dead");
    };

    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      const d = e.data as { type?: string; ok?: boolean; error?: string };
      // Both heartbeats carry the same verdict shape; either one proves liveness.
      if (d.type !== "HIREDROP_PLATFORM_CONNECTIONS" && d.type !== "HIREDROP_LIVE_STATE") return;
      if (d.error === "context_invalidated") {
        everReplied = true; // an answering script IS present — signal 1 is self-proving
        markDead();
        return;
      }
      if (d.ok) markAlive();
    }

    const send = () => window.postMessage({ type: "HIREDROP_GET_PLATFORM_CONNECTIONS" }, "*");

    function tick() {
      // A hidden tab has its timers throttled to ~60s, so an unanswered ask there says
      // nothing about the bridge. Don't count misses we can't interpret.
      if (document.hidden) return;
      if (everReplied) {
        misses += 1;
        if (misses >= MISS_LIMIT) markDead();
      }
      send();
    }

    window.addEventListener("message", onMsg);
    send(); // bootstrap ask — uncounted, it only needs to set the latch

    // On regaining focus we cannot tell throttling from death, so forgive the backlog
    // and re-ask from a clean slate.
    const onVisible = () => {
      if (document.hidden) return;
      misses = 0;
      send();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(tick, HEARTBEAT_MS);

    return () => {
      stopped = true;
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  return health;
}
