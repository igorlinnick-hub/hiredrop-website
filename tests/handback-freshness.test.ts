// Hand-back freshness, tested without a browser: node --test tests/handback-freshness.test.ts
//
// What this protects: a hand-back older than a day is a record, not a to-do — the
// employer's form has reset and kept nothing (Igor, 10-08: a day-old 95% row opened an
// EMPTY ZipRecruiter pane with nowhere to continue). A row without created_at (API rows
// from before the field) must stay FRESH: wrongly blinking beats silently burying a job
// that may still be finishable.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HANDBACK_FRESH_MS, handbackAge, handbackExpired } from "../lib/handbacks/freshness.ts";

const NOW = Date.parse("2026-10-08T22:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const H = 3600_000;

test("a day is the line", () => {
  assert.equal(handbackExpired(ago(2 * H), NOW), false);
  assert.equal(handbackExpired(ago(23 * H), NOW), false);
  assert.equal(handbackExpired(ago(25 * H), NOW), true);
  assert.equal(handbackExpired(ago(6 * 24 * H), NOW), true);
  assert.equal(HANDBACK_FRESH_MS, 24 * H);
});

test("no created_at (old API) or garbage = still fresh, never buried", () => {
  assert.equal(handbackExpired(undefined, NOW), false);
  assert.equal(handbackExpired(null, NOW), false);
  assert.equal(handbackExpired("", NOW), false);
  assert.equal(handbackExpired("not-a-date", NOW), false);
});

test("age reads like a person says it", () => {
  assert.equal(handbackAge(ago(0), NOW), "1m ago");
  assert.equal(handbackAge(ago(28 * 60_000), NOW), "28m ago");
  assert.equal(handbackAge(ago(5 * H), NOW), "5h ago");
  assert.equal(handbackAge(ago(30 * H), NOW), "yesterday");
  assert.equal(handbackAge(ago(6 * 24 * H), NOW), "6d ago");
  assert.equal(handbackAge(undefined, NOW), null);
  assert.equal(handbackAge("not-a-date", NOW), null);
});

test("the clock running a little behind the row never goes negative", () => {
  assert.equal(handbackAge(ago(-30_000), NOW), "1m ago"); // created "in the future"
  assert.equal(handbackExpired(ago(-30_000), NOW), false);
});
