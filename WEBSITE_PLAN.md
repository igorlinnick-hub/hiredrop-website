# HireDrop Website — content + identity plan

Goal: make the marketing site tell the TRUE, ban-safe story — no killed/nonexistent
features — and add tasteful illustration identity without overloading the page.

---

## 1. Product reality snapshot (what's real, as of now)

Verified against code — the site must only claim these.

**✅ Real, sellable features**
- **Ban-safe auto-apply** — applies from the user's own browser, human pace (Indeed + ZipRecruiter).
- **Apply Modes** (Fit Engine) — Broad / Standard / Precise. Choose how selective the AI is:
  - Broad — "Explore the market" (score ≥ 35)
  - Standard — "Focused by specialty" (score ≥ 55) — default
  - Precise — "Only the best match" (score ≥ 70; describe your ideal role)
  This is a REAL differentiator = precision/selectivity, the opposite of spam.
- **Semi-auto review-before-send** by default (+ full-auto opt-in).
- **AI cover letters** — in your voice (Sonnet), per role.
- **AI job-fit judging** — scores each listing before applying.
- **ATS resume optimization** — tailor + format to pass ATS screeners.
- **Complex ATS filler** — Workday / Greenhouse / Lever multi-step forms (Loop4).
- **Human-paced daily limits** — tiers 10 / 50 / 200 (protect the account).
- **Dashboard** — jobs, campaign, application history, usage, setup checklist, platform connect.
- **Billing** (Stripe) · **Promo codes** (Elite grant).

**❌ KILLED / NONEXISTENT — must NOT appear anywhere on the site**
- Email / inbox monitoring, response tracking → killed (see project_product_strategy).
- SMS notifications → don't exist.
- Response-rate / vanity stats → killed.
- RemoteOK / Wellfound as apply platforms → dropped (discovery-only, removed from product).
- "50/day autopilot", "apply while you sleep" → volume framing we abandoned.

---

## 2. Page-by-page audit + status

| Section | Status | Action |
|---|---|---|
| Hero | ✅ done | Ban-safe copy live |
| Features | ✅ done | Rewritten to 6 real ban-safe features |
| HowItWorks (chips, step 4) | ✅ done | Indeed/ZipRecruiter/Company ATS |
| AIProcess, extension, login copy | ✅ done | Volume framing removed |
| settings default platform | ✅ done | remoteok → indeed |
| **Ticker** | ⬜ check | Ensure platform names = Indeed/ZipRecruiter/ATS, no RemoteOK/Wellfound |
| **ChromeExtensionDemo** | ⬜ check | Scan for volume / killed features |
| **StatsCounter** | ⬜ check | Remove any fabricated stat; keep only true numbers |
| **Pricing** | ❌ TODO | Remove SMS/Email-monitoring perks + RemoteOK/Wellfound; reframe limits as SAFETY; add Apply Modes; confirm prices |
| **FAQ (landing + /faq)** | ❌ TODO | Fix platforms (Indeed/ZipRecruiter/ATS), drop "50/day" volume, add ban-safe + modes Q&A |
| **privacy** | ⚠️ needs OK | Legal doc lists RemoteOK/Wellfound — update platform list; confirm before editing legal copy |

---

## 3. New: surface "Apply Modes" (real differentiator)

Add ONE compact section (or a Features highlight) explaining Broad/Standard/Precise —
"you choose how selective the agent is." Reinforces ban-safe / quality-not-spam and
is a genuine feature competitors don't have. Keep it to 3 cards, no jargon.

---

## 4. Illustration identity on the site (dosed — do NOT overload)

Rule: **max 2 illustrated moments on the marketing page.** Everything else stays
icon-based. The human scenes are premium; overuse cheapens them.

- **One scene "How it works" strip** — 3 scenes: Search → Apply → Safe, with one-line
  captions. This is the identity's home on the site.
- **One scene in the final CTA** (GradientCTA) — e.g. `welcome`, as a warm closer.
- Onboarding = small step icons (done). Signup = auto-fill animation (done).
- Keep `IllustrationSafe/Tailored/Send/Launch` SVGs for small spots (empty states, etc.).

Dashboard empty states (secondary): a `search` scene on "no jobs yet", a `setup`
scene on the setup checklist — light, functional.

---

## 5. Priority order

1. **Content accuracy** — Pricing + FAQ (correctness first; we're selling what's real).
2. **Apply Modes** section (real differentiator, on-strategy).
3. **Scene strip** + CTA scene (tasteful identity).
4. **privacy** platform list (with sign-off).
5. Dashboard empty-state scenes (nice-to-have).

## Open decisions (need Igor)
- [ ] Pricing: keep current prices or new? Tiers are 10 / 50 / 200 apps/day (real).
- [ ] privacy: OK to update the platform list (remove RemoteOK/Wellfound)?
- [ ] Two-session coordination: parallel session also edits the site — split files to avoid clashes.
