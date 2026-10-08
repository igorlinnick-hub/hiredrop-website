// Where someone lands after auth — node --test tests/landing.test.ts
//
// Three callers share this rule (login, email/OAuth callback, dashboard
// shell). They used to decide separately and disagreed: an affiliate who
// confirmed by email reached their page, the same person signing in with a
// password two days later was handed the job-seeker quiz.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  isAffiliateOnly,
  landingAfterAuth,
  safeNextPath,
  signedInAuthPageRedirect,
} from "../lib/gate/landing.ts";

const seeker = { onboarded: false, isAffiliate: false, affiliateIntent: false };

test("a new job seeker goes to the quiz", () => {
  assert.equal(landingAfterAuth(seeker), "/onboarding");
});

test("an onboarded user goes to the dashboard — affiliate or not", () => {
  assert.equal(landingAfterAuth({ ...seeker, onboarded: true }), "/dashboard");
  assert.equal(
    landingAfterAuth({ onboarded: true, isAffiliate: true, affiliateIntent: true }),
    "/dashboard",
  );
});

test("an approved affiliate who never did the quiz goes to their page", () => {
  assert.equal(landingAfterAuth({ ...seeker, isAffiliate: true }), "/dashboard/affiliate");
});

test("someone who signed up to ask for a link goes to their page before approval too", () => {
  // The case measured live: application pending, no affiliate row yet.
  assert.equal(landingAfterAuth({ ...seeker, affiliateIntent: true }), "/dashboard/affiliate");
});

test("an explicit next wins over every default", () => {
  assert.equal(
    landingAfterAuth({ ...seeker, affiliateIntent: true, next: "/dashboard/settings" }),
    "/dashboard/settings",
  );
});

test("next cannot send a freshly signed-in person to another site", () => {
  for (const evil of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "javascript:alert(1)"]) {
    assert.equal(safeNextPath(evil), null, evil);
    assert.equal(landingAfterAuth({ ...seeker, next: evil }), "/onboarding", evil);
  }
});

test("tabs and newlines cannot smuggle a second slash past the check", () => {
  // The browser deletes tab, LF and CR anywhere in a URL, so each of these is
  // "//evil.com" or "/\evil.com" by the time it navigates.
  const evil = [
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\r\n/evil.com",
    "/\t\t\t/evil.com",
    "/\t\\evil.com",
    "/\\\t/evil.com",
    "\t//evil.com",
    "\n/\n/\nevil.com",
  ];
  for (const e of evil) {
    assert.equal(safeNextPath(e), null, JSON.stringify(e));
    assert.equal(landingAfterAuth({ ...seeker, next: e }), "/onboarding", JSON.stringify(e));
  }
});

test("backslashes count as slashes, wherever they sit before the host", () => {
  for (const e of ["/\\evil.com", "/\\\\evil.com", "/\\/evil.com", "//\\evil.com", "\\\\evil.com", "\\/evil.com"]) {
    assert.equal(safeNextPath(e), null, JSON.stringify(e));
  }
});

test("dot segments cannot leave a protocol-relative path behind", () => {
  // Each one parses to the path "//evil.com" on this site — fine as a whole
  // URL, another host once that path is handed back to the browser alone.
  for (const e of ["/.//evil.com", "/x/..//evil.com", "/%2e//evil.com", "/%2E%2E//evil.com", "/./\\evil.com", "/.\t//evil.com"]) {
    assert.equal(safeNextPath(e), null, JSON.stringify(e));
  }
});

test("percent-encoded control characters in the real query string are caught after decoding", () => {
  // What LoginForm, the callback and middleware actually see: the value
  // URLSearchParams has already decoded.
  for (const raw of ["/%09/evil.com", "/%0A/evil.com", "/%0D/evil.com", "/%0D%0A/evil.com", "/%5C/evil.com", "%2F%09%2Fevil.com", "/.//evil.com"]) {
    const params = new URLSearchParams(`next=${raw}`);
    assert.equal(safeNextPath(params.get("next")), null, raw);
    assert.equal(landingAfterAuth({ ...seeker, next: params.get("next") }), "/onboarding", raw);
    assert.equal(signedInAuthPageRedirect("/login", params), "/dashboard", raw);
  }
});

test("a NUL byte stays inside the path — still this site", () => {
  // The browser percent-encodes NUL in a path rather than deleting it, so it
  // cannot join two slashes; a leading one is not a path at all.
  assert.equal(safeNextPath("/\u0000/evil.com"), "/%00/evil.com");
  assert.equal(safeNextPath("/dashboard\u0000"), "/dashboard");
  assert.equal(safeNextPath("\u0000//evil.com"), null);
});

test("real next values come back exactly as they went in", () => {
  for (const ok of [
    "/",
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/affiliate",
    "/dashboard?tab=billing#x",
    "/affiliate/apply?ref=igor",
    "/extension/connect",
    "/auth/update-password",
    "/dashboard?q=a%20b&path=%2Fx%3Fy&plus=a+b",
    "/jobs/caf%C3%A9?city=S%C3%A3o%20Paulo#top",
    "/dashboard/x%2F%2Fevil.com",
  ]) {
    assert.equal(safeNextPath(ok), ok, ok);
    assert.equal(landingAfterAuth({ ...seeker, next: ok }), ok, ok);
  }
  // What middleware writes for an expired session (pathname + search, encoded)
  // and LoginForm then reads back through URLSearchParams.
  const back = "/dashboard/settings?tab=billing&ref=a%2Fb";
  const params = new URLSearchParams(`next=${encodeURIComponent(back)}`);
  assert.equal(landingAfterAuth({ ...seeker, next: params.get("next") }), back);
  assert.equal(signedInAuthPageRedirect("/login", params), back);
});

test("whatever next survives keeps a browser on the site it is on", () => {
  // Every short mix, after the leading slash, of the characters that can move a
  // URL to another host (anything else is turned away at the first character).
  // Whatever comes out must resolve to the page's own origin — prod, a
  // preview or localhost — and must come out unchanged if checked again.
  const parts = ["/", "\\", "\t", "\n", "\r", "\u0000", " ", ".", "..", "%2e", "%09", "%5C", "evil.com", "?", "#", "@"];
  const pages = ["https://hiredrop.io/login", "https://hiredrop-git-x.vercel.app/login", "http://localhost:3000/login"];
  const walk = (prefix: string, depth: number) => {
    const out = safeNextPath(prefix);
    if (out !== null) {
      assert.ok(out.startsWith("/") && !out.startsWith("//"), JSON.stringify(prefix));
      assert.equal(safeNextPath(out), out, JSON.stringify(prefix));
      for (const page of pages) {
        assert.equal(new URL(out, page).origin, new URL(page).origin, `${JSON.stringify(prefix)} on ${page}`);
      }
    }
    if (depth === 0) return;
    for (const p of parts) walk(prefix + p, depth - 1);
  };
  walk("/", 4);
});

test("affiliate-only means not onboarded AND here for the program", () => {
  assert.equal(isAffiliateOnly(seeker), false);
  assert.equal(isAffiliateOnly({ ...seeker, affiliateIntent: true }), true);
  assert.equal(isAffiliateOnly({ ...seeker, isAffiliate: true }), true);
  // Did the quiz: a job seeker with a link, not an affiliate-only account.
  assert.equal(isAffiliateOnly({ onboarded: true, isAffiliate: true, affiliateIntent: true }), false);
});

test("signed in + affiliate signup goes to the affiliate page, not the quiz", () => {
  const q = (s: string) => new URLSearchParams(s);
  assert.equal(signedInAuthPageRedirect("/signup", q("affiliate=1")), "/dashboard/affiliate");
  assert.equal(signedInAuthPageRedirect("/signup", q("affiliate=jane")), "/dashboard/affiliate");
  assert.equal(signedInAuthPageRedirect("/signup", q("")), "/dashboard");
  assert.equal(
    signedInAuthPageRedirect("/login", q("next=%2Fdashboard%2Faffiliate")),
    "/dashboard/affiliate",
  );
  assert.equal(signedInAuthPageRedirect("/login", q("next=%2F%2Fevil.com")), "/dashboard");
  assert.equal(signedInAuthPageRedirect("/login", q("affiliate=1")), "/dashboard");
  // Never back to an auth page — that would be a redirect loop.
  assert.equal(signedInAuthPageRedirect("/login", q("next=%2Flogin")), "/dashboard");
  assert.equal(signedInAuthPageRedirect("/login", q("next=%2Fsignup%3Faffiliate%3D1")), "/dashboard");
});
