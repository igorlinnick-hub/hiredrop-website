// Settings opens one section at a time, picked by ?tab=<section>. A link with only
// an anchor (/dashboard/settings#billing) opens Account, with the anchor nowhere on
// screen. So every link into Settings names a real section, and an anchor rides with one.
//   node --test tests/settings-links.test.ts

import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

const view = readFileSync("components/dashboard/SettingsView.tsx", "utf8");
const sections = [...view.matchAll(/\{ id: "([a-z]+)", label:/g)].map((m) => m[1]);

test("every link into Settings opens a section that exists", () => {
  assert.ok(sections.includes("account") && sections.includes("billing"),
    `read the wrong section list from SettingsView: ${sections.join(", ")}`);
  const offenders: string[] = [];
  let links = 0;
  for (const file of [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]) {
    for (const [href] of readFileSync(file, "utf8").matchAll(/\/dashboard\/settings[?#][^"'`\s]*/g)) {
      links++;
      const url = new URL(href, "https://hiredrop.io");
      const tab = url.searchParams.get("tab");
      if (tab !== null && !sections.includes(tab)) offenders.push(`${file}: ${href} — no section "${tab}"`);
      if (url.hash && tab === null) offenders.push(`${file}: ${href} — an anchor without ?tab= lands on Account`);
    }
  }
  assert.ok(links > 0, "found no Settings links — the scan is looking in the wrong place");
  assert.deepEqual(offenders, []);
});
