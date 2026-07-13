import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    redirect("/onboarding");
  }

  return <>{children}</>;
}
