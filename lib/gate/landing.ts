/**
 * Where someone lands after signing in or confirming their email, and whether
 * the dashboard should treat them as an affiliate rather than a job seeker.
 *
 * One rule, three callers: the password login (components/auth/LoginForm),
 * the email/OAuth callback (app/auth/callback/route.ts) and the dashboard
 * shell (components/dashboard/DashboardLayout). Each of them used to decide
 * this on its own, and they disagreed — measured 26.09 on the live site with a
 * real affiliate account: the confirmation link had been taught to send
 * affiliates to their page, the password login had not, and it dropped the
 * same person into the job-seeker quiz the next time they came back to check
 * their earnings.
 *
 * `affiliateIntent` is `user_metadata.affiliate_intent`, set at signup when
 * they arrived from the affiliate landing or an invite. A user can edit their
 * own metadata, so it is only ever used for WHERE to land and WHAT to show —
 * never to unlock anything. The one route it can lead to is also open to every
 * signed-in user regardless (lib/gate/onboarding.ts), so flipping it buys a
 * shorter nav and nothing else.
 */

export interface AuthLandingState {
  onboarded: boolean;
  /** Has a row in `affiliates`, i.e. an approved link. */
  isAffiliate: boolean;
  /** Signed up from the affiliate landing or an invite. */
  affiliateIntent: boolean;
}

/**
 * `?next=` if it is a path on this site, otherwise null.
 *
 * "//host" and "/\host" are both protocol-relative to a browser (it reads the
 * backslash as a slash), so either would turn `?next=` into a way to send
 * someone who has just typed their password to another site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** Not onboarded, and here for the affiliate program. */
export function isAffiliateOnly(s: AuthLandingState): boolean {
  return !s.onboarded && (s.isAffiliate || s.affiliateIntent);
}

export function landingAfterAuth(s: AuthLandingState & { next?: string | null }): string {
  const next = safeNextPath(s.next);
  if (next) return next;
  // Someone who finished the quiz is a job seeker too; their dashboard carries
  // the Affiliate tab, so it is the right front door for both.
  if (s.onboarded) return "/dashboard";
  if (isAffiliateOnly(s)) return "/dashboard/affiliate";
  return "/onboarding";
}
