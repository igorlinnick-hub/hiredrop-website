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
import FreeTastePaywall from "@/components/dashboard/FreeTastePaywall";
import NeedsAttentionPanel from "@/components/dashboard/NeedsAttentionPanel";

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

  // Free taste exhausted → the paywall moment leads the page (free tier only;
  // fields are null for paid tiers and absent on a pre-feature backend).
  const freeTasteExhausted =
    statsData?.tier === "free" &&
    typeof statsData.free_limit === "number" &&
    (statsData.free_used ?? 0) >= statsData.free_limit;

  return (
    <DashboardLayout>
      {freeTasteExhausted && statsData && (
        <FreeTastePaywall
          freeUsed={statsData.free_used ?? statsData.free_limit ?? 0}
          freeLimit={statsData.free_limit ?? 0}
        />
      )}

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
        searchRadiusMiles={profile?.search_radius_miles ?? null}
      />

      {/* Connections moved to their own /dashboard/platforms tab — here just a
          compact status pill so the dashboard leads with the filters + campaign. */}
      <PlatformsIndicator />

      <div className="space-y-6">
        <StatsCards
          totalJobs={statsData?.total_jobs ?? 0}
          totalApplications={statsData?.total_applications ?? 0}
          applicationsToday={statsData?.applications_today ?? 0}
        />

        <div id="jobs">
          <JobsTable jobs={jobsData} />
        </div>

        <div id="history" className="space-y-4">
          <ApplicationHistory applications={applicationsData} token={token} />
          {/* Trust surfaces (council #3): jobs we couldn't submit + per-application
              receipts. They belong with the record of what was sent — NOT at the top
              of the dashboard, where a diagnostic list distracts from the campaign.
              Renders nothing when both are empty. */}
          <NeedsAttentionPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}
