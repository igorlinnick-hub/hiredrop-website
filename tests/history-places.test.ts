// History place filter, tested without a browser: node --test tests/history-places.test.ts
//
// What this protects: the chips come from the record (remote / each city / hybrid in that
// city), a row lands in exactly one chip, and a row we never got a location for is counted
// as "No location" — never quietly dropped or given a city.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildPlaceChips, MAX_PLACE_CHIPS, placeKeyOf, placeText } from "../lib/history/places.ts";

const remote = { location: "Remote, US", work_setting: "remote", place: null };
const houston = { location: "Houston, TX 77008", work_setting: "onsite", place: "Houston, TX" };
const hybridHouston = { location: "Hybrid work in Houston, TX 77056", work_setting: "hybrid", place: "Houston, TX" };
const sanDiego = { location: "San Diego, CA", work_setting: "onsite", place: "San Diego, CA" };
const unplaced = { location: "Austin", work_setting: "onsite", place: null };
const blank = { location: "", work_setting: null, place: null };
// Rows from a backend that predates the fields at all.
const legacy = {};

test("each row has one group", () => {
  assert.equal(placeKeyOf(remote), "remote");
  assert.equal(placeKeyOf(houston), "place:Houston, TX");
  assert.equal(placeKeyOf(hybridHouston), "hybrid:Houston, TX");
  assert.equal(placeKeyOf({ location: "Hybrid", work_setting: "hybrid", place: null }), "hybrid");
  assert.equal(placeKeyOf(unplaced), "other");
  assert.equal(placeKeyOf(blank), "none");
  assert.equal(placeKeyOf(legacy), "none");
});

test("chips read remote, then each city with its hybrid chip beside it", () => {
  const rows = [remote, remote, houston, houston, houston, hybridHouston, sanDiego, unplaced, blank, blank];
  const { chips } = buildPlaceChips(rows);
  assert.deepEqual(
    chips.map((c) => [c.label, c.n]),
    [["All", 10], ["Remote", 2], ["Houston", 3], ["Hybrid · Houston", 1], ["San Diego", 1], ["Other places", 1], ["No location", 2]],
  );
  // Every row is in exactly one chip.
  const sum = chips.filter((c) => c.key !== "all").reduce((s, c) => s + c.n, 0);
  assert.equal(sum, rows.length);
});

test("past the cap, the smallest cities fold into Other places — and the filter agrees", () => {
  const cities = ["Houston, TX", "Dallas, TX", "Austin, TX", "Miami, FL", "Tampa, FL", "Reno, NV"];
  const rows = cities.flatMap((p, i) =>
    Array.from({ length: cities.length - i }, () => ({ location: p, work_setting: "onsite", place: p })),
  );
  const { chips, chipOf } = buildPlaceChips(rows);
  const placeChips = chips.filter((c) => c.key.startsWith("place:"));
  assert.equal(placeChips.length, MAX_PLACE_CHIPS);
  const other = chips.find((c) => c.key === "other");
  assert.equal(other?.n, 2 + 1); // Tampa (2) + Reno (1)
  assert.equal(rows.filter((r) => chipOf(r) === "other").length, other?.n);
});

test("two shown cities with one name keep their state", () => {
  const p1 = { location: "Portland, OR", work_setting: "onsite", place: "Portland, OR" };
  const p2 = { location: "Portland, ME", work_setting: "onsite", place: "Portland, ME" };
  const labels = buildPlaceChips([p1, p1, p2]).chips.map((c) => c.label);
  assert.deepEqual(labels, ["All", "Portland, OR", "Portland, ME"]);
});

test("nothing to choose between = no chip row", () => {
  assert.deepEqual(buildPlaceChips([blank, blank, legacy]).chips, []);
  assert.deepEqual(buildPlaceChips([remote]).chips, []);
  assert.deepEqual(buildPlaceChips([]).chips, []);
});

test("the row's own place text", () => {
  assert.equal(placeText(remote), "Remote");
  assert.equal(placeText(houston), "Houston, TX");
  assert.equal(placeText(hybridHouston), "Hybrid · Houston, TX");
  assert.equal(placeText(unplaced), "Austin");
  assert.equal(placeText(blank), "");
  assert.equal(placeText({ location: "x".repeat(40), work_setting: "onsite", place: null }).length, 32);
});
