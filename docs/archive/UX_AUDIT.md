# HireDrop Web App — New-User E2E UX Audit

_Started 2026-07-10. Method: fresh browser (Playwright), no prior session, walk the intended new-user journey clicking everything, note every visual glitch / broken control / confusing copy / dead end / console error. Then fix by these notes and re-verify._

## Intended client journey (the chain we test against)

1. **Landing** (`/`) — hero, how-it-works, pricing/CTA. Buttons: primary CTA → signup; nav links; footer links.
2. **Sign up** (`/signup`) — email/password (or Google). Email confirm if required. → onboarding.
3. **Onboarding wizard** — job preferences (keywords, location, job type), resume upload + ATS check, writing style, reassurance, done/payoff. Every Next/Back/Edit/Skip.
4. **Dashboard** (`/dashboard`) — Quick Actions (keywords, location, job-type, auto-apply radio, connect buttons, Find Jobs, Start Campaign), Platform Connections panel, stats cards, jobs table, usage/tier banner, ATS panel.
5. **Connect platforms** — each Log in / Sign up button opens the right URL.
6. **Campaign** (`/dashboard/campaign`) — live view, Watch Live, Stop.
7. **Settings** (`/settings`) — profile, resume, preferences.
8. **Extension** (`/extension`) — install/connect flow.

## Findings

_(id | severity | location | what's wrong | expected)_

### Landing (`/`) — audited 2026-07-10, mostly clean
- **L1 | info | stats band** — "0+ / 0 / 0x" at rest; count-up animates to "2,400+ / 50 / 3x" on scroll into view. Fine for scrolling users. Low risk only if the band is already in viewport on a very short screen. No fix needed.
- **L2 | note | stats "50 Max apps/day"** — matches extension cap, but 50/day reads aggressive vs the "ban-safe / human-paced" positioning in the hero. Copy/strategy review, not a bug.
- **L3 | ok | footer + nav links** — /faq /affiliate /privacy /terms /login /signup all 200; /extension 307 (redirect, expected); anchor links present. No dead (`href="#"`) links.
- **L4 | ok | how-it-works** — tall sticky-scroll section (2928px); renders as whitespace in a full-page screenshot but reveals per-step on scroll. Not broken.

### Signup / onboarding / dashboard — BLOCKED this pass
- Playwright MCP drives the SAME Chrome as the live campaign + is already logged in, so (a) it disrupted the running ZR campaign window, and (b) `/signup` redirects to `/dashboard` (existing session) → can't test a fresh new-user journey. Must be done in a separate logged-out pass, not concurrently with a campaign.

## Fixes applied

<!-- filled after -->
