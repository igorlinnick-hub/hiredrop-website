<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Google sign-in — do not undo (verified brand, 2026-09-30)

Google's consent screen says **HireDrop** with our logo because the brand is verified. That holds only while:

- Google sign-in goes through `components/auth/GoogleButton.tsx` (Google Identity Services → `signInWithIdToken` → `/auth/finish`). Never call `supabase.auth.signInWithOAuth({ provider: "google" })`: it redirects through `msxjcjzmfruizbgkssxo.supabase.co`, which needs that domain back on the consent screen — the screen then reads "Sign in to msxjcjzmfruizbgkssxo.supabase.co" (users took it for a scam) and verification is lost.
- Post-login work (attribution, landing page, sign-up conversion) lives in `lib/auth/finish-login.ts`, shared by `/auth/callback` and `/auth/finish`. Change it there, not in one route.
- The footer's **About HireDrop** block and `/privacy` §9 "Signing In With Google" stay accurate. Google rejected verification once without the footer statement ("AI NCII"). If the product starts handling images of people or asks Google for more scopes, update both first.
- A new site domain or local port must be added to Authorized JavaScript origins of OAuth client "JobFlow 1" (GCP `jobflow-491621`) and to `GIS_ORIGINS`. Vercel previews intentionally have no Google button.

Checklist with commands: `SAAS_PLAYBOOK.md` (workspace root), sections 2 and 3.

## Code standards

Every diff, by the author, the review agents and CI. Sources: [google/eng-practices](https://google.github.io/eng-practices/review/reviewer/looking-for.html) (review standard, comments, CL descriptions), the [Google Python style guide](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) (comments, TODOs), react.dev [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies). The same section lives in `jobflow/CLAUDE.md`; change both.

1. **Fix the cause, not the symptom.** Find where the wrong value is produced and fix it there. A guard at the place it shows up is a stopgap, allowed only in an emergency: its own PR titled `stopgap:`, plus an issue for the real fix. Example: an endpoint that overwrites fields the caller did not send is fixed in the endpoint, not by making every caller resend them.
2. **Comments say why the code is the way it is now.** Not what it does (the code says that), not how it got here. Dates, PR or issue numbers, names, chat quotes, "reproduced on prod", "used to" go in the commit message and PR description, where `git blame` leads. A comment that only makes sense to someone who knew the old code is history: delete it. English only. CI: `local/no-history-comments`.
3. **No silent failures.** A `catch` / `except` handles the error (a recovery the user can see, a retry), re-raises it, or reports it. Ignoring is allowed only for an expected, harmless failure, and the block names it: `catch { /* private mode: the snapshot is optional */ }`. CI: `no-empty`; ruff `S110`.
4. **Lint suppressions name the rule and the reason**: `// eslint-disable-next-line <rule> -- <why>`, `# noqa: <CODE>`. No new `react-hooks/exhaustive-deps` suppressions: restructure instead (`useEffectEvent`, move the logic out of the effect). CI: `eslint-comments/require-description`.
5. **The diff is as wide as the bug.** No drive-by refactors, renames or copy edits in a fix. User-facing wording is a product decision: show Igor "before → after" first.
6. **One rule, one place.** Logic needed twice moves into a shared function or hook. A "same as X" comment over a copy is a duplicate.
7. **Tests check behavior**: call the function, render the component, hit the endpoint. A regex over source files ("setWorkerUrl appears before new Map") passes on real bugs and fails on harmless refactors. A repo-wide scan is fine as a contract over data (every Settings link names a real section).
8. **No TODO / FIXME / HACK in code.** Open an issue. No commented-out code. CI: `no-warning-comments`; ruff `ERA001`.
9. **The PR is the record.** Title: what changes, with a Conventional Commits prefix (`fix:`, `feat:`, `chore:`). Body: root cause → fix → how it was verified (commands, screenshots) → blast radius. History lives here.

**Review.** Approve when the diff leaves the code healthier overall, even if not perfect ([standard of code review](https://google.github.io/eng-practices/review/reviewer/standard.html)). A violation of 1–8 blocks the merge; it is not a style note.

**Old code.** Violations that predate a rule are frozen in `eslint-suppressions.json` (backend: the ratchet baseline). Do not rewrite old comments en masse. Leave what you touch compliant, then `npx eslint . --prune-suppressions` to lock in the gain.
