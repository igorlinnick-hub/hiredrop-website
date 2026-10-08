// Answers after the resume, tested without a browser:
//   node --test tests/answers-after-resume.test.ts
//
// What this protects: signup without a resume asks fewer questions, but the rest are only
// MOVED — the Start gate still requires every one, and a Tap run may not walk around it.
// What the resume says is offered, never saved until the person confirms it, and what an
// earlier resume said is never offered for a new one.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  askNow,
  awaitingConfirmation,
  hintCacheKey,
  initialValues,
  parseHints,
  resumeGroup,
  type AnswerQuestion,
} from "../lib/employerAnswers.ts";
import { TAP_BLOCKING_CHECKS, TapStartRefused, tapRefusal } from "../lib/employerAnswersGate.ts";

const ROWS: AnswerQuestion[] = [
  { key: "country", label: "US?", kind: "us_resident", value: null, stage: "signup" },
  { key: "city", label: "City", kind: "text", value: "", stage: "signup" },
  { key: "current_title", label: "Title", kind: "text", value: "", stage: "resume" },
  { key: "school", label: "School", kind: "text", value: "", stage: "resume",
    opt_out: { flag: "no_degree", label: "No degree" } },
  { key: "salary_expectation", label: "Pay", kind: "text", value: "", stage: "resume" },
];

test("no resume: only the signup-stage questions are asked now", () => {
  assert.deepEqual(askNow(ROWS, false).map((q) => q.key), ["country", "city"]);
});

test("with a resume, every question is asked", () => {
  assert.deepEqual(askNow(ROWS, true), ROWS);
});

test("an older server that sends no stage gets today's full form", () => {
  const old = ROWS.map((q) => ({ ...q, stage: undefined }));
  assert.deepEqual(askNow(old, false), old);
});

test("a row with a stage this build does not know is asked, not dropped", () => {
  const rows = [...ROWS, { key: "x", label: "X", kind: "text" as const, stage: "later" }];
  assert.ok(askNow(rows, false).some((q) => q.key === "x"));
});

test("the resume group is what the server says came from the resume, and only that", () => {
  // salary has a suggestion too, but from settings — not in from_resume.
  const values = { current_title: "Marketing Lead", school: "UT Austin", salary_expectation: "$80,000 per year" };
  assert.deepEqual(resumeGroup(ROWS, ["current_title", "school"], values), ["current_title", "school"]);
  // Nothing to show = nothing to confirm.
  assert.deepEqual(resumeGroup(ROWS, ["current_title", "school"], { current_title: "Marketing Lead" }), ["current_title"]);
  // An answer already on file is the person's own — not re-offered as the resume's.
  const answered = ROWS.map((q) => (q.key === "school" ? { ...q, value: "MIT" } : q));
  assert.deepEqual(resumeGroup(answered, ["school"], initialValues(answered)), []);
});

test("no from_resume from the server = no group (older backend)", () => {
  assert.deepEqual(resumeGroup(ROWS, undefined, { current_title: "Lead" }), []);
  assert.deepEqual(resumeGroup(ROWS, null, { current_title: "Lead" }), []);
});

test("the resume's facts wait for a confirmation; a tickbox answers on its own", () => {
  const group = ["current_title", "school"];
  assert.deepEqual(awaitingConfirmation(group, {}, ROWS, {}), group);
  // "Looks right" confirms them all; touching one box confirms that one.
  assert.deepEqual(awaitingConfirmation(group, { current_title: true, school: true }, ROWS, {}), []);
  assert.deepEqual(awaitingConfirmation(group, { school: true }, ROWS, {}), ["current_title"]);
  assert.deepEqual(awaitingConfirmation(group, {}, ROWS, { no_degree: true }), ["current_title"]);
});

test("the suggest answer is read whatever its vintage", () => {
  assert.deepEqual(parseHints({ suggestions: { school: "MIT" } }), { suggestions: { school: "MIT" }, fromResume: null });
  assert.deepEqual(
    parseHints({ suggestions: { school: "MIT", degree: "" }, from_resume: ["school", 3] }),
    { suggestions: { school: "MIT" }, fromResume: ["school"] },
  );
  // The pre-change cache held the bare suggestions map — not a hint entry.
  assert.equal(parseHints({ school: "MIT" }), null);
  assert.equal(parseHints(null), null);
});

test("hints are cached per resume file: a new upload never sees the old one's facts", () => {
  const a = hintCacheKey("u1", "u1/resume-aaa.pdf");
  const b = hintCacheKey("u1", "u1/resume-bbb.pdf");
  assert.notEqual(a, b);
  assert.notEqual(hintCacheKey("u2", "u1/resume-aaa.pdf"), a);
  // Every key starts with the prefix forgetResumeHints clears.
  assert.ok(a.startsWith("hd_answer_hints:") && hintCacheKey("u1", null).startsWith("hd_answer_hints:"));
});

const check = (id: string, ok: boolean, reason: string | null = null) => ({ id, ok, reason, fix: null });

test("a Tap run is refused on missing employer answers", () => {
  const readiness = {
    ready: false,
    checks: [
      check("onboarding", true),
      check("employer_answers", false, "Answer what employers ask on almost every application — once"),
    ],
  };
  const refused = tapRefusal(readiness);
  assert.deepEqual(refused.map((c) => c.id), ["employer_answers"]);
  const err = new TapStartRefused(refused);
  assert.ok(err instanceof Error);
  assert.equal(err.name, "TapStartRefused");
  assert.match(err.message, /^Answer what employers ask/);
  assert.match(err.message, /Apply approved/);
});

test("checks that mean something else for a deck do not stop a Tap run", () => {
  const readiness = { ready: false, checks: [check("keywords", false, "x"), check("not_running", false, "y"), check("free_quota", false, "z")] };
  assert.deepEqual(tapRefusal(readiness), []);
  for (const id of ["onboarding", "us_only", "employer_answers", "resume"]) assert.ok(TAP_BLOCKING_CHECKS.includes(id));
});

test("an unreadable gate answer is not a refusal (fail-open, like the Start buttons)", () => {
  assert.deepEqual(tapRefusal(null), []);
  assert.deepEqual(tapRefusal({ ready: true }), []);
  assert.deepEqual(tapRefusal({ checks: "nope" }), []);
});
