// Prices — ONE place the storefront quotes them from.
//
// The backend is the source of truth: app/billing_config.py in the jobflow repo defines
// PLANS (weekly / monthly) and the Stripe Price IDs built from them. These constants must
// mirror it. They used to be hardcoded as "$9" / "$29" strings in eight components, which
// is how three different truths about pricing existed at once on 2026-09-04.
//
// Changing a price: edit billing_config.py, run `scripts/stripe_bootstrap.py ship` (it
// creates a NEW Stripe Price and transfers the lookup key — Stripe Prices are immutable),
// then update the two numbers here.

export const WEEKLY_USD = 12;
export const MONTHLY_USD = 39;

/**
 * Applications a free account gets before it needs a plan — mirrors FREE_APP_LIMIT
 * in the backend's app/db/subscriptions.py. It is a lifetime total, not a daily cap.
 */
export const FREE_APP_LIMIT = 40;

export const WEEKLY_PRICE = `$${WEEKLY_USD}`;
export const MONTHLY_PRICE = `$${MONTHLY_USD}`;

/** Weekly billing costs this much across an average month (52/12 ≈ 4.33 weeks). */
export const WEEKLY_AS_MONTHLY_USD = Math.round(WEEKLY_USD * (52 / 12));

/** What the monthly cadence saves over paying weekly for the same month. */
export const MONTHLY_SAVING_USD = WEEKLY_AS_MONTHLY_USD - MONTHLY_USD;

/** "$12/week or $39/month" — the phrase used in prose (terms, FAQ, CTA). */
export const PRICE_SENTENCE = `${WEEKLY_PRICE}/week or ${MONTHLY_PRICE}/month`;

/** Honest comparison line: we do the arithmetic instead of hiding it. */
export const WEEKLY_EQUIVALENT_NOTE = `≈ $${WEEKLY_AS_MONTHLY_USD}/mo if you stay a month`;
export const MONTHLY_SAVING_NOTE = `Save $${MONTHLY_SAVING_USD} vs paying weekly`;
