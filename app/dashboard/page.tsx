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

export const metadata = {
  title: "Dashboard — HireDrop",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser validates the JWT against Supabase; getSession only reads cookies.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, name, resume_url")
    .eq("user_id", user.id)
    .maybeSingle();

  // Only hard-redirect brand new users (no profile row at all).
  // Users with a profile row but onboarding_completed=false see a banner
  // instead of being trapped in a redirect loop.
  if (!profile) {
    redirect("/onboarding");
  }

  const onboardingIncomplete = !profile.onboarding_completed;

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
      {onboardingIncomplete && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>Your profile setup isn&apos;t complete yet. Auto-apply won&apos;t work until you finish.</span>
          <a href="/onboarding" className="ml-auto shrink-0 font-medium underline underline-offset-2 hover:text-amber-900">
            Complete setup →
          </a>
        </div>
      )}

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

        <JobsTable jobs={jobsData} />

        <ApplicationHistory applications={applicationsData} />
      </div>
    </DashboardLayout>
  );
}
