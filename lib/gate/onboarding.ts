/**
 * Which dashboard routes a user may see before finishing onboarding.
 *
 * Lives apart from app/dashboard/layout.tsx so the RULE can be tested without
 * a server, a session and a database. The layout keeps the enforcement (read
 * the profile, redirect); this file answers the one question that is easy to
 * get wrong and expensive to get wrong: which paths are exempt.
 */

/**
 * The affiliate screen, and nothing else.
 *
 * It is the one dashboard route that never touches the profile: it asks for a
 * link, shows a review status, or shows an existing partner's own numbers.
 * Every other route runs a job search, and a job search against an empty
 * profile is how applications go out with blanks in them under someone's name.
 *
 * The exemption is by PREFIX, so future sub-pages (/dashboard/affiliate/payouts)
 * inherit it — but a sibling that merely starts with the same letters
 * (/dashboard/affiliates-admin) must not, hence the boundary check.
 */
export function isOnboardingExempt(pathname: string): boolean {
  const EXEMPT = "/dashboard/affiliate";
  if (!pathname.startsWith(EXEMPT)) return false;
  const rest = pathname.slice(EXEMPT.length);
  return rest === "" || rest.startsWith("/");
}
