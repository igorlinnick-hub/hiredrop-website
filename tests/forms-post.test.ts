// A <form> without method="post" is a GET. Submitted before the page's JS has
// loaded (autofill + Enter on a slow phone), it navigates to
// /login?email=…&password=… — the password sits in the address bar, the
// browser history and the server's request log. Seen on prod 10-06.
//
// Every form on the site posts; this keeps a new one from forgetting.
//   node --test tests/forms-post.test.ts

import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

test("every <form> posts", () => {
  const offenders: string[] = [];
  let forms = 0;
  for (const file of [...tsxFiles("app"), ...tsxFiles("components")]) {
    for (const tag of readFileSync(file, "utf8").match(/<form\b[^>]*>/g) ?? []) {
      forms++;
      if (!/\bmethod="post"/.test(tag)) offenders.push(`${file}: ${tag}`);
    }
  }
  assert.ok(forms > 0, "found no forms — the scan is looking in the wrong place");
  assert.deepEqual(offenders, []);
});
