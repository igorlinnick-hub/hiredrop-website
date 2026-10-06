// Daily auto-start ("Apply every day automatically") — the dashboard's half.
//
// The setting lives in the EXTENSION (chrome.storage.local), not on the server: the schedule
// belongs to the machine where Chrome runs. The dashboard reads and writes it through the
// ping.js bridge — HIREDROP_GET_AUTO_DAILY / HIREDROP_SET_AUTO_DAILY {enabled, hour}, both
// answered with HIREDROP_AUTO_DAILY carrying the state the extension now holds (jobflow
// chrome-extension/auto-daily.js hdAutoDailyView). Everything shown is read back from there,
// never assumed from what we just sent.
//
// Pure helpers only (tested by tests/auto-daily.test.ts); the component is
// components/dashboard/AutoDailyRow.tsx.

export type AutoDailyNextRun = {
  earliest: number; // ms epoch
  latest: number; // == earliest when exact
  exact: boolean;
  day: "today" | "tomorrow";
};

export type AutoDailyToday = {
  day: string;
  // "starting" = the extension claimed today's start and hasn't heard back yet (ext #376);
  // "started" is only ever reported after the start actually succeeded.
  status: "pending" | "starting" | "started" | "skipped" | "refused" | "failed" | "missed";
  reason: string | null;
  message: string;
  at: number | null;
};

export type AutoDailyState = {
  enabled: boolean;
  hour: number;
  maxHour: number;
  nextRun: AutoDailyNextRun | null;
  today: AutoDailyToday | null;
  lastLaunch: { at: string | null; platforms: string[]; keywords: number } | null;
};

/** Parse a HIREDROP_AUTO_DAILY reply; null if it isn't one we can trust. */
export function parseAutoDailyReply(data: unknown): AutoDailyState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.type !== "HIREDROP_AUTO_DAILY" || d.ok !== true) return null;
  if (typeof d.enabled !== "boolean" || typeof d.hour !== "number") return null;
  return {
    enabled: d.enabled,
    hour: d.hour,
    maxHour: typeof d.maxHour === "number" ? d.maxHour : 20,
    nextRun: (d.nextRun as AutoDailyNextRun) ?? null,
    today: (d.today as AutoDailyToday) ?? null,
    lastLaunch: (d.lastLaunch as AutoDailyState["lastLaunch"]) ?? null,
  };
}

/** 9 → "9 AM", 0 → "12 AM", 13 → "1 PM". */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** 9:23 → "9:23 AM" in the viewer's zone (= the zone the extension runs in, same machine). */
export function clockLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** "Next run: today at 9:23 AM" / "Next run: tomorrow, 9:00–9:40 AM". */
export function nextRunLabel(next: AutoDailyNextRun | null, now: number = Date.now()): string | null {
  if (!next) return null;
  if (next.exact) {
    if (next.earliest <= now + 60_000 && next.day === "today") return "Next run: starting now";
    return `Next run: ${next.day} at ${clockLabel(next.earliest)}`;
  }
  const a = clockLabel(next.earliest).replace(/ (AM|PM)$/, "");
  return `Next run: ${next.day}, ${a}–${clockLabel(next.latest)}`;
}

/** Where on the site each refusal is fixed (reasons from /campaign/start and the extension's
 *  own start gates). Unknown reason → no link rather than a guess. */
const FIX_PATH: Record<string, string> = {
  onboarding_incomplete: "/onboarding",
  employer_answers_missing: "/dashboard/settings?tab=forms",
  us_only: "/dashboard/settings",
  disposable_email: "/dashboard/settings",
  free_limit_reached: "/dashboard/settings?tab=billing",
  no_approved_jobs: "/dashboard/tap",
  not_connected: "/dashboard/platforms",
  lever_needs_tap: "/dashboard",
  no_keywords: "/dashboard",
};

export function fixPathFor(reason: string | null): string | null {
  return (reason && FIX_PATH[reason]) || null;
}

/** "… — open HireDrop to fix it." is the extension's notification copy; on the site we ARE
 *  HireDrop, so drop that tail and end the sentence. */
function sentence(text: string): string {
  const t = text.replace(/\s*[—-]\s*open HireDrop to (fix|start)( it)?\.?$/i, "").trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

export type TodayLine = { text: string; href: string | null };

/** One line about today (plus where to fix it), or null when there's nothing worth saying. */
export function todayLabel(today: AutoDailyToday | null): TodayLine | null {
  if (!today || today.status === "pending") return null;
  if (today.status === "starting") return { text: "Today: starting your run now…", href: null };
  if (today.status === "started") {
    return { text: today.at ? `Today: started at ${clockLabel(today.at)}.` : "Today: started.", href: null };
  }
  // "set after time" is the toggle's own doing — the next-run line already says tomorrow.
  // "no last launch" is said once by the row's own "press Start once" line.
  if (today.reason === "set_after_time" || today.reason === "no_last_launch") return null;
  if (!today.message) return null;
  // Skips carry their own sentence ("Skipped today — …"); refusals carry the reason only.
  if (today.status === "refused" || today.status === "failed") {
    return { text: `Didn't start today: ${sentence(today.message)}`, href: fixPathFor(today.reason) };
  }
  return { text: sentence(today.message), href: null };
}
