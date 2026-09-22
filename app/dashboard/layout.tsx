import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
 * ONE exemption, added 2026-09-21: /dashboard/affiliate for someone who already
 * has an affiliate row. An ambassador who is not job hunting had no way in —
 * the gate demanded a resume and a job search from someone who only ever wanted
 * to see their link and their earnings, which is the whole reason a separate
 * affiliate login looked necessary. It isn't: same account, one route open.
 * The exemption is deliberately narrow — every other dashboard route still
 * needs the quiz, because every other route acts on an empty profile.
 */
export default async function DashboardGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser validates the JWT against Supabase; getSession only reads cookies.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
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
    if (pathname.startsWith("/dashboard/affiliate")) {
      // Read under RLS (affiliates_select_own): this can only ever return the
      // caller's own row, so "is an affiliate" cannot be spoofed by the URL.
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (affiliate) return <>{children}</>;
    }
    redirect("/onboarding");
  }

  return <>{children}</>;
}
