// Dry-phrase swap rows, tested without a browser: node --test tests/keyword-yield.test.ts
//
// What this protects: only a phrase the server calls dry AND still in the person's list is
// named (the tally can trail an edit), in the person's own spelling so Swap hits the exact
// chip; a kept phrase stays quiet; each row gets one role, never one already searched and
// never the same role on two rows.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { swapRows, type YieldResponse } from "../lib/keyword-yield.ts";

const data: YieldResponse = {
  window_days: 7,
  all_dry: false,
  keywords: [
    { keyword: "project manager", pages: 2, judged: 28, fits: 0, dry: true },
    { keyword: "social media", pages: 3, judged: 18, fits: 4, dry: false },
    { keyword: "Brand", pages: 0, judged: 0, fits: 0, dry: false },
    { keyword: "ops lead", pages: 2, judged: 22, fits: 0, dry: true },
  ],
};
const roles = ["Social Media", "Digital Marketing Manager", "digital marketing manager ", "Brand Manager", "Content Lead"];
const never = () => false;

test("a dry phrase in the list is named in the person's spelling", () => {
  const got = swapRows(data, ["Project  Manager ", "social media"], roles, never);
  assert.deepEqual(got, [{ keyword: "Project  Manager ", replacement: "Digital Marketing Manager" }]);
});

test("a phrase the person already replaced is not named", () => {
  assert.deepEqual(swapRows(data, ["social media", "digital marketing manager"], roles, never), []);
});

test("a kept phrase stays quiet and leaves its role to the next row", () => {
  const got = swapRows(data, ["project manager", "ops lead"], roles, (k) => k === "project manager");
  assert.deepEqual(got, [{ keyword: "ops lead", replacement: "social media" }]);
});

test("unknown is never dry", () => {
  assert.deepEqual(swapRows(data, ["Brand"], roles, never), []);
});

test("each row gets its own role, skipping roles already searched", () => {
  const got = swapRows(data, ["social media", "project manager", "ops lead"], roles, never);
  assert.deepEqual(got, [
    { keyword: "project manager", replacement: "digital marketing manager" },
    { keyword: "ops lead", replacement: "brand manager" },
  ]);
});

test("no role left means no replacement, not an error", () => {
  assert.deepEqual(swapRows(data, ["project manager"], [], never), [{ keyword: "project manager", replacement: null }]);
});

test("the role takes the case of the phrase it replaces", () => {
  const lower = { ...data, keywords: [{ keyword: "Project Manager", pages: 2, judged: 28, fits: 0, dry: true }] };
  assert.deepEqual(swapRows(lower, ["Project Manager"], ["digital marketing manager"], never), [
    { keyword: "Project Manager", replacement: "Digital Marketing Manager" },
  ]);
  assert.deepEqual(swapRows(lower, ["project manager"], ["Digital Marketing Manager"], never), [
    { keyword: "project manager", replacement: "digital marketing manager" },
  ]);
});
