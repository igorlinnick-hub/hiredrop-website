# Billing ledger — backend tasks

The dashboard now renders **stubbed** credit math:

- `lib/pricing.ts` — placeholder cost estimates (source/LLM/submit) and the
  `estimateCost(...)` helper used by `CreditCalculator`.
- `components/dashboard/SpendCurve.tsx` — uses a synthetic 30-day series
  (`buildStub`) when no `points` prop is supplied.

To make these numbers real (and to support a usage-based pricing pivot away
from the current free/pro/elite flat tiers), wire up the items below.

---

## 1. Schema — `usage_ledger` table

One row per billable event. Keep it atomic so re-aggregation is cheap.

```sql
create table public.usage_ledger (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  action        text not null,           -- 'source.fetch' | 'llm.scoring' | 'llm.cover_letter' | 'submit'
  vendor        text not null,           -- 'greenhouse' | 'serpapi' | 'anthropic' | 'theirstack' | 'internal'
  job_id        uuid null references public.jobs(id) on delete set null,
  application_id uuid null references public.applications(id) on delete set null,
  cost_credits  integer not null,        -- internal cost in credits (1 credit = 1 cent)
  price_credits integer not null,        -- user-facing price charged for this event
  meta          jsonb not null default '{}'::jsonb
);
create index usage_ledger_user_day on public.usage_ledger (user_id, occurred_at);
create index usage_ledger_action on public.usage_ledger (action);
```

Why `cost` and `price` both: cost is what *we* paid the vendor, price is what
the user is charged. The delta is margin — log both so finance can audit and so
we can adjust markup without re-emitting events.

---

## 2. Credit balance

```sql
alter table public.profiles
  add column credit_balance integer not null default 0,
  add column credit_lifetime integer not null default 0;
```

- `credit_balance` — current spendable (in credits = cents).
- `credit_lifetime` — total ever purchased; drives loyalty thresholds later.

Stripe webhook → top up `credit_balance`. Application flow → debit it. Use
a Postgres function with `SELECT ... FOR UPDATE` to avoid races.

---

## 3. Backend service: `app/services/billing.py`

Owns charge/debit logic. Existing usage tracking in
`app/db/usage.py` (cover-letter quota) and `app/db/subscriptions.py` (tier
limits) should be **replaced** by ledger reads, not kept in parallel.

Required functions:

- `record_event(user_id, action, vendor, cost_credits, price_credits, ...)`
  inserts a ledger row and debits `credit_balance` atomically.
- `get_balance(user_id) -> int`
- `get_spend_series(user_id, days=30) -> list[{day, spend_credits, applications}]`
  feeds `SpendCurve` via a new `/billing/spend` route.
- `estimate_price(action, vendor) -> int` returns the canonical price for an
  event so the frontend calculator stays in sync with the backend.

---

## 4. Routers

- `GET /billing/balance` — used by a balance pill in the dashboard nav.
- `GET /billing/spend?days=30` — feeds `SpendCurve`.
- `GET /billing/prices` — returns the same constants the frontend has in
  `lib/pricing.ts`, so we have a single source of truth (frontend should
  fetch this and cache for the session instead of duplicating).
- `POST /billing/topup` (Stripe checkout session creation).

---

## 5. Instrumentation — wire `record_event` into every billable call site

Search for places that emit a cost today and add a ledger write:

- `modules/ai_cover_letter.py` — after every Anthropic call. Use the response's
  `usage` block; convert tokens → cents via the per-model rate table.
- `modules/platforms/*.py` — source fetches. Free scrapers cost 0; paid ones
  (SerpAPI, TheirStack when added) record their per-call cost.
- The "submit to job" path in the extension/campaign — fixed `submit` charge.

Add a unit test asserting that creating one application produces ≥3 ledger
rows (source + scoring + cover + submit) summing to the expected price.

---

## 6. Frontend cleanup once ledger ships

- `lib/pricing.ts` keeps the calculator math but reads canonical numbers from
  `/billing/prices` instead of the hardcoded constants.
- `SpendCurve` takes `points` from `/billing/spend` instead of `buildStub`.
- `UsageBanner` becomes a balance pill ("You have $X.XX in credits") instead
  of a daily-quota progress bar.
- Decide what to do with the free/pro/elite tier UI in `lib/constants.ts` and
  `subscriptions.py` — recommend retiring tiers entirely and going pure
  pay-as-you-apply with bulk-credit discount packs.

---

## 7. Migration plan (rollout)

1. Ship ledger schema + `record_event` writes behind a feature flag, keep
   tier limits authoritative. Validates instrumentation without risk.
2. Backfill historical applications with synthetic ledger rows so the chart
   isn't empty for existing users on launch day.
3. Flip the flag: ledger becomes authoritative, tier checks become an
   informational fallback.
4. Add Stripe topup. Sunset flat tiers.

Numbers in `lib/pricing.ts` should be revisited once we have 2 weeks of real
ledger data — current values are educated guesses, not measurements.
