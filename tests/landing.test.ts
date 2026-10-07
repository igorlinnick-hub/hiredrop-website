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
