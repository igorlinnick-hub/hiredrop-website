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

/** Resolves `?next=` without a real host; never part of what safeNextPath returns. */
const NEXT_PROBE_ORIGIN = "https://next.invalid";

/**
 * `?next=` if it is a path on this site, otherwise null, normalized the way a
 * browser reads it.
 *
 * Parsed with the URL parser rather than checked as a string: a browser reads a
 * backslash as a slash and deletes tabs and newlines before navigating, so
 * "/\t/evil.com" becomes "//evil.com", another host. Sending someone there
 * right after they typed their password is the attack this closes.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(next, NEXT_PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== NEXT_PROBE_ORIGIN) return null;
  const path = url.pathname + url.search + url.hash;
  // "/.//evil.com" parses to the path "//evil.com", which on its own names another host.
  if (path.startsWith("//")) return null;
  return path;
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

/**
 * Where middleware sends someone who is ALREADY signed in and opens /login or
 * /signup. It used to be /dashboard for everyone, which dropped what the page
 * was asked for: Igor 10-06, signed in, pressed "Get your link" on the landing
 * and got the job-seeker quiz — /signup?affiliate=1 → /dashboard → the
 * onboarding gate → /onboarding. The button only learns about the session
 * after mount, so a quick click still carries the signed-out href.
 */
export function signedInAuthPageRedirect(pathname: string, params: URLSearchParams): string {
  if (pathname === "/signup" && params.get("affiliate")) return "/dashboard/affiliate";
  const next = safeNextPath(params.get("next"));
  // next=/login would bounce a signed-in person between middleware and itself.
  if (!next || /^\/(login|signup)(?:[/?#]|$)/.test(next)) return "/dashboard";
  return next;
}
