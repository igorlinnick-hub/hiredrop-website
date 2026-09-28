// Ad pixels (Meta Pixel + Google Ads tag) and the identity keys the backend
// needs to report conversions server-side.
//
// INERT UNTIL CONFIGURED. Nothing here loads, fires or sets a cookie unless
// NEXT_PUBLIC_META_PIXEL_ID or NEXT_PUBLIC_GOOGLE_ADS_ID is set at build time.
//
// Where pixels run (components/AdPixels.tsx):
//   - public pages only — an allowlist, so a route added later is untracked
//     until someone decides otherwise (the product area holds resumes);
//   - never for a visitor who opted out (hd_ads_optout=1) or whose browser
//     sends Global Privacy Control;
//   - one exception to "public only": right after a brand-new account is
//     confirmed, /auth/callback drops hd_new_signup=<user id> and the next
//     page — usually /onboarding — loads the pixels just to send the one
//     sign-up conversion, then forgets the cookie.
//
// CONTRACTS WITH THE BACKEND (jobflow/, Meta Conversions API):
//   - event id of the sign-up conversion = `reg_<user_id>` (Meta eventID and
//     Google transaction_id). The server dedups its own events against it.
//   - profiles.attribution identity keys: fbp, fbc, ua, ads_optout — built by
//     mergeSignupAttribution() below.
//
// The tags' base code (and the only mention of their URLs) is in
// lib/adPixelCode.ts, imported solely by the lazily loaded
// components/AdPixelRuntime.tsx — so with nothing configured, no page even
// downloads the JavaScript that knows where the tags live.
//
// No imports on purpose: `node --test` loads this file directly.

// ─── configuration ─────────────────────────────────────────────────────────

/** Trim, then accept only the expected shape — the ids are interpolated into
 *  inline script, and a pasted-in newline or quote must not break (or inject
 *  into) every page. A malformed value behaves exactly like an unset one. */
function envValue(value: string | undefined, shape: RegExp): string {
  const v = (value ?? "").trim();
  return shape.test(v) ? v : "";
}

// Each variable is referenced literally so Next inlines it at build time.
export const META_PIXEL_ID = envValue(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{5,20}$/);
export const GOOGLE_ADS_ID = envValue(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, /^AW-\d{5,15}$/);
export const GOOGLE_ADS_SIGNUP_LABEL = envValue(
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  /^[A-Za-z0-9_-]{1,100}$/,
);

/** True when at least one ad platform is configured. False = site behaves as
 *  if this file did not exist. */
export const ADS_CONFIGURED = Boolean(META_PIXEL_ID || GOOGLE_ADS_ID);

// ─── cookies & storage keys ────────────────────────────────────────────────

/** "1" = this browser opted out of ad measurement (/privacy/choices). */
export const ADS_OPTOUT_COOKIE = "hd_ads_optout";
export const ADS_OPTOUT_MAX_AGE_SEC = 365 * 24 * 60 * 60;
/** <user id> of an account confirmed moments ago; read once by AdPixels. */
export const NEW_SIGNUP_COOKIE = "hd_new_signup";
export const NEW_SIGNUP_MAX_AGE_SEC = 15 * 60;
/** localStorage guard: `hd_reg_fired_<uid>` — the conversion never fires twice. */
export const REG_FIRED_KEY_PREFIX = "hd_reg_fired_";
/** Meta's own first-party cookies (set by the pixel on our domain). */
export const META_BROWSER_ID_COOKIE = "_fbp";
export const META_CLICK_ID_COOKIE = "_fbc";

/** Dispatched on window when the opt-out cookie changes in this tab. */
export const ADS_OPTOUT_EVENT = "hd:ads-optout-change";

/** One cookie's value out of a `document.cookie` / Cookie header string. */
export function readCookie(cookieString: string | null | undefined, name: string): string | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

// ─── opt-out ───────────────────────────────────────────────────────────────

/**
 * Opted out = the hd_ads_optout cookie is "1", or the browser sends Global
 * Privacy Control. `gpc` is `navigator.globalPrivacyControl` in the browser
 * and the `Sec-GPC` request header ("1") on the server.
 */
export function isAdsOptedOut(signals: {
  optoutCookie?: string | null;
  gpc?: boolean | string | null;
}): boolean {
  return signals.optoutCookie === "1" || signals.gpc === true || signals.gpc === "1";
}

/** Opt-out state of THIS browser. Fails closed: if we cannot tell, we treat
 *  the visitor as opted out and load nothing. */
export function browserAdsOptedOut(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean };
    return isAdsOptedOut({
      optoutCookie: readCookie(window.document.cookie, ADS_OPTOUT_COOKIE),
      gpc: nav.globalPrivacyControl === true,
    });
  } catch {
    return true;
  }
}

// ─── where pixels may run ──────────────────────────────────────────────────

/**
 * Public pages that may carry pixels. An ALLOWLIST: /dashboard/**,
 * /onboarding/**, /auth/**, /preview/**, /extension/** (signed-in, inside the
 * dashboard shell) and /privacy/** + /terms (no ad value; the policy pages
 * stay tracker-free) are out simply by not being here, and so is any page
 * added later until someone lists it — and describes it in the privacy
 * policy, section 6, which names these pages.
 */
const PUBLIC_EXACT = new Set(["/", "/login", "/signup", "/faq"]);
const PUBLIC_PREFIXES = ["/affiliate", "/alternatives", "/guides"];

export function isPublicAdRoute(pathname: string | null | undefined): boolean {
  if (!pathname || !pathname.startsWith("/")) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Query/fragment keys that make a page untrackable even when its path is
 * public: the pixels report the full URL, and these carry personal data or
 * credentials (/signup?affiliate=<code>&email=<them> is a real link we send;
 * Supabase error/implicit redirects put tokens in the fragment). An affiliate
 * arrival is also a partner, not a customer — not an audience to build.
 */
const UNTRACKABLE_KEYS = [
  "email",
  "affiliate",
  "token",
  "token_hash",
  "code",
  "access_token",
  "refresh_token",
];

export function hasUntrackableParams(search: string, hash = ""): boolean {
  try {
    const query = new URLSearchParams(search);
    const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    return UNTRACKABLE_KEYS.some((key) => query.has(key) || fragment.has(key));
  } catch {
    return true;
  }
}

/** May this page view be reported to the ad platforms? */
export function isTrackablePage(pathname: string | null | undefined, search = "", hash = ""): boolean {
  return isPublicAdRoute(pathname) && !hasUntrackableParams(search, hash);
}

// ─── the sign-up conversion ────────────────────────────────────────────────

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Event id shared with the backend: Meta eventID / Google transaction_id. */
export function registrationEventId(userId: string): string {
  return `reg_${userId}`;
}

/**
 * Should /auth/callback mark this user as a brand-new signup?
 *
 * New = the account was created within the last hour. Affiliates are
 * excluded whichever way they are recognised (approved row, signup intent in
 * metadata, or an OAuth round trip headed for /dashboard/affiliate): they are
 * partners, and a partner counted as a customer teaches the ad algorithm to
 * find more partners. A password-recovery link is never a signup.
 */
export function isNewSignupConversion(s: {
  createdAt: string | null | undefined;
  nowMs: number;
  isAffiliate: boolean;
  affiliateIntent: boolean;
  next?: string | null;
  otpType?: string | null;
}): boolean {
  if (s.isAffiliate || s.affiliateIntent) return false;
  if (s.next && s.next.startsWith("/dashboard/affiliate")) return false;
  if (s.otpType === "recovery") return false;
  if (!s.createdAt) return false;
  const created = Date.parse(s.createdAt);
  if (Number.isNaN(created)) return false;
  const age = s.nowMs - created;
  // A few minutes of negative age tolerates clock skew between us and Supabase.
  return age > -5 * 60 * 1000 && age <= 60 * 60 * 1000;
}

type GuardStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Claim the one-and-only sign-up conversion for `userId` in this browser.
 * True = fire it now; the guard is written BEFORE firing, so a throw halfway
 * can never cause a second one. Storage that throws (private mode) still
 * allows the single fire — the caller deletes hd_new_signup first, which is
 * the second guard — and the server dedups on reg_<id> regardless.
 */
export function claimSignupConversion(userId: string | null | undefined, storage: GuardStorage | null): boolean {
  if (!userId || !UUID_SHAPE.test(userId)) return false;
  const key = `${REG_FIRED_KEY_PREFIX}${userId}`;
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, new Date().toISOString());
  } catch {
    // storage blocked — see above
  }
  return true;
}

/** Has this browser already reported `userId`'s sign-up? Read-only twin of
 *  claimSignupConversion: lets a product page skip loading pixels for a
 *  conversion that would not fire anyway. */
export function signupConversionFired(userId: string, storage: GuardStorage | null): boolean {
  try {
    return Boolean(storage?.getItem(`${REG_FIRED_KEY_PREFIX}${userId}`));
  } catch {
    return false;
  }
}

// ─── identity keys for server-side conversions (profiles.attribution) ─────

/** utm_source values that mean "came from a Meta ad". */
const META_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "meta"]);

export function isMetaAttributed(attribution: Record<string, unknown>): boolean {
  const source =
    typeof attribution.utm_source === "string" ? attribution.utm_source.trim().toLowerCase() : "";
  return Boolean(attribution.fbc || attribution.fbclid || META_SOURCES.has(source));
}

/** A Meta cookie value, or nothing. Shape: fb.<n>.<timestamp>.<id>. */
function metaCookieValue(value: string | null | undefined): string | undefined {
  const v = (value ?? "").trim();
  return /^fb\.\d+\.\d+\.\S+$/.test(v) && v.length <= 500 ? v : undefined;
}

export interface IdentitySignals {
  /** `_fbp` cookie */
  fbp?: string | null;
  /** `_fbc` cookie */
  fbc?: string | null;
  userAgent?: string | null;
  optedOut: boolean;
}

/**
 * The attribution object written to profiles.attribution at signup: the
 * first-touch record plus the identity keys the backend needs to report
 * conversions to Meta (CONTRACT — the backend reads exactly these names):
 *
 *   fbp        — `_fbp` cookie (Meta browser id)
 *   fbc        — `_fbc` cookie (Meta click id)
 *   ua         — user agent, ≤300 chars, ONLY for a Meta-attributed user
 *   ads_optout — true when the person opted out (cookie or GPC)
 *
 * Values already in `base` win: base is what the signup browser recorded,
 * and a click id and user agent only mean something as a pair from the same
 * browser. An opt-out wins over everything and removes the identity keys —
 * whichever side saw it, it is the latest word.
 */
export function mergeSignupAttribution(
  base: Record<string, unknown> | null | undefined,
  signals: IdentitySignals,
): Record<string, unknown> {
  const out: Record<string, unknown> =
    base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};

  if (signals.optedOut || out.ads_optout === true) {
    delete out.fbp;
    delete out.fbc;
    delete out.ua;
    out.ads_optout = true;
    return out;
  }

  const fbp = metaCookieValue(signals.fbp);
  const fbc = metaCookieValue(signals.fbc);
  if (!out.fbp && fbp) out.fbp = fbp;
  if (!out.fbc && fbc) out.fbc = fbc;
  const ua = (signals.userAgent ?? "").trim();
  if (!out.ua && ua && isMetaAttributed(out)) out.ua = ua.slice(0, 300);
  return out;
}

// ─── browser side ──────────────────────────────────────────────────────────

type Tag = (...args: unknown[]) => void;
type AdWindow = Window & { fbq?: Tag & { disablePushState?: boolean }; gtag?: Tag };

function adWindow(): AdWindow | null {
  return typeof window === "undefined" ? null : (window as AdWindow);
}

function cookieSuffix(w: Window): string {
  return w.location.protocol === "https:" ? "; Secure" : "";
}

function expireCookie(w: Window, name: string): void {
  w.document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax${cookieSuffix(w)}`;
}

/** hd_new_signup user id waiting to be reported, if any. */
export function pendingSignupUserId(): string | null {
  const w = adWindow();
  if (!w) return null;
  try {
    return readCookie(w.document.cookie, NEW_SIGNUP_COOKIE);
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  const w = adWindow();
  if (!w) return;
  try {
    expireCookie(w, NEW_SIGNUP_COOKIE);
  } catch {
    // nothing to do
  }
}

/** Client-side twin of the /auth/callback mark, for the signup path that
 *  gets a session immediately and never visits the callback. */
export function markNewSignup(userId: string): void {
  const w = adWindow();
  if (!w || !ADS_CONFIGURED || browserAdsOptedOut()) return;
  try {
    w.document.cookie =
      `${NEW_SIGNUP_COOKIE}=${encodeURIComponent(userId)}; max-age=${NEW_SIGNUP_MAX_AGE_SEC}; ` +
      `path=/; SameSite=Lax${cookieSuffix(w)}`;
  } catch {
    // best-effort
  }
}

/** localStorage, or null where touching it throws. */
export function guardStorage(): GuardStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Fire a Meta standard event (e.g. "InitiateCheckout"). No-op — returns
 * false — unless the pixel is ALREADY loaded on this page and the visitor has
 * not opted out. It never loads anything by itself, so calling it from the
 * dashboard is safe: there the pixel is normally absent and nothing happens.
 */
export function trackAd(name: string, params?: Record<string, unknown>, eventId?: string): boolean {
  const w = adWindow();
  if (!w || typeof w.fbq !== "function" || browserAdsOptedOut()) return false;
  try {
    if (eventId) w.fbq("track", name, params ?? {}, { eventID: eventId });
    else w.fbq("track", name, params ?? {});
    return true;
  } catch {
    return false;
  }
}

/** PageView to Meta + page_view to Google Ads for the current URL. */
export function firePageView(): void {
  const w = adWindow();
  if (!w || browserAdsOptedOut()) return;
  try {
    if (typeof w.fbq === "function") w.fbq("track", "PageView");
  } catch {
    // ignore
  }
  try {
    if (typeof w.gtag === "function" && GOOGLE_ADS_ID) {
      w.gtag("event", "page_view", { send_to: GOOGLE_ADS_ID });
    }
  } catch {
    // ignore
  }
}

/** The sign-up conversion, to both platforms, under the shared event id. */
export function fireSignupConversion(userId: string): void {
  const w = adWindow();
  if (!w || browserAdsOptedOut()) return;
  const eventId = registrationEventId(userId);
  try {
    if (typeof w.fbq === "function") {
      w.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }
  } catch {
    // ignore
  }
  try {
    if (typeof w.gtag === "function" && GOOGLE_ADS_ID && GOOGLE_ADS_SIGNUP_LABEL) {
      w.gtag("event", "conversion", {
        send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_SIGNUP_LABEL}`,
        transaction_id: eventId,
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Opt this browser out of (or back into) ad measurement. Opting out also
 * tells tags already running in this tab to stop, drops a pending sign-up
 * conversion, and expires the platforms' own cookies on our domain.
 * Opting back in takes effect from the next page load.
 */
export function setAdsOptOut(optOut: boolean): void {
  const w = adWindow();
  if (!w) return;
  try {
    if (optOut) {
      w.document.cookie =
        `${ADS_OPTOUT_COOKIE}=1; max-age=${ADS_OPTOUT_MAX_AGE_SEC}; path=/; SameSite=Lax${cookieSuffix(w)}`;
    } else {
      expireCookie(w, ADS_OPTOUT_COOKIE);
    }
  } catch {
    // cookies blocked — nothing we can store
  }
  if (optOut) {
    try {
      w.fbq?.("consent", "revoke");
    } catch {
      // ignore
    }
    try {
      w.gtag?.("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    } catch {
      // ignore
    }
    clearPendingSignup();
    expirePlatformCookies(w);
  }
  try {
    w.dispatchEvent(new Event(ADS_OPTOUT_EVENT));
  } catch {
    // ignore
  }
}

/** _fbp/_fbc/_gcl_* live on the registrable domain (.hiredrop.io); expire
 *  them there and on the bare host. Best-effort. */
function expirePlatformCookies(w: Window): void {
  const names = ["_fbp", "_fbc", "_gcl_au", "_gcl_aw", "_gcl_gb", "_gcl_dc"];
  const labels = w.location.hostname.split(".");
  const parent = labels.length >= 2 ? `.${labels.slice(-2).join(".")}` : "";
  for (const name of names) {
    try {
      expireCookie(w, name);
      if (parent) {
        w.document.cookie = `${name}=; max-age=0; path=/; domain=${parent}; SameSite=Lax${cookieSuffix(w)}`;
      }
    } catch {
      // ignore
    }
  }
}
