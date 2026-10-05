// node --test tests/shared-read.test.ts
//
// What this protects: dashboard panels polling /campaign/status on their own
// clocks must share one request — but never share across sessions, never keep
// a stale answer past the age the caller allows, and never cache a failure.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createSharedRead } from "../lib/campaign/shared-read.ts";

function harness() {
  let clock = 0;
  const calls: string[] = [];
  const pending: Array<{ resolve: (v: string) => void; reject: (e: Error) => void }> = [];
  const read = createSharedRead<string>(
    (token) => {
      calls.push(token);
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    },
    () => clock,
  );
  return { read, calls, pending, tick: (ms: number) => { clock += ms; } };
}

test("callers at the same moment share one request", async () => {
  const h = harness();
  const a = h.read("t1", 4000);
  const b = h.read("t1", 4000);
  assert.equal(h.calls.length, 1);
  h.pending[0].resolve("running");
  assert.deepEqual(await Promise.all([a, b]), ["running", "running"]);
});

test("a fresh answer is reused; an old one is fetched again", async () => {
  const h = harness();
  const first = h.read("t1", 4000);
  h.pending[0].resolve("v1");
  await first;
  h.tick(3000);
  assert.equal(await h.read("t1", 4000), "v1");
  assert.equal(h.calls.length, 1, "3 s old is fresh enough");
  h.tick(2000);
  const again = h.read("t1", 4000);
  assert.equal(h.calls.length, 2, "5 s old is not");
  h.pending[1].resolve("v2");
  assert.equal(await again, "v2");
});

test("maxAgeMs 0 always asks (after Start/Stop)", async () => {
  const h = harness();
  const first = h.read("t1", 4000);
  h.pending[0].resolve("stopped");
  await first;
  const forced = h.read("t1", 0);
  assert.equal(h.calls.length, 2, "same millisecond, still asks");
  const forcedAgain = h.read("t1", 0);
  assert.equal(h.calls.length, 3, "and does not join a request sent before the click");
  h.pending[2].resolve("running");
  await forcedAgain;
  h.pending[1].resolve("running");
  assert.equal(await forced, "running");
});

test("another session never gets this one's answer", async () => {
  const h = harness();
  const first = h.read("alice", 4000);
  h.pending[0].resolve("alice-running");
  await first;
  const bob = h.read("bob", 4000);
  assert.deepEqual(h.calls, ["alice", "bob"]);
  h.pending[1].resolve("bob-idle");
  assert.equal(await bob, "bob-idle");
});

test("a failure reaches every waiter and is not cached", async () => {
  const h = harness();
  const a = h.read("t1", 4000);
  const b = h.read("t1", 4000);
  h.pending[0].reject(new Error("502"));
  await assert.rejects(a, /502/);
  await assert.rejects(b, /502/);
  const retry = h.read("t1", 4000);
  assert.equal(h.calls.length, 2, "the next caller asks again");
  h.pending[1].resolve("ok");
  assert.equal(await retry, "ok");
});

test("an older answer that lands late does not replace a newer one", async () => {
  const h = harness();
  const old = h.read("t1", 4000);     // sent before the click
  const fresh = h.read("t1", 0);      // sent after it
  h.pending[1].resolve("running");    // the fresh one lands first
  await fresh;
  h.pending[0].resolve("stopped");    // then the stale one
  await old;
  assert.equal(await h.read("t1", 4000), "running");
  assert.equal(h.calls.length, 2);
});
