// The employer-answers form rules, tested without a browser:
//   node --test tests/employer-answers.test.ts
//
// What this protects: signup asks every question employers keep asking ONCE, offering
// what the resume already says. A suggestion that silently counted as an answer, or an
// opt-out that never reached the server, puts a wrong fact on a real application.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  ANSWERS_UI,
  answersUi,
  applyHints,
  awaitsHint,
  buildBody,
  initialValues,
  isAnswered,
  livesAbroad,
  normalizeQuestions,
  optOutAnchors,
  spansRow,
  type AnswerQuestion,
} from "../lib/employerAnswers.ts";
import { resumeStep, STEP, STEPS } from "../lib/onboarding/steps.ts";

const NO_DEGREE = { flag: "no_degree", label: "I don't have a college degree" };
const QUESTIONS: AnswerQuestion[] = [
  { key: "country", label: "Do you live in the United States?", kind: "us_resident", value: null },
  { key: "city", label: "City", kind: "text", value: "Honolulu" },
  { key: "needs_sponsorship", label: "Sponsorship?", kind: "yesno", value: false },
  { key: "current_title", label: "Most recent job title", kind: "text", value: "", suggestion: "Marketing Lead" },
  { key: "school", label: "School or university", kind: "text", value: "", opt_out: NO_DEGREE },
  { key: "degree", label: "Degree", kind: "text", value: "", opt_out: NO_DEGREE },
];

test("controls start from the answer on file, else the resume's suggestion", () => {
  assert.deepEqual(initialValues(QUESTIONS), {
    city: "Honolulu",
    needs_sponsorship: false,
    current_title: "Marketing Lead",
  });
});

test("false is an answer, an untouched yes/no is not", () => {
  const values = initialValues(QUESTIONS);
  assert.equal(isAnswered(QUESTIONS[2], values, {}), true);
  assert.equal(isAnswered(QUESTIONS[0], values, {}), false);
});

test("one tickbox answers both education questions, drawn once", () => {
  const values = initialValues(QUESTIONS);
  assert.equal(isAnswered(QUESTIONS[4], values, {}), false);
  assert.equal(isAnswered(QUESTIONS[4], values, { no_degree: true }), true);
  assert.equal(isAnswered(QUESTIONS[5], values, { no_degree: true }), true);
  assert.deepEqual(optOutAnchors(QUESTIONS), { school: NO_DEGREE });
  // Start-gate case: only the second of the pair is still missing.
  assert.deepEqual(optOutAnchors([QUESTIONS[5]]), { degree: NO_DEGREE });
  // Two opt-outs on one form each get their own tickbox.
  const NO_PAY = { flag: "no_salary_expectation", label: "I'd rather not name a number" };
  const pay: AnswerQuestion = { key: "salary_expectation", label: "Salary", kind: "text", opt_out: NO_PAY };
  assert.deepEqual(optOutAnchors([...QUESTIONS, pay]), { school: NO_DEGREE, salary_expectation: NO_PAY });
});

test("a pair shares a row; a yes/no and a lone opt-out question take one each", () => {
  const linkedin: AnswerQuestion = {
    key: "linkedin_url", label: "LinkedIn", kind: "text",
    opt_out: { flag: "no_linkedin", label: "I don't have a LinkedIn" },
  };
  const all = [...QUESTIONS, linkedin];
  const wide = all.filter((q) => spansRow(q, all)).map((q) => q.key);
  assert.deepEqual(wide, ["country", "needs_sponsorship", "linkedin_url"]);
  // At the Start gate only one of the pair may be left — it then stands alone.
  assert.equal(spansRow(QUESTIONS[5], [QUESTIONS[5]]), true);
});

test("the resume fills only boxes that are still empty", () => {
  // city has an answer, current_title already has a suggestion, school/degree wait.
  assert.deepEqual(QUESTIONS.filter((q) => awaitsHint(q, {})).map((q) => q.key), ["school", "degree"]);
  const hints = { school: "UT Austin", degree: "BA", city: "Dallas", current_title: "CEO" };
  const start = initialValues(QUESTIONS);
  assert.deepEqual(applyHints(start, QUESTIONS, {}, hints), { ...start, school: "UT Austin", degree: "BA" });
  // The hint lands a moment late: what someone began typing wins.
  assert.equal(applyHints({ ...start, school: "MIT" }, QUESTIONS, {}, hints).school, "MIT");
  // "I don't have a college degree" is not waiting for a school to be suggested.
  assert.deepEqual(applyHints(start, QUESTIONS, { no_degree: true }, hints), start);
  assert.deepEqual(applyHints(start, QUESTIONS, {}, {}), start);
});

test("the body carries the flag as a real boolean and drops what it answers", () => {
  const values = { ...initialValues(QUESTIONS), country: true, school: " MIT ", degree: "BS" };
  assert.deepEqual(buildBody(QUESTIONS, values, {}), {
    country: true,
    city: "Honolulu",
    needs_sponsorship: false,
    current_title: "Marketing Lead",
    no_degree: false,
    school: "MIT",
    degree: "BS",
  });
  const out = buildBody(QUESTIONS, values, { no_degree: true });
  assert.equal(out.no_degree, true);
  assert.equal("school" in out, false);
  assert.equal("degree" in out, false);
});

test("living abroad closes the form", () => {
  assert.equal(livesAbroad(QUESTIONS, { country: false }), true);
  assert.equal(livesAbroad(QUESTIONS, { country: true }), false);
  assert.equal(livesAbroad(QUESTIONS, {}), false);
});

test("a snapshot saved before the Answers step resumes on the same screen", () => {
  // Old numbering: 6 ATS, 7 Style, 8 Plan, 9 Connect, 10 Done.
  assert.equal(resumeStep({ step: 6 }), STEP.ats);
  assert.equal(STEPS[resumeStep({ step: 7 })! - 1].title, "Style");
  assert.equal(resumeStep({ step: 9 }), STEP.connect);
  assert.equal(resumeStep({ step: 10 }), STEP.done);
  // New snapshots are taken at their word.
  assert.equal(resumeStep({ v: 2, step: 7 }), STEP.answers);
  assert.equal(resumeStep({ v: 2, step: 10 }), STEP.connect);
  assert.equal(resumeStep(null), undefined);
  assert.equal(resumeStep({ step: 99 }), STEPS.length);
});

test("every count of missing answers says which list this build can ask", () => {
  // A client that says nothing is held by the server to the list it always saw — that is
  // what keeps an old tab from being asked something it cannot draw. This build says 2.
  assert.equal(ANSWERS_UI, 2);
  assert.equal(answersUi("/campaign/readiness"), "/campaign/readiness?answers_ui=2");
  assert.equal(answersUi("/campaign/start?x=1"), "/campaign/start?x=1&answers_ui=2");
});

test("questions from any vintage of server are drawable", () => {
  const fromOldServer = [
    { key: "linkedin_url", label: "LinkedIn profile URL", kind: "text" },
    { key: "city", label: "City", kind: "text" },
  ] as AnswerQuestion[];
  const [linkedin, city] = normalizeQuestions(fromOldServer);
  // A rolled-back backend sends LinkedIn without its tickbox; it has always had one.
  assert.deepEqual(linkedin.opt_out, { flag: "no_linkedin", label: "I don't have a LinkedIn" });
  assert.equal(city.opt_out, undefined);
  // What the server sends wins over the fallback.
  const own = { flag: "no_linkedin", label: "No LinkedIn" };
  assert.deepEqual(normalizeQuestions([{ ...fromOldServer[0], opt_out: own }])[0].opt_out, own);
  // A kind this build has never heard of is a text box — not a Yes/No that posts true.
  const future = [{ key: "start_date", label: "Start date", kind: "date" }] as unknown as AnswerQuestion[];
  assert.equal(normalizeQuestions(future)[0].kind, "text");
});
