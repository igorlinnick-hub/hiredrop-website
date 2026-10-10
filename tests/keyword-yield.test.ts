// Dry-phrase hints, tested without a browser: node --test tests/keyword-yield.test.ts
//
// What this protects: only a phrase the server calls dry AND still in the person's list is
// named (the tally can trail an edit), a kept phrase stays quiet, and a replacement is never
// a role already searched for.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { dryHints, MAX_REPLACEMENTS, replacementRoles, type YieldResponse } from "../lib/keyword-yield.ts";

const data: YieldResponse = {
  window_days: 7,
  all_dry: false,
  keywords: [
    { keyword: "project manager", pages: 2, judged: 28, fits: 0, dry: true },
    { keyword: "social media", pages: 3, judged: 18, fits: 4, dry: false },
    { keyword: "Brand", pages: 0, judged: 0, fits: 0, dry: false },
  ],
};

test("a dry phrase in the list is named", () => {
  const got = dryHints(data, ["Project Manager ", "social media"], () => false);
  assert.deepEqual(got.map((k) => k.keyword), ["project manager"]);
});

test("a phrase the person already replaced is not named", () => {
  assert.deepEqual(dryHints(data, ["social media", "digital marketing manager"], () => false), []);
});

test("a kept phrase stays quiet", () => {
  assert.deepEqual(dryHints(data, ["project manager"], (k) => k === "project manager"), []);
});

test("unknown is never dry", () => {
  assert.deepEqual(dryHints(data, ["Brand"], () => false), []);
});

test("replacements skip roles already searched and duplicates", () => {
  const roles = ["Social Media", "Digital Marketing Manager", "digital marketing manager ", "Brand Manager", "Content Lead"];
  const got = replacementRoles(roles, ["social media", "project manager"]);
  assert.deepEqual(got, ["Digital Marketing Manager", "Brand Manager"]);
  assert.equal(got.length, MAX_REPLACEMENTS);
});

test("no resume roles means no replacements, not an error", () => {
  assert.deepEqual(replacementRoles([], ["project manager"]), []);
});
