// Daily auto-start labels, tested without a browser: node --test tests/auto-daily.test.ts
//
// What this protects: the row under Start shows ONLY what the extension reports. A reply
// that isn't a HIREDROP_AUTO_DAILY with ok:true is not state, and "next run" is a window
// until the extension has picked that day's jitter.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { clockLabel, hourLabel, nextRunLabel, parseAutoDailyReply, todayLabel } from "../lib/campaign/auto-daily.ts";

const at = (h: number, m = 0, day = 6) => new Date(2026, 9, day, h, m).getTime();

test("hour labels", () => {
  assert.equal(hourLabel(0), "12 AM");
  assert.equal(hourLabel(9), "9 AM");
  assert.equal(hourLabel(12), "12 PM");
  assert.equal(hourLabel(20), "8 PM");
  assert.equal(clockLabel(at(9, 5)), "9:05 AM");
});

test("only a real HIREDROP_AUTO_DAILY ok-reply is state", () => {
  assert.equal(parseAutoDailyReply({ type: "HIREDROP_AUTO_DAILY", ok: false, error: "context_invalidated" }), null);
  assert.equal(parseAutoDailyReply({ type: "HIREDROP_PILL_EVERYWHERE", ok: true, enabled: true, hour: 9 }), null);
  assert.equal(parseAutoDailyReply({ type: "HIREDROP_AUTO_DAILY", ok: true }), null);
  const s = parseAutoDailyReply({ type: "HIREDROP_AUTO_DAILY", ok: true, enabled: true, hour: 9, nextRun: null, today: null, lastLaunch: null });
  assert.equal(s?.enabled, true);
  assert.equal(s?.hour, 9);
  assert.equal(s?.maxHour, 20);
});

test("next run: today's exact time, tomorrow's window, starting now", () => {
  const now = at(8);
  assert.equal(nextRunLabel({ earliest: at(9, 23), latest: at(9, 23), exact: true, day: "today" }, now), "Next run: today at 9:23 AM");
  assert.equal(
    nextRunLabel({ earliest: at(9, 0, 7), latest: at(9, 40, 7), exact: false, day: "tomorrow" }, now),
    "Next run: tomorrow, 9:00–9:40 AM",
  );
  assert.equal(nextRunLabel({ earliest: now, latest: now, exact: true, day: "today" }, now), "Next run: starting now");
  assert.equal(nextRunLabel(null, now), null);
});

test("today line says what happened, and stays quiet when nothing did", () => {
  assert.equal(todayLabel(null), null);
  assert.equal(todayLabel({ day: "d", status: "pending", reason: null, message: "", at: null }), null);
  assert.deepEqual(todayLabel({ day: "d", status: "starting", reason: null, message: "Starting now…", at: null }),
    { text: "Today: starting your run now…", href: null });
  assert.deepEqual(todayLabel({ day: "d", status: "started", reason: null, message: "", at: at(9, 23) }),
    { text: "Today: started at 9:23 AM.", href: null });
  assert.equal(todayLabel({ day: "d", status: "skipped", reason: "set_after_time", message: "x", at: null }), null);
  assert.deepEqual(
    todayLabel({ day: "d", status: "skipped", reason: "cap_reached", message: "Skipped today — the daily limit was already reached (30/30).", at: null }),
    { text: "Skipped today — the daily limit was already reached (30/30).", href: null },
  );
});

test("a refusal is one sentence ending in a period, with a link to where it's fixed", () => {
  assert.deepEqual(
    todayLabel({ day: "d", status: "refused", reason: "employer_answers_missing",
      message: "Some questions employers ask aren't answered yet — open HireDrop to fix it.", at: null }),
    { text: "Didn't start today: Some questions employers ask aren't answered yet.", href: "/dashboard/settings?tab=forms" },
  );
  assert.deepEqual(
    todayLabel({ day: "d", status: "refused", reason: "free_limit_reached", message: "You've used all 40 free applications", at: null }),
    { text: "Didn't start today: You've used all 40 free applications.", href: "/dashboard/settings?tab=billing" },
  );
  // Unknown reason: no guessed link.
  assert.equal(todayLabel({ day: "d", status: "failed", reason: "status_unreachable", message: "Couldn't reach HireDrop", at: null })?.href, null);
});

test("no last launch is said once (by the row), not twice", () => {
  assert.equal(
    todayLabel({ day: "d", status: "skipped", reason: "no_last_launch", message: "No previous launch to repeat yet — start once from the dashboard.", at: null }),
    null,
  );
});
