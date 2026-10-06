// Settings saves only what the person edited — never the whole loaded snapshot.
// node --test tests/settings-patch.test.ts

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { profileFromRow, settingsPatch } from "../lib/settings/profile.ts";

const stale = profileFromRow(
  { name: "Alex", phone: "+1 555", school: "", salary_expectation: "", work_authorized_us: null },
  "a@b.co",
);
const loaded = { school: "", salary_expectation: "" };

test("a phone edit sends only the phone — answers given elsewhere survive", () => {
  // The screen still shows the old blanks for salary / school / work authorization;
  // they were answered on the dashboard after this page loaded.
  const patch = settingsPatch({ ...stale, phone: "+1 777" }, new Set(["phone"]), loaded);
  assert.deepEqual(patch, { phone: "+1 777" });
});

test("nothing touched → empty patch", () => {
  assert.deepEqual(settingsPatch(stale, new Set(), loaded), {});
});

test("dashboard-owned fields never leave Settings, even if marked", () => {
  const patch = settingsPatch(stale, new Set(["keywords", "location", "job_type", "platforms"]), loaded);
  assert.deepEqual(patch, {});
});

test("typing a school takes back the no-degree opt-out", () => {
  const patch = settingsPatch({ ...stale, school: "UT Austin" }, new Set(["school"]), loaded);
  assert.deepEqual(patch, { school: "UT Austin", no_degree: false });
});

test("a school merely loaded and unchanged keeps the opt-out", () => {
  const p = { ...stale, school: "UT Austin" };
  const patch = settingsPatch(p, new Set(["school"]), { school: "UT Austin", salary_expectation: "" });
  assert.deepEqual(patch, { school: "UT Austin" });
});

test("typing a salary takes back the no-salary opt-out", () => {
  const patch = settingsPatch({ ...stale, salary_expectation: "$90k" }, new Set(["salary_expectation"]), loaded);
  assert.deepEqual(patch, { salary_expectation: "$90k", no_salary_expectation: false });
});

test("a cleared yes/no answer is sent as null, not dropped", () => {
  const patch = settingsPatch({ ...stale, work_authorized_us: null }, new Set(["work_authorized_us"]), loaded);
  assert.deepEqual(patch, { work_authorized_us: null });
});

test("no row: email stays empty, job_type stays 'any'", () => {
  const p = profileFromRow(null, "a@b.co");
  assert.equal(p.email, "");
  assert.equal(p.job_type, "");
});
