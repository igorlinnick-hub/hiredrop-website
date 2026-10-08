// The US question on signup's first screen, tested without a browser:
//   node --test tests/us-first.test.ts
//
// What this protects: HireDrop applies to US jobs only. A "No" must stop signup on screen
// one — but an outage of our own API must not, because the answers step and the Start
// gate ask the same question again.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import type { AnswerQuestion } from "../lib/employerAnswers.ts";
import { mayContinue, residencyQuestion, withoutSettledResidency } from "../lib/usResident.ts";

const US: AnswerQuestion = { key: "country", label: "Do you live in the United States?", kind: "us_resident", value: null };
const LIST: AnswerQuestion[] = [
  { key: "city", label: "City", kind: "text", value: "" },
  US,
  { key: "work_authorized_us", label: "Authorized?", kind: "yesno", value: null },
];

test("the residency question is found by kind, not by key", () => {
  assert.equal(residencyQuestion(LIST), US);
  assert.equal(residencyQuestion([{ ...US, key: "lives_in_us" }])?.key, "lives_in_us");
  assert.equal(residencyQuestion(LIST.filter((q) => q !== US)), null);
  assert.equal(residencyQuestion(null), null);
});

test("only a Yes leaves the first step", () => {
  assert.equal(mayContinue(US, true), true);
  assert.equal(mayContinue(US, false), false);
  assert.equal(mayContinue(US, null), false);
});

test("no question loaded is never a dead end", () => {
  assert.equal(mayContinue(null, null), true);
});

test("the answers step drops the residency question only when it is already a Yes", () => {
  assert.deepEqual(withoutSettledResidency([{ ...US, value: true }, ...LIST.slice(0, 1)]).map((q) => q.key), ["city"]);
  assert.equal(withoutSettledResidency([{ ...US, value: false }]).length, 1);
  assert.equal(withoutSettledResidency([US]).length, 1);
});
