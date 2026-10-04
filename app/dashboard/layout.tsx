import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { PATHNAME_HEADER } from "@/lib/supabase/middleware";
import { isOnboardingExempt } from "@/lib/gate/onboarding";
import DashboardLoading from "./loading";

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
 *
 * The gate renders inside its own <Suspense>. loading.tsx sits BELOW this
 * layout, so it could not cover the gate's own wait: getUser + the profile read
 * (~0.3–0.4 s on prod, 10-03) went out before a single byte, and the screen
 * stayed blank until both came back. Now the skeleton streams right after the
 * middleware and the gate fills in behind it. The page reaches the screen only
 * where the gate returns children. Next still renders the page segment in
 * parallel, so a user redirected to the quiz gets their OWN page payload in the
 * RSC script (never in the DOM) — their data under their token, and every page
 * re-checks the session itself. A redirect thrown after the stream started is
 * sent as a client-side redirect (200 + meta refresh, per Next's redirect
 * docs); signed-out visitors never reach it — middleware.ts still answers
 * them with a 307 before any render.
 */
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardGate>{children}</DashboardGate>
    </Suspense>
  );
}

async function DashboardGate({
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
    // The rule itself lives in lib/gate/onboarding.ts, where it is tested
    // without a server or a session (tests/onboarding-gate.test.ts) — including
    // the boundary that keeps /dashboard/affiliates-admin OUT.
    const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";
    if (isOnboardingExempt(pathname)) return <>{children}</>;
    redirect("/onboarding");
  }

  return <>{children}</>;
}
