import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
            We hand out links one at a time rather than running an open signup, so getting one is a
            short conversation.
          </p>
          <Link
            href="/affiliate"
            className="inline-block mt-5 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            Read how it works
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
