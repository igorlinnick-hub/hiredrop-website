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
import PlatformsIndicator from "@/components/dashboard/PlatformsIndicator";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import MobileHandoff from "@/components/dashboard/MobileHandoff";
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
    .select("onboarding_completed, name, resume_url, keywords, location, job_type, platforms, salary_min, salary_max, salary_listed_only, search_radius_miles")
    .eq("user_id", user.id)
    .maybeSingle();

  // NOTE: app/dashboard/layout.tsx now hard-gates ALL /dashboard/* routes on
  // onboarding_completed (fail-closed), so incomplete users never reach this
  // page. This check and the banner below stay as defense-in-depth.
  if (!profile) {
    redirect("/onboarding");
  }

  const onboardingIncomplete = !profile.onboarding_completed;
  const resumeMissing = !profile.resume_url;
  const hasKeywords = (profile.keywords ?? []).length > 0;

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
      <SetupChecklist
        onboardingComplete={!onboardingIncomplete}
        hasResume={!resumeMissing}
        hasKeywords={hasKeywords}
      />

      {/* Phone visitors: honest hand-off — setup works here, applying runs on the computer */}
      <MobileHandoff campaignRunning={campaignRunning} />

      <QuickActions
        token={token}
        campaignRunning={campaignRunning}
        keywords={profile?.keywords ?? []}
        location={profile?.location ?? ""}
        jobType={profile?.job_type ?? ""}
        platforms={profile?.platforms ?? []}
        onboardingComplete={!onboardingIncomplete}
        hasResume={!resumeMissing}
        salaryMin={profile?.salary_min ?? null}
        salaryMax={profile?.salary_max ?? null}
        salaryListedOnly={profile?.salary_listed_only ?? false}
        searchRadiusMiles={profile?.search_radius_miles ?? null}
      />

      {/* Connections moved to their own /dashboard/platforms tab — here just a
          compact status pill so the dashboard leads with the filters + campaign. */}
      <PlatformsIndicator />

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
          responseRate={
            applicationsData.length > 0
              ? applicationsData.filter((a) =>
                  ["received", "interview", "interview_invite", "hired", "rejected"].includes(a.status)
                ).length / applicationsData.length
              : 0
          }
        />

        <div id="jobs">
          <JobsTable jobs={jobsData} />
        </div>

        <div id="history">
          <ApplicationHistory applications={applicationsData} token={token} />
        </div>
      </div>
    </DashboardLayout>
  );
}
