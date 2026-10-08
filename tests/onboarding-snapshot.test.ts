// Whose saved onboarding progress gets resumed, tested without a browser:
//   node --test tests/onboarding-snapshot.test.ts
//
// What this protects: on a shared browser the wizard's snapshot of one account (name,
// email, phone, search settings) was resumed for whoever signed in next, and finish()
// saved it as THEIR profile — applications went out under the first person's name.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { ownSnapshot } from "../lib/onboarding/snapshot.ts";

const ME = { id: "uid-b", email: "buyer@example.com" };

test("a snapshot written by this account is resumed", () => {
  const saved = { v: 2, uid: "uid-b", step: 10, profile: { email: "buyer@example.com" } };
  assert.equal(ownSnapshot(saved, ME), saved);
});

test("another account's snapshot is dropped, whatever email it carries", () => {
  assert.equal(ownSnapshot({ v: 2, uid: "uid-a", step: 4, profile: { email: "alice@example.com" } }, ME), null);
  // The uid decides once it is there — even a matching email doesn't let A's through.
  assert.equal(ownSnapshot({ v: 2, uid: "uid-a", step: 4, profile: { email: "buyer@example.com" } }, ME), null);
  // A uid that isn't a string is nobody's.
  assert.equal(ownSnapshot({ v: 2, uid: null, step: 4, profile: { email: "buyer@example.com" } }, ME), null);
});

test("a snapshot from before the uid is kept only when its email is this account's", () => {
  const mine = { v: 2, step: 10, profile: { email: " Buyer@Example.com " } };
  assert.equal(ownSnapshot(mine, ME), mine);
  assert.equal(ownSnapshot({ v: 2, step: 4, profile: { email: "alice@example.com" } }, ME), null);
  // No email to compare on either side: can't tell whose it is, so it is not resumed.
  assert.equal(ownSnapshot({ v: 2, step: 4, profile: { email: "" } }, ME), null);
  assert.equal(ownSnapshot({ v: 2, step: 4, profile: {} }, ME), null);
  assert.equal(ownSnapshot({ v: 2, step: 4 } as { step: number; profile?: { email?: string } }, ME), null);
  assert.equal(ownSnapshot({ v: 2, step: 4, profile: { email: "" } }, { id: "uid-b", email: "" }), null);
  assert.equal(ownSnapshot({ v: 2, step: 4, profile: { email: "buyer@example.com" } }, { id: "uid-b" }), null);
});

test("nothing saved, or garbage, resumes nothing", () => {
  assert.equal(ownSnapshot(null, ME), null);
  assert.equal(ownSnapshot("step 4" as unknown as { uid?: string }, ME), null);
});
