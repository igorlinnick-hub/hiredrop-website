// "Let Drop finish it" on a hand-back row, tested without a browser:
//   node --test tests/finish-handback.test.ts
//
// What this protects: the button is offered only on the forms the extension can reopen,
// and every answer the extension can give lands on fixed wording. An answer the page
// didn't know used to read as "the extension didn't answer" (free limit, unsupported).

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { FINISH_REFUSAL, finishAnswerState, finishable } from "../components/dashboard/useFinishHandback.ts";

const row = (url: string, platform: string) => ({
  id: "h", job_title: "T", company: "C", url, platform, reason: "", steps_done: 0,
}) as Parameters<typeof finishable>[0];

test("only Greenhouse, Lever and Ashby forms on their own hosts", () => {
  assert.equal(finishable(row("https://job-boards.greenhouse.io/acme/jobs/1", "greenhouse")), true);
  assert.equal(finishable(row("https://jobs.lever.co/acme/1/apply", "lever")), true);
  assert.equal(finishable(row("https://jobs.ashbyhq.com/acme/1/application", "ashby")), true);
  assert.equal(finishable(row("https://careers.acme.com/jobs?gh_jid=1", "greenhouse")), false);
  assert.equal(finishable(row("https://www.indeed.com/viewjob?jk=1", "indeed")), false);
  assert.equal(finishable(row("http://job-boards.greenhouse.io/acme/jobs/1", "greenhouse")), false);
  assert.equal(finishable(row("not a url", "greenhouse")), false);
});

test("every refusal the extension sends has its own words", () => {
  for (const error of ["busy", "daily_limit", "free_limit", "unsupported"]) {
    const state = finishAnswerState({ ok: false, error });
    assert.equal(state, error);
    assert.ok(FINISH_REFUSAL[state], `no wording for ${error}`);
  }
});

test("a start is filling; a reloaded or unknown extension reads as no answer", () => {
  assert.equal(finishAnswerState({ ok: true, error: null }), "filling");
  assert.equal(FINISH_REFUSAL.filling, undefined);
  assert.equal(finishAnswerState({ ok: false, error: "context_invalidated" }), "no_extension");
  assert.equal(finishAnswerState({ ok: false, error: "something new" }), "no_extension");
});
