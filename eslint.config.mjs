import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import local from "./eslint-rules/no-history-comments.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintComments.recommended,
  // Code standards (AGENTS.md). Violations that predate a rule live in
  // eslint-suppressions.json; CI fails only on new ones.
  {
    plugins: { local },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "xxx"] }],
      "local/no-history-comments": "error",
    },
  },
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
