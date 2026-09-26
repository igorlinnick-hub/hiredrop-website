// The Stop invariant, tested without a browser: node --test tests/campaign-stop-order.test.ts
//
// What this protects: the extension is the only thing that actually applies, so it must be
// halted FIRST and its halt must never depend on the backend call succeeding. Four Stop
// buttons had it the other way round and a backend error kept a run alive for 63 minutes
// (09-24, 20:57 → 22:00). Comments do not stop regressions; this does.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { stopCampaignEverywhere } from "../lib/campaign/stop.ts";

test("the extension is halted BEFORE the server is told", async () => {
  const calls: string[] = [];
  await stopCampaignEverywhere(
    () => { calls.push("extension"); },
    async () => { calls.push("server"); },
  );
  assert.deepEqual(calls, ["extension", "server"]);
});

test("a failing server call still leaves the extension halted", async () => {
  const calls: string[] = [];
  const out = await stopCampaignEverywhere(
    () => { calls.push("extension"); },
    async () => { throw new Error("401 token expired"); },
  );
  assert.deepEqual(calls, ["extension"], "the halt must have happened");
  assert.equal(out.serverConfirmed, false);
  assert.equal(out.error, "401 token expired");
});

test("a non-Error rejection is still reported as text", async () => {
  const out = await stopCampaignEverywhere(
    () => {},
    async () => { throw "offline"; },
  );
  assert.equal(out.serverConfirmed, false);
  assert.equal(out.error, "offline");
});

test("a dead bridge that throws does not swallow the server call", async () => {
  // This is the path where the backend's should_run:false is the ONLY thing left that can
  // stop the engine, so skipping the server here would be the same bug mirrored.
  let toldServer = false;
  const out = await stopCampaignEverywhere(
    () => { throw new Error("context invalidated"); },
    async () => { toldServer = true; },
  );
  assert.equal(toldServer, true);
  assert.equal(out.serverConfirmed, true);
  assert.equal(out.error, null);
});

test("a confirmed stop reports no error", async () => {
  const out = await stopCampaignEverywhere(() => {}, async () => ({ ok: true }));
  assert.deepEqual(out, { serverConfirmed: true, error: null });
});
