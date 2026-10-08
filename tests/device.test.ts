// Phone or tablet? — node --test tests/device.test.ts
//
// Onboarding's Connect step waits for the Chrome extension, which a phone can
// never run. This rule decides who gets "Finish on your computer" instead of a
// Continue button that never lights up — and the dashboard's hand-off banner
// asks the same question, so a miss here strands someone in both places.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isPhoneOrTablet } from "../lib/device.ts";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPAD_OLD =
  "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1";
// iPadOS 13+ Safari asks for the desktop site: its UA is a Mac's, word for word.
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const WIN_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("phones are phones, whatever the browser", () => {
  assert.equal(isPhoneOrTablet(IPHONE, 5), true);
  assert.equal(isPhoneOrTablet(IPHONE_CHROME, 5), true);
  assert.equal(isPhoneOrTablet(ANDROID, 5), true);
});

test("tablets count too: none of them runs a Chrome extension", () => {
  assert.equal(isPhoneOrTablet(ANDROID_TABLET, 10), true);
  assert.equal(isPhoneOrTablet(IPAD_OLD, 5), true);
});

test("an iPad posing as a Mac is caught by its touch points", () => {
  assert.equal(isPhoneOrTablet(MAC_SAFARI, 5), true);
});

test("a real computer is not, so its Connect step stays exactly as it was", () => {
  assert.equal(isPhoneOrTablet(MAC_SAFARI, 0), false);
  assert.equal(isPhoneOrTablet(MAC_CHROME, 0), false);
  assert.equal(isPhoneOrTablet(WIN_CHROME, 0), false);
  // A Windows touchscreen laptop runs Chrome extensions fine.
  assert.equal(isPhoneOrTablet(WIN_CHROME, 10), false);
});

test("an empty user agent is treated as a computer", () => {
  assert.equal(isPhoneOrTablet("", 0), false);
});
