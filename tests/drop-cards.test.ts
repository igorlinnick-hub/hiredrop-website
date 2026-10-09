// Drop's chat: the answer stream, the cards a person presses, and how failures read.
// node --test tests/drop-cards.test.ts

import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";

import { ApiError, apiDelete, apiPost } from "../lib/api.ts";
import { describeFailure } from "../lib/apiFailure.ts";
import { cardDestination, runSteps, withAnswer, type CardMethod } from "../lib/drop/cards.ts";
import { DropError, readDropStream, type DropProposal } from "../lib/drop/stream.ts";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

const CARD = {
  id: "p_0a1b2c3d",
  kind: "remember_answer",
  title: "Remember this for every application?",
  lines: ["Relocation plans: Moving to San Diego in December"],
  confirm: "Save",
  steps: [{ method: "POST", path: "/profile/facts", body: { question: "Relocation plans", answer: "Yes", source: "drop" } }],
  navigate: null,
  note: "",
  done: "Saved. I'll use it on every application.",
};

test("the stream yields text, cards and the turn id; a last line without a newline still counts", async () => {
  const states: string[] = [];
  const cards: DropProposal[] = [];
  let streamed = "";
  const reply = await readDropStream(
    streamOf(
      '{"type":"state","state":"checking"}\n{"type":"text","text":"Sure, "}\n',
      '{"type":"text","text":"here it is."}\n{"type":"proposal","proposal":' + JSON.stringify(CARD) + "}\n",
      '{"type":"done","turn_id":"0123456789abcdef0123456789abcdef"}',
    ),
    { onState: (s) => states.push(s), onText: (d) => { streamed += d; }, onProposal: (c) => cards.push(c) },
  );
  assert.deepEqual(states, ["checking"]);
  assert.equal(streamed, "Sure, here it is.");
  assert.equal(reply.text, "Sure, here it is.");
  assert.equal(reply.turnId, "0123456789abcdef0123456789abcdef");
  assert.equal(cards.length, 1);
  assert.equal(cards[0].confirm, "Save");
  assert.deepEqual(cards[0].steps, CARD.steps);
});

test("an event split across chunks is read whole", async () => {
  let text = "";
  await readDropStream(streamOf('{"type":"te', 'xt","text":"hi"}\n'), { onText: (d) => { text += d; } });
  assert.equal(text, "hi");
});

test("an error event throws Drop's sentence with its turn id", async () => {
  await assert.rejects(
    readDropStream(streamOf('{"type":"error","message":"Something broke on my side.","turn_id":"ffffffffffffffffffffffffffffffff"}')),
    (e: unknown) => e instanceof DropError && e.message === "Something broke on my side." && e.turnId === "ffffffffffffffffffffffffffffffff",
  );
});

test("a malformed card is not drawn", async () => {
  const cards: DropProposal[] = [];
  await readDropStream(streamOf('{"type":"proposal","proposal":{"id":"p_1","title":""}}\n'), { onProposal: (c) => cards.push(c) });
  assert.equal(cards.length, 0);
});

test("steps run in order and stop at the first failure", async () => {
  const calls: string[] = [];
  const call = async (m: CardMethod, p: string) => {
    calls.push(`${m} ${p}`);
    if (p === "/profile/ats/generate") throw new ApiError(429, "Daily AI builds used up.");
  };
  await assert.rejects(
    runSteps(
      [
        { method: "POST", path: "/profile/ats/generate", body: {} },
        { method: "POST", path: "/profile/resume/default", body: { choice: "ats" } },
      ],
      call,
    ),
  );
  assert.deepEqual(calls, ["POST /profile/ats/generate"]);
});

test("a step outside the API is refused before anything runs", async () => {
  for (const bad of [
    { method: "POST", path: "//evil.example/x", body: null },
    { method: "POST", path: "https://evil.example/x", body: null },
    { method: "POST", path: "/profile/../admin", body: null },
    { method: "TRACE", path: "/profile/facts", body: null },
  ]) {
    let called = false;
    await assert.rejects(runSteps([{ method: "GET", path: "/profile/facts", body: null }, bad], async () => { called = true; }));
    assert.equal(called, false, bad.path);
  }
});

test("a card only navigates inside the dashboard", () => {
  assert.equal(cardDestination("/dashboard/history?app=abc"), "/dashboard/history?app=abc");
  assert.equal(cardDestination("https://evil.example"), null);
  assert.equal(cardDestination("//evil.example/dashboard"), null);
  assert.equal(cardDestination("/dashboardx"), null);
  assert.equal(cardDestination(null), null);
});

test("picking an option re-sends the same card with that answer", () => {
  const card = withAnswer(CARD, "No");
  assert.deepEqual(card.steps[0].body, { question: "Relocation plans", answer: "No", source: "drop" });
  assert.equal((CARD.steps[0].body as { answer: string }).answer, "Yes");
});

test("failures read as sentences; the employer's choices come back as options", () => {
  const pick = describeFailure(new ApiError(400, "pick_an_option", { error: "pick_an_option", options: ["Yes", "No"] }));
  assert.deepEqual(pick.options, ["Yes", "No"]);
  assert.match(describeFailure(new ApiError(503, "facts_not_ready", "facts_not_ready")).message, /isn't switched on yet/);
  assert.match(describeFailure(new ApiError(400, "some_code")).message, /didn't go through/);
  assert.equal(describeFailure(new ApiError(429, "Daily AI builds used up.")).message, "Daily AI builds used up.");
  assert.match(describeFailure(new TypeError("Failed to fetch")).message, /Couldn't reach the server/);
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("API errors keep a structured detail, and DELETE sends no body", async () => {
  const seen: RequestInit[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    seen.push(init);
    if (init.method === "POST") {
      return new Response(JSON.stringify({ detail: { error: "pick_an_option", options: ["Yes", "No"] } }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, facts: [] }), { status: 200 });
  }) as typeof fetch;

  await assert.rejects(apiPost("/profile/facts", "t", { question: "q", answer: "maybe" }), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.message, "pick_an_option");
    assert.deepEqual(e.detail, { error: "pick_an_option", options: ["Yes", "No"] });
    return true;
  });
  assert.deepEqual(await apiDelete("/profile/facts/f_00000000", "t"), { ok: true, facts: [] });
  assert.equal(seen[1].method, "DELETE");
  assert.equal(seen[1].body, undefined);
  assert.equal((seen[1].headers as Record<string, string>).Authorization, "Bearer t");
});
