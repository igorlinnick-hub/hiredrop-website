import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  apiGet,
  type StatsResponse,
  type ApiJob,
  type ApiApplication,
  type CampaignStatusResponse,
} from "@/lib/api";
import type { Job, Application } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import JobsTable from "@/components/dashboard/JobsTable";
import ApplicationHistory from "@/components/dashboard/ApplicationHistory";
import QuickActions from "@/components/dashboard/QuickActions";
import UsageBanner from "@/components/dashboard/UsageBanner";
import SpendCurve from "@/components/dashboard/SpendCurve";
import CreditCalculator from "@/components/dashboard/CreditCalculator";

export const metadata = {
  title: "Dashboard — JobFlow",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser validates the JWT against Supabase; getSession only reads cookies.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  // maybeSingle returns null instead of erroring when the row is missing
  // (e.g. profile trigger hasn't fired yet right after signup).
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/login");
  }

  // Fetch all dashboard data in parallel
  const [stats, jobs, applications, campaign] = await Promise.allSettled([
    apiGet<StatsResponse>("/stats", token),
    apiGet<ApiJob[]>("/jobs", token),
    apiGet<ApiApplication[]>("/applications/history", token),
    apiGet<CampaignStatusResponse>("/campaign/status", token),
  ]);

  const statsData = stats.status === "fulfilled" ? stats.value : null;
  const jobsData = (jobs.status === "fulfilled" ? jobs.value : []) as Job[];
  const applicationsData = (applications.status === "fulfilled" ? applications.value : []) as unknown as Application[];
  const campaignRunning = campaign.status === "fulfilled" ? campaign.value.running : false;

  const TIER_LABELS: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    elite: "Elite",
    admin: "Admin",
  };

  return (
    <DashboardLayout>
      <QuickActions token={token} campaignRunning={campaignRunning} />

      <div className="space-y-6">
        {/* Subscription tier + daily usage */}
        {statsData && (
          <UsageBanner
            tier={statsData.tier}
            tierLabel={TIER_LABELS[statsData.tier] || statsData.tier}
            usedToday={statsData.applications_today}
            dailyLimit={statsData.daily_limit}
            remainingToday={statsData.remaining_today}
            platformCounts={statsData.platform_counts}
            maxPerPlatform={statsData.max_per_platform}
          />
        )}

        <StatsCards
          totalJobs={statsData?.total_jobs ?? 0}
          totalApplications={statsData?.total_applications ?? 0}
          applicationsToday={statsData?.applications_today ?? 0}
          responseRate={0}
        />

        <SpendCurve />

        <CreditCalculator />

        <JobsTable jobs={jobsData} />

        <ApplicationHistory applications={applicationsData} />
      </div>
    </DashboardLayout>
  );
}
