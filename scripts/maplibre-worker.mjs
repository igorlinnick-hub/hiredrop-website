// Copies maplibre-gl's tile worker out of the INSTALLED package into
// public/maplibre/, where RadiusMap points maplibregl.setWorkerUrl().
//
// Why: v6 no longer inlines its worker (v4 did, as a blob). It derives the
// worker URL from import.meta.url, which Next's bundler rewrites to a non-http
// string, so maplibre falls back to "" and `new Worker("")` loads the page
// itself — the dashboard map stayed blank, no tiles and no radius ring, from
// the 4 → 6 upgrade (#222) until 10-07.
//
// Runs on postinstall, predev and prebuild, so the copy always matches the
// main-thread code that got bundled: the chunks import each other by minified
// names, and a worker from another version breaks. The output is gitignored
// for the same reason — a committed copy would go stale on the next bump.
//   node scripts/maplibre-worker.mjs

import { copyFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WORKER = "maplibre-gl-worker.mjs";
export const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre");

export function maplibreDist() {
  return join(dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
}

// The worker plus every chunk it reaches through relative imports (today just
// maplibre-gl-shared.mjs) — followed, not listed, so a re-split chunk is never
// left behind.
export function workerFiles(distDir, entry = WORKER) {
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const src = readFileSync(join(distDir, name), "utf8");
    for (const [, rel] of src.matchAll(/\b(?:from|import)\s*\(?\s*["'`]\.\/([^"'`]+)["'`]/g)) visit(rel);
  };
  visit(entry);
  return [...seen];
}

export function copyWorker(outDir = OUT_DIR, distDir = maplibreDist()) {
  mkdirSync(outDir, { recursive: true });
  const files = workerFiles(distDir);
  for (const name of files) copyFileSync(join(distDir, name), join(outDir, name));
  return files;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`maplibre worker → public/maplibre: ${copyWorker().join(", ")}`);
}
