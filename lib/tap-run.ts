"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Starting a Tap run, in ONE place.
 *
 * Two surfaces kick the background executor now — the deck (first Approve, and the
 * "Apply approved" button) and the progress dock on the rest of the dashboard. Both
 * must do the identical three things, in this order:
 *
 *   1. persist submit_mode = "tap" — the extension reads it off /campaign/status to
 *      decide whether to build the APPROVED-swipe queue or an auto platform walk.
 *      Skipping it left submit_mode on "auto" and a swipe kicked an Indeed auto-walk
 *      over cards nobody swiped (live 2026-07-30);
 *   2. reviewMode OFF — the swipe IS the human decision, so approvals auto-submit
 *      (there is no second fill-and-stop review in the tapalka);
 *   3. START_CAMPAIGN over the ping.js bridge — the extension's own guards (mode
 *      unknown, nothing approved, free limit) do the refusing.
 *
 * submit_mode already lives in three places (profile / extension reviewMode /
 * campaign-view chip). A second copy of this sequence would be the fourth.
 */

export type TapRunFilters = {
  keywords: string[];
  platforms: string[];
  location: string;
  job_type: string;
};

/** Read the search filters the run should use from the user's profile. */
export async function loadTapFilters(): Promise<TapRunFilters> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { keywords: [], platforms: [], location: "", job_type: "" };
  const { data } = await supabase
    .from("profiles")
    .select("keywords, platforms, location, job_type")
    .eq("user_id", user.id)
    .single();
  return {
    keywords: data?.keywords || [],
    platforms: data?.platforms || [],
    location: data?.location || "",
    job_type: data?.job_type || "",
  };
}

/**
 * Persist Tap mode, then ask the extension to start. Returns the filters it sent so
 * the caller can log/report them. Never throws on the profile write — the extension
 * has its own swipe-first guard, so a failed write costs a mode chip, not a run.
 */
export async function startTapRun(): Promise<TapRunFilters> {
  const filters = await loadTapFilters();
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ submit_mode: "tap" }).eq("user_id", user.id);
  } catch { /* non-fatal — see the doc comment above */ }
  window.postMessage({ type: "HIREDROP_SET_REVIEW", on: false }, "*");
  window.postMessage({ type: "HIREDROP_START_CAMPAIGN", filters }, "*");
  return filters;
}

// ---------------------------------------------------------------------------
// Session baseline — what makes "3 of 7" a true sentence
//
// The backend can say how many approved swipes are still undone (waiting) and how many
// applications went out today, but not "how many of THIS batch are done": today's count
// includes everything that was sent before the user opened the deck. So the deck stamps
// today's count the moment the first swipe of a sitting lands, and the dock measures
// progress against that stamp. Nothing is inferred — done is a difference between two
// numbers the server gave us.
//
// sessionStorage, not localStorage: the batch is one sitting in one tab. It survives the
// tap → dashboard navigation (same tab) and dies with the tab, which is exactly the life
// of the thing it describes. A stamp older than the window below is a leftover from a
// sitting the user walked away from — dropped, so the dock re-baselines instead of
// claiming credit for applications from hours ago.

const BASE_KEY = "hd_tap_base";
const BASE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type Baseline = { today: number; at: number };

/** Stamp the start of a swipe sitting. First stamp wins — later swipes join the batch. */
export function markTapSessionStart(todayApplications: number) {
  try {
    if (readTapBaseline() !== null) return;
    const b: Baseline = { today: todayApplications, at: Date.now() };
    sessionStorage.setItem(BASE_KEY, JSON.stringify(b));
  } catch { /* private mode — the dock falls back to baselining itself */ }
}

/** The stamp, or null when there is none / it is stale. */
export function readTapBaseline(): Baseline | null {
  try {
    const raw = sessionStorage.getItem(BASE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as Baseline;
    if (typeof b?.today !== "number" || typeof b?.at !== "number") return null;
    if (Date.now() - b.at > BASE_MAX_AGE_MS) {
      sessionStorage.removeItem(BASE_KEY);
      return null;
    }
    return b;
  } catch {
    return null;
  }
}

/** Forget the sitting (the batch is done and acknowledged). */
export function clearTapBaseline() {
  try { sessionStorage.removeItem(BASE_KEY); } catch { /* noop */ }
}
