// maplibre-gl v6 can't find its own tile worker once Next bundles it, so the
// dashboard map stayed blank (no tiles, no radius ring) until 10-07. We serve
// the worker from public/maplibre/ (scripts/maplibre-worker.mjs) and point
// RadiusMap at it. This keeps the copy complete and the URL pointing at it.
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

test("RadiusMap points maplibre at the copied worker before creating the map", () => {
  const src = readFileSync("components/dashboard/RadiusMap.tsx", "utf8");
  const set = src.match(/maplibregl\.setWorkerUrl\("([^"]+)"\)/);
  assert.ok(set, "RadiusMap never calls maplibregl.setWorkerUrl");
  assert.equal(set[1], `/maplibre/${WORKER}`);
  assert.ok(set.index! < src.indexOf("new maplibregl.Map("), "setWorkerUrl must run before the Map is created");
});
