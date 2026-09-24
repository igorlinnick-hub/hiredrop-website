// The gate rule, tested without a server: node --test tests/onboarding-gate.test.ts
//
// What this protects: the affiliate screen is where someone APPLIES now, so
// gating it on "already an affiliate" would close the door on the thing you
// walk through it to get — and widening it by one character too many would
// hand an un-onboarded user a job-search route.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isOnboardingExempt } from "../lib/gate/onboarding.ts";

test("the affiliate screen is open before onboarding", () => {
  assert.equal(isOnboardingExempt("/dashboard/affiliate"), true);
});

test("its sub-pages inherit the exemption", () => {
  assert.equal(isOnboardingExempt("/dashboard/affiliate/payouts"), true);
});

test("every other dashboard route stays gated", () => {
  for (const p of [
    "/dashboard",
    "/dashboard/history",
    "/dashboard/settings",
    "/dashboard/tap",
  ]) {
    assert.equal(isOnboardingExempt(p), false, p);
  }
});

test("a route that merely starts with the same letters is NOT exempt", () => {
  // /dashboard/affiliates-admin would be somebody else's data, not their own.
  assert.equal(isOnboardingExempt("/dashboard/affiliates-admin"), false);
  assert.equal(isOnboardingExempt("/dashboard/affiliate-payouts"), false);
});

test("an empty or foreign path is never exempt", () => {
  assert.equal(isOnboardingExempt(""), false);
  assert.equal(isOnboardingExempt("/onboarding"), false);
  assert.equal(isOnboardingExempt("/affiliate"), false);
});
