// First-touch marketing attribution (UTM + referral code).
//
// Capture: <AttributionCapture /> in the root layout stores the first seen
// utm/ref params in localStorage AND a cookie (cookie so the server-side
// /auth/callback route can read it on OAuth signups, where no client code
// runs between Google and the session exchange).
//
// Persist: profiles.attribution (jsonb) is written once per user — first
// touch wins, later logins never overwrite it. Write sites:
//   1. SignupForm — rides in auth signUp metadata + direct write when the
//      session is immediate (email confirmation off).
//   2. /auth/callback — covers email-confirm and Google OAuth paths.

export const ATTRIBUTION_COOKIE = "hd_attribution";
const STORAGE_KEY = "hd_attribution";
const COOKIE_MAX_AGE_SEC = 60 * 24 * 60 * 60; // 60 days — job search is a months-long cycle

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  /** Partner referral code — hiredrop.io/?ref=luca */
  ref?: string;
  landing_page?: string;
  captured_at?: string;
}

const PARAM_KEYS: (keyof Attribution)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "ref",
];

/** Read utm/ref params from the current URL; store first-touch. Client-only. */
export function captureAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    if (getStoredAttribution()) return; // first touch wins

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    let hasAny = false;
    for (const key of PARAM_KEYS) {
      const value = params.get(key);
      if (value) {
        attribution[key] = value.slice(0, 200);
        hasAny = true;
      }
    }
    if (!hasAny) return;

    attribution.landing_page = window.location.pathname.slice(0, 200);
    attribution.captured_at = new Date().toISOString();

    const json = JSON.stringify(attribution);
    localStorage.setItem(STORAGE_KEY, json);
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(json)}; max-age=${COOKIE_MAX_AGE_SEC}; path=/; SameSite=Lax`;
  } catch {
    // storage blocked (private mode etc.) — attribution is best-effort
  }
}

/** Stored first-touch attribution, if any. Client-only. */
export function getStoredAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))
        ?.slice(ATTRIBUTION_COOKIE.length + 1);
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    return typeof parsed === "object" && parsed !== null ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}

/** Parse the attribution cookie value on the server (route handlers). */
export function parseAttributionCookie(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return typeof parsed === "object" && parsed !== null ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}
