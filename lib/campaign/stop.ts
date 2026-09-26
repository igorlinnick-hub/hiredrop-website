/**
 * Stop, in the one order that actually stops a run.
 *
 * A campaign has TWO recipients and they are not equal. The extension is what opens
 * tabs and submits forms; the backend only holds a flag. So a Stop that reaches the
 * backend but not the extension is not a stop at all — the engine keeps applying.
 *
 * Every Stop button on the dashboard had the recipients in the wrong order, inside one
 * try: `await apiPost("/campaign/stop")` first, `postMessage` second. Any backend
 * failure — expired token, offline, 500 — threw before the postMessage and left the
 * engine running. Measured, not theorised: on 09-24 the driver pressed Stop at 20:57
 * and applications kept landing until 22:00. `background.js` never wrote its
 * "⏹ Campaign stopped" line, and the backend never learned either, so nothing on
 * either side could halt the run.
 *
 * The fix is the order, plus one try per recipient:
 *
 *   1. Halt the extension. `window.postMessage` is synchronous and local — no token, no
 *      network, nothing to fail on. ping.js relays it to the service worker, which
 *      clears `chrome.storage.local.campaignRunning`, and content.js aborts the form
 *      it is filling.
 *   2. Tell the backend. Its own try, and its failure is reported, never fatal.
 *
 * Why that order is also self-healing: the extension's next `/extension/ping` (every
 * minute) reports `campaign_running: false`, and `campaign.py` clears the stale flag
 * itself (`reconcile_not_running`). So step 2 failing costs at most a minute of a
 * dashboard that still says "running" — while step 1 failing costs an hour of unwanted
 * applications. The reverse also holds: if the postMessage is ever dropped by an
 * orphaned content script, the backend's `should_run: false` stops the extension
 * (background.js). Belt and braces — but the braces have to go on first.
 */

export type StopOutcome = {
  /** Did the backend acknowledge the stop? `false` means it catches up on the next ping. */
  serverConfirmed: boolean;
  /** Why the backend did not acknowledge, for the surface to show. */
  error: string | null;
};

export async function stopCampaignEverywhere(
  haltExtension: () => void,
  tellServer: () => Promise<unknown>,
): Promise<StopOutcome> {
  // Guarded, but NOT skippable: if posting into a dead bridge ever throws, the backend
  // call below still has to happen — that is the path where `should_run: false` becomes
  // the only thing able to stop the engine.
  try {
    haltExtension();
  } catch {
    /* a dead bridge must not swallow the server call */
  }

  try {
    await tellServer();
    return { serverConfirmed: true, error: null };
  } catch (e) {
    return { serverConfirmed: false, error: e instanceof Error ? e.message : String(e) };
  }
}
