// RadiusMap loads maplibre's tile worker from public/maplibre/, which
// scripts/maplibre-worker.mjs fills from the installed package. A copy that
// misses a chunk the worker imports leaves the map without tiles.
//   node --test tests/maplibre-worker.test.ts

import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { copyWorker, WORKER } from "../scripts/maplibre-worker.mjs";

test("the copy carries the worker and every chunk it imports", () => {
  const out = mkdtempSync(join(tmpdir(), "maplibre-worker-"));
  try {
    const files = copyWorker(out);
    assert.ok(files.includes(WORKER));
    // The worker imports its code from a shared chunk; without it the worker
    // loads and dies on the import.
    assert.ok(files.includes("maplibre-gl-shared.mjs"), `copied only ${files.join(", ")}`);
    for (const name of files) {
      const src = readFileSync(join(out, name), "utf8");
      for (const [, rel] of src.matchAll(/\b(?:from|import)\s*\(?\s*["'`]\.\/([^"'`]+)["'`]/g)) {
        assert.ok(existsSync(join(out, rel)), `${name} imports ./${rel}, which was not copied`);
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
