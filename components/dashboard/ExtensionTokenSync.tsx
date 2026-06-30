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

    async function pushToken() {
      if (stopped || document.hidden) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          // No refresh_token on purpose — see component doc.
          window.postMessage({ type: "HIREDROP_STORE_TOKEN", token }, "*");
        }
      } catch {
        /* no session / extension absent — nothing to do */
      }
    }

    // Push immediately so landing on the campaign page refreshes the token at once.
    pushToken();

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
