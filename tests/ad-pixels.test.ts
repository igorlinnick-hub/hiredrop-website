// Ad pixels: who is opted out, which pages may carry pixels, what the backend
// receives in profiles.attribution, and the once-only sign-up conversion.
// node --test tests/ad-pixels.test.ts

import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";

import { gtagInitCode, metaBaseCode } from "../lib/adPixelCode.ts";
import {
  claimSignupConversion,
  isAdsOptedOut,
  isMetaAttributed,
  isNewSignupConversion,
  isPublicAdRoute,
  isTrackablePage,
  mergeSignupAttribution,
  readCookie,
  registrationEventId,
  signupConversionFired,
  trackAd,
} from "../lib/adPixels.ts";

const UID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const FBP = "fb.1.1727500000000.1234567890";
const FBC = "fb.1.1727500000000.IwAR0abcDEF";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";

// ─── opt-out ───────────────────────────────────────────────────────────────

test("opt-out: our cookie, GPC in the browser, or Sec-GPC on the server", () => {
  assert.equal(isAdsOptedOut({ optoutCookie: "1" }), true);
  assert.equal(isAdsOptedOut({ gpc: true }), true);
  assert.equal(isAdsOptedOut({ gpc: "1" }), true); // Sec-GPC: 1
  assert.equal(isAdsOptedOut({ optoutCookie: null, gpc: null }), false);
  assert.equal(isAdsOptedOut({ optoutCookie: "0", gpc: "0" }), false);
  assert.equal(isAdsOptedOut({}), false);
});

test("readCookie finds one cookie in a cookie string and decodes it", () => {
  const jar = `a=1; hd_ads_optout=1; _fbp=${FBP}; hd_attribution=%7B%22ref%22%3A%22luca%22%7D`;
  assert.equal(readCookie(jar, "hd_ads_optout"), "1");
  assert.equal(readCookie(jar, "_fbp"), FBP);
  assert.equal(readCookie(jar, "hd_attribution"), '{"ref":"luca"}');
  assert.equal(readCookie(jar, "missing"), null);
  assert.equal(readCookie("", "a"), null);
  // a name that merely ends like another must not match
  assert.equal(readCookie("x_hd_ads_optout=1", "hd_ads_optout"), null);
});

// ─── route gating ──────────────────────────────────────────────────────────

test("public marketing pages may carry pixels", () => {
  for (const path of [
    "/",
    "/signup",
    "/login",
    "/faq",
    "/affiliate",
    "/affiliate/apply",
    "/guides",
    "/guides/auto-apply-indeed",
    "/alternatives/lazyapply",
    "/faq/", // trailing slash
  ]) {
    assert.equal(isPublicAdRoute(path), true, path);
  }
});

test("the product area never does — including look-alike paths", () => {
  for (const path of [
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/affiliate", // not the public /affiliate
    "/onboarding",
    "/onboarding/step-2",
    "/extension", // signed-in, inside the dashboard shell
    "/extension/connect",
    "/auth/update-password",
    "/auth/confirm",
    "/preview/buddy",
    "/privacy",
    "/privacy/choices",
    "/terms",
    "/affiliates-anything", // prefix must end at a segment
    "/some-new-page", // allowlist: unknown = untracked
    "",
  ]) {
    assert.equal(isPublicAdRoute(path), false, path);
  }
  assert.equal(isPublicAdRoute(null), false);
});

test("a public page carrying an email, affiliate code or token is not tracked", () => {
  assert.equal(isTrackablePage("/signup"), true);
  assert.equal(isTrackablePage("/", "?utm_source=facebook&fbclid=abc"), true);
  assert.equal(isTrackablePage("/signup", "?affiliate=luca&email=a%40b.co"), false);
  assert.equal(isTrackablePage("/signup", "?email=a%40b.co"), false);
  assert.equal(isTrackablePage("/", "", "#access_token=x&refresh_token=y"), false);
  assert.equal(isTrackablePage("/dashboard", "?utm_source=facebook"), false);
});

// ─── identity keys (profiles.attribution contract) ─────────────────────────

test("fbp/fbc ride along when present; ua only for a Meta-attributed visitor", () => {
  const organic = mergeSignupAttribution({ utm_source: "google" }, {
    fbp: FBP,
    userAgent: UA,
    optedOut: false,
  });
  assert.deepEqual(organic, { utm_source: "google", fbp: FBP });

  for (const base of [{ utm_source: "Instagram" }, { utm_source: "fb" }, { fbclid: "IwAR0" }]) {
    const out = mergeSignupAttribution(base, { fbp: FBP, userAgent: UA, optedOut: false });
    assert.equal(out.ua, UA, JSON.stringify(base));
  }
  // an _fbc cookie alone makes them Meta-attributed
  const clickOnly = mergeSignupAttribution(null, { fbc: FBC, userAgent: UA, optedOut: false });
  assert.deepEqual(clickOnly, { fbc: FBC, ua: UA });
});

test("ua is capped at 300 characters", () => {
  const out = mergeSignupAttribution({ utm_source: "meta" }, {
    userAgent: "x".repeat(900),
    optedOut: false,
  });
  assert.equal((out.ua as string).length, 300);
});

test("nothing to say produces an empty object — the caller then writes nothing", () => {
  assert.deepEqual(mergeSignupAttribution(null, { userAgent: UA, optedOut: false }), {});
  assert.deepEqual(mergeSignupAttribution(undefined, { optedOut: false }), {});
});

test("malformed Meta cookies are ignored", () => {
  const out = mergeSignupAttribution({}, { fbp: "garbage", fbc: "fb.1.x.y", optedOut: false });
  assert.deepEqual(out, {});
});

test("the signup browser's values win over the callback request's", () => {
  const base = { utm_source: "facebook", fbp: FBP, ua: "signup-browser" };
  const out = mergeSignupAttribution(base, {
    fbp: "fb.1.1.999",
    userAgent: "phone-mail-app",
    optedOut: false,
  });
  assert.equal(out.fbp, FBP);
  assert.equal(out.ua, "signup-browser");
});

test("an opt-out wins and strips the identity keys, first-touch stays", () => {
  const base = { utm_source: "facebook", fbclid: "IwAR0", fbp: FBP, fbc: FBC, ua: UA };
  const out = mergeSignupAttribution(base, { fbp: FBP, userAgent: UA, optedOut: true });
  assert.deepEqual(out, { utm_source: "facebook", fbclid: "IwAR0", ads_optout: true });
  // opted out at signup, not at callback: still out
  const sticky = mergeSignupAttribution({ ads_optout: true }, { fbp: FBP, optedOut: false });
  assert.deepEqual(sticky, { ads_optout: true });
  // an opt-out alone is worth recording
  assert.deepEqual(mergeSignupAttribution(null, { optedOut: true }), { ads_optout: true });
});

test("isMetaAttributed reads source, click id or fbc", () => {
  assert.equal(isMetaAttributed({ utm_source: " IG " }), true);
  assert.equal(isMetaAttributed({ utm_source: "google", gclid: "x" }), false);
  assert.equal(isMetaAttributed({}), false);
});

// ─── the sign-up conversion ────────────────────────────────────────────────

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

test("the sign-up conversion is claimed once per user per browser", () => {
  const storage = memoryStorage();
  assert.equal(signupConversionFired(UID, storage), false);
  assert.equal(claimSignupConversion(UID, storage), true);
  assert.equal(signupConversionFired(UID, storage), true);
  assert.equal(claimSignupConversion(UID, storage), false);
  assert.equal(claimSignupConversion(UID, storage), false);
  // a different user on the same browser is a different sign-up
  assert.equal(claimSignupConversion("0f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b", storage), true);
});

test("blocked storage still allows the single fire; a junk id never fires", () => {
  const throwing = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("SecurityError");
    },
  };
  assert.equal(claimSignupConversion(UID, throwing), true);
  assert.equal(claimSignupConversion(UID, null), true);
  assert.equal(claimSignupConversion("not-a-uuid", memoryStorage()), false);
  assert.equal(claimSignupConversion("", memoryStorage()), false);
  assert.equal(claimSignupConversion(null, memoryStorage()), false);
});

test("the event id shared with the backend is reg_<user id>", () => {
  assert.equal(registrationEventId(UID), `reg_${UID}`);
});

const NOW = Date.parse("2026-09-28T12:00:00Z");
const seeker = { nowMs: NOW, isAffiliate: false, affiliateIntent: false };

test("a new signup = created within the hour, and not an affiliate", () => {
  assert.equal(isNewSignupConversion({ ...seeker, createdAt: "2026-09-28T11:30:00Z" }), true);
  assert.equal(isNewSignupConversion({ ...seeker, createdAt: "2026-09-28T10:30:00Z" }), false);
  assert.equal(isNewSignupConversion({ ...seeker, createdAt: "2026-09-28T12:02:00Z" }), true); // skew
  assert.equal(isNewSignupConversion({ ...seeker, createdAt: null }), false);
  assert.equal(isNewSignupConversion({ ...seeker, createdAt: "not a date" }), false);
});

test("affiliates and password recovery never count as a signup", () => {
  const fresh = { ...seeker, createdAt: "2026-09-28T11:59:00Z" };
  assert.equal(isNewSignupConversion({ ...fresh, isAffiliate: true }), false);
  assert.equal(isNewSignupConversion({ ...fresh, affiliateIntent: true }), false);
  // Google OAuth from the affiliate landing: no metadata, only the next path
  assert.equal(isNewSignupConversion({ ...fresh, next: "/dashboard/affiliate" }), false);
  assert.equal(isNewSignupConversion({ ...fresh, otpType: "recovery" }), false);
  assert.equal(isNewSignupConversion({ ...fresh, otpType: "signup" }), true);
});

// ─── trackAd ───────────────────────────────────────────────────────────────

const g = globalThis as unknown as { window?: unknown };
afterEach(() => {
  delete g.window;
});

function fakeWindow(cookie = "", gpc = false) {
  const calls: unknown[][] = [];
  const w = {
    fbq: (...args: unknown[]) => void calls.push(args),
    navigator: { globalPrivacyControl: gpc },
    document: { cookie },
    location: { protocol: "https:", hostname: "hiredrop.io" },
  };
  return { w, calls };
}

test("trackAd is a no-op outside a browser and when no pixel is loaded", () => {
  assert.equal(trackAd("InitiateCheckout"), false);
  g.window = { navigator: {}, document: { cookie: "" } };
  assert.equal(trackAd("InitiateCheckout"), false);
});

test("trackAd fires through a loaded pixel, with the event id when given", () => {
  const { w, calls } = fakeWindow();
  g.window = w;
  assert.equal(trackAd("InitiateCheckout", { value: 39, currency: "USD" }), true);
  assert.equal(trackAd("Lead", undefined, "lead_1"), true);
  assert.deepEqual(calls, [
    ["track", "InitiateCheckout", { value: 39, currency: "USD" }],
    ["track", "Lead", {}, { eventID: "lead_1" }],
  ]);
});

test("trackAd does nothing for an opted-out visitor even with the pixel loaded", () => {
  const byCookie = fakeWindow("hd_ads_optout=1");
  g.window = byCookie.w;
  assert.equal(trackAd("InitiateCheckout"), false);
  assert.equal(byCookie.calls.length, 0);

  const byGpc = fakeWindow("", true);
  g.window = byGpc.w;
  assert.equal(trackAd("InitiateCheckout"), false);
  assert.equal(byGpc.calls.length, 0);
});

// ─── base code ─────────────────────────────────────────────────────────────

test("Meta base code: autoConfig off and pushState off before init, no PageView", () => {
  const code = metaBaseCode("000000000000000");
  const autoConfig = code.indexOf("fbq('set','autoConfig',false,'000000000000000')");
  const init = code.indexOf("fbq('init','000000000000000')");
  assert.ok(autoConfig > 0 && init > autoConfig);
  assert.ok(code.indexOf("fbq.disablePushState=true") < init);
  assert.equal(code.includes("PageView"), false);
});

test("gtag config sends no page view of its own", () => {
  assert.match(gtagInitCode("AW-000000000"), /gtag\('config','AW-000000000',\{send_page_view:false\}\)/);
});
