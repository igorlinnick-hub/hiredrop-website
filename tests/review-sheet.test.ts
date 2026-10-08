// The one-time review before the first run, tested without a browser:
//   node --test tests/review-sheet.test.ts
//
// What this protects: the sheet shows every value a form gets, and "Everything's correct"
// only opens when nothing required is blank and the person lives in the US. The body must
// carry every edit (and every tickbox as a real boolean), never the read-only rows.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TAP_BLOCKING_CHECKS } from "../lib/employerAnswersGate.ts";
import {
  blankRows,
  canConfirm,
  editableRows,
  reviewBody,
  reviewValues,
  stillBlank,
  type ReviewSection,
} from "../lib/reviewSheet.ts";

const NO_LINKEDIN = { flag: "no_linkedin", label: "I don't have a LinkedIn" };
const SECTIONS: ReviewSection[] = [
  {
    title: "Contact",
    rows: [
      { key: "name", label: "First name", kind: "text", value: "Jordan", required: true },
      { key: "phone", label: "Phone", kind: "text", value: "", required: true },
      { key: "email", label: "Email", kind: "info", value: "jordan@example.com" },
    ],
  },
  {
    title: "Where you live and can work",
    rows: [
      { key: "country", label: "Do you live in the United States?", kind: "us_resident", value: true, required: true },
      { key: "postal_code", label: "ZIP code", kind: "text", value: "", required: false },
      { key: "work_authorized_us", label: "Authorized?", kind: "yesno", value: null, required: true },
    ],
  },
  {
    title: "Experience and education",
    rows: [{ key: "linkedin_url", label: "LinkedIn", kind: "text", value: "", required: true, opt_out: NO_LINKEDIN }],
  },
  {
    title: "Other questions employers ask",
    rows: [{ key: "notice_period", label: "Notice period", kind: "text", value: "2 weeks", required: true }],
  },
  {
    title: "Answered the same way on every form",
    rows: [{ key: "eeo", label: "Gender, race…", kind: "info", value: "I don't wish to answer" }],
  },
];

test("info rows are shown, never answered or sent", () => {
  const keys = editableRows(SECTIONS).map((q) => q.key);
  assert.ok(!keys.includes("email") && !keys.includes("eeo"));
  const body = reviewBody(SECTIONS, reviewValues(SECTIONS), {});
  assert.ok(!("email" in body) && !("eeo" in body));
});

test("what is on file, and the defaults the filler would send, start in the boxes", () => {
  const v = reviewValues(SECTIONS);
  assert.equal(v.name, "Jordan");
  assert.equal(v.notice_period, "2 weeks");
  assert.equal(v.country, true);
  assert.equal(v.work_authorized_us, undefined);
});

test("blank required rows hold the button; optional ones do not", () => {
  const v = reviewValues(SECTIONS);
  assert.deepEqual(blankRows(SECTIONS, v, {}), ["phone", "work_authorized_us", "linkedin_url"]);
  assert.equal(canConfirm(SECTIONS, v, {}), false);
  const filled = { ...v, phone: "(512) 555-0147", work_authorized_us: true };
  assert.deepEqual(blankRows(SECTIONS, filled, { no_linkedin: true }), []);
  assert.equal(canConfirm(SECTIONS, filled, { no_linkedin: true }), true);
});

test("a No to living in the US keeps the button shut", () => {
  const v = { ...reviewValues(SECTIONS), phone: "1", work_authorized_us: true, country: false };
  assert.equal(canConfirm(SECTIONS, v, { no_linkedin: true }), false);
});

test("the body carries every edit and every tickbox as a real boolean", () => {
  const v = { ...reviewValues(SECTIONS), phone: " (512) 555-0147 ", work_authorized_us: true, postal_code: "78701" };
  const body = reviewBody(SECTIONS, v, { no_linkedin: false });
  assert.equal(body.phone, "(512) 555-0147");
  assert.equal(body.postal_code, "78701");
  assert.equal(body.no_linkedin, false);
  const optedOut = reviewBody(SECTIONS, { ...v, linkedin_url: "x" }, { no_linkedin: true });
  assert.equal(optedOut.no_linkedin, true);
  assert.ok(!("linkedin_url" in optedOut));
});

test("whatever the server still found blank is named back", () => {
  assert.deepEqual(stillBlank({ missing: [{ key: "school" }], incomplete: ["phone"] }), ["school", "phone"]);
  assert.deepEqual(stillBlank(null), []);
});

test("a first run in Tap is held for the review too", () => {
  assert.ok(TAP_BLOCKING_CHECKS.includes("review"));
});
