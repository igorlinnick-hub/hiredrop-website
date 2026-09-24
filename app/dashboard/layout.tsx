import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { PATHNAME_HEADER } from "@/lib/supabase/middleware";

/**
 * Fail-closed onboarding gate for EVERY /dashboard/* route.
 *
 * Before this layout existed, the only onboarding check lived in
 * /auth/callback (OAuth + email-confirmation links). Password login routed
 * straight to /dashboard, so a fresh user could land on the app without ever
 * seeing the quiz — with an empty profile the campaign would then fill
 * applications with blanks under their identity. Route-level enforcement
 * closes every entry path at once (login, deep links, stale bookmarks).
 *
 * Loop-safety: the onboarding wizard never auto-redirects to /dashboard —
 * finish() navigates only after profiles.onboarding_completed is successfully
 * set to true, and stays on the wizard showing the error otherwise.
 *
 * ONE exemption: /dashboard/affiliate. An ambassador who is not job hunting had
 * no way in — the gate demanded a resume and a job search from someone who only
 * ever wanted their link, which is the whole reason a separate affiliate login
 * looked necessary. It isn't: same account, one route open. Every other
 * dashboard route still needs the quiz, because every other route acts on an
 * empty profile; this one only ever reads the affiliate tables.
 */
export default async function DashboardGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser validates the JWT against Supabase; getSession only reads cookies.
  const gate = await gateUser();
  // Could not ASK whether they are signed in → say that, don't fake a logout.
  if (gate.unreachable) return <AuthHiccup />;
  const user = gate.user;
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fail-closed: missing row, failed query or incomplete quiz all go to
  // onboarding — never flatter an unknown state with dashboard access.
  if (!profile?.onboarding_completed) {
    const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";
    // Widened 2026-09-24: the affiliate screen is now where someone APPLIES,
    // so requiring an affiliate row would gate the door on the thing you walk
    // through it to get. Safe to open because that page is the one dashboard
    // route that never acts on the profile — it asks for a link, shows a
    // review status, or shows an existing partner's own numbers. Every other
    // route still needs the quiz, because every other route runs a job search.
    if (pathname.startsWith("/dashboard/affiliate")) return <>{children}</>;
    redirect("/onboarding");
  }

  return <>{children}</>;
}
