import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees (gitignored) — full checkouts with their own .next builds;
    // linting them buried the real 25 findings under ~15,000 from copies.
    ".claude/**",
    // maplibre's minified worker, copied from node_modules (scripts/maplibre-worker.mjs).
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
