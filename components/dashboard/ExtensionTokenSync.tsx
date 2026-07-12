"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Chrome extension's stored Supabase access token fresh.
 *
 * Background: the extension only ever received a token on /extension/connect.
 * Supabase access tokens expire ~hourly. The website's supabase-js auto-refreshes
 * its session, but the extension holds an INDEPENDENT copy and its own refresh can
 * fail once the website rotates the shared refresh token — leaving the extension
 * unable to reach the backend (no live-preview screenshots, no activity/status)
 * while it keeps applying locally. The only recovery was a manual re-connect.
 *
 * Fix: while any dashboard page is open (the user watches the live campaign here),
 * push the CURRENT access token to the extension on mount, on a short interval, and
 * whenever the tab regains focus. ping.js relays HIREDROP_STORE_TOKEN → the service
 * worker stores it. The token therefore stays fresh passively.
 *
 * We deliberately push ONLY the access token (never the refresh token) so the
 * website remains the SOLE owner of the refresh token. If both sides used the
 * refresh token they'd rotate it out from under each other (the original desync).
 * The extension becomes a passive consumer of fresh access tokens.
 *
 * Renders nothing.
 */
export default function ExtensionTokenSync() {
  useEffect(() => {
    const supabase = createClient();
    let stopped = false;
    let lastPush = 0;

    async function pushToken(force = false) {
      // `force` (used on mount) bypasses the document.hidden guard so there is ALWAYS at
      // least one bootstrap push even if the dashboard loads in a background tab — that
      // push is what lets the extension mint its durable key (ROADMAP_E2E.md P2). After
      // the key exists, staleness is moot; the extension stops needing this push.
      if (stopped || (!force && document.hidden)) return;
      // Debounce: focus + visibilitychange often both fire on a single tab-focus, and the
      // interval can coincide — collapse bursts so we don't push (and ping) twice at once.
      const now = Date.now();
      if (!force && now - lastPush < 3000) return;
      lastPush = now;
      try {
        let { data: { session } } = await supabase.auth.getSession();
        // getSession() returns the CACHED session — it can be expired if the tab sat in
        // the background (autoRefresh throttles when hidden). Force a refresh when the
        // access token is missing or expiring soon so we never push a stale token (the
        // root cause of the SW's 401 storm).
        const expMs = session?.expires_at ? session.expires_at * 1000 : 0;
        if (!session?.access_token || (expMs && expMs - Date.now() < 120_000)) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed?.session) session = refreshed.session;
        }
        const token = session?.access_token;
        if (token) {
          // No refresh_token on purpose — see component doc.
          window.postMessage({ type: "HIREDROP_STORE_TOKEN", token }, "*");
        }
      } catch {
        /* no session / extension absent — nothing to do */
      }
    }

    // Push immediately (forced) so landing on the dashboard bootstraps the durable key
    // even if the tab isn't focused yet.
    pushToken(true);

    // Re-push every 60s. The extension no longer wipes its token on a transient 401
    // (it waits for us), so a frequent push keeps the live preview and backend tracking
    // continuous with at most a ~60s stale window. 60s is also Chrome's effective floor
    // for background-tab setInterval, so this still fires when the tab isn't focused.
    const interval = setInterval(pushToken, 60 * 1000);

    // Also push when the tab regains focus (covers wake-from-sleep / tab switching).
    const onVisible = () => { if (!document.hidden) pushToken(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
