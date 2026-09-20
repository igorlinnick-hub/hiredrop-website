import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiGet } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AffiliateView, {
  type AffiliateStats,
  type AffiliateCommission,
} from "@/components/dashboard/AffiliateView";

export const metadata = {
  title: "Affiliate — HireDrop",
};

/**
 * The affiliate's own ledger.
 *
 * Reads through RLS with the user's session, never service_role: affiliate_stats()
 * is SECURITY DEFINER scoped to auth.uid() (it counts referral rows the affiliate
 * must not be able to read individually), and the commissions select is covered by
 * commissions_select_own. Both live in jobflow/migrations/add_affiliates.sql.
 *
 * Codes are issued by hand (jobflow/scripts/affiliate_admin.py), so most users
 * land on the "not in the program" state below — that's the expected page, not an
 * error.
 */
export default async function AffiliatePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: statsRows } = await supabase.rpc("affiliate_stats");
  const stats = (statsRows?.[0] ?? null) as AffiliateStats | null;

  if (!stats) {
    // Not an affiliate — but they may have applied. "Under review" and "not in
    // the program" are different answers, and telling someone who applied the
    // second one reads as being forgotten.
    const { data: { session } } = await supabase.auth.getSession();
    const applied = session?.access_token
      ? await apiGet<{ application: { desired_code: string; status: string } | null }>(
          "/affiliate/application",
          session.access_token,
        ).catch(() => null)
      : null;
    const application = applied?.application ?? null;

    if (application && application.status === "new") {
      return (
        <DashboardLayout>
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold text-text">Affiliate</h1>
            <p className="text-text2 mt-2">
              Your application for{" "}
              <span className="font-medium text-text">hiredrop.io/?ref={application.desired_code}</span>{" "}
              is with us. A person reads every one — usually within a day or two. Nothing to do
              here until then.
            </p>
          </div>
        </DashboardLayout>
      );
    }

    if (application && application.status === "approved") {
      return (
        <DashboardLayout>
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold text-text">Affiliate</h1>
            <p className="text-text2 mt-2">
              You&apos;re approved — your link is{" "}
              <span className="font-medium text-text">hiredrop.io/?ref={application.desired_code}</span>.
              Your earnings will appear here as soon as someone you referred pays.
            </p>
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-text">Affiliate</h1>
          <p className="text-text2 mt-2">
            You&apos;re not in the affiliate program yet. It pays 30% of everything the people you
            refer pay us, every month they stay subscribed — and three paying referrals make your
            own HireDrop free.
          </p>
          <p className="text-text2 mt-3">
            Applications are read by a person, so it&apos;s a short form rather than an instant
            signup — tell us who you&apos;d share it with and pick the link you want.
          </p>
          <Link
            href="/affiliate/apply"
            className="inline-block mt-5 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            Apply for a link
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { data: commissions } = await supabase
    .from("commissions")
    .select("created_at, gross_cents, amount_cents, status")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <DashboardLayout>
      <AffiliateView
        stats={stats}
        commissions={(commissions ?? []) as AffiliateCommission[]}
      />
    </DashboardLayout>
  );
}
