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
