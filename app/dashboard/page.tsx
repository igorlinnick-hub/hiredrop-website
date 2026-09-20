import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  apiGet,
  type StatsResponse,
  type ApiJob,
  type CampaignStatusResponse,
} from "@/lib/api";
import type { Job } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import JobsTable from "@/components/dashboard/JobsTable";
import DevPanel from "@/components/dashboard/DevPanel";
import QuickActions from "@/components/dashboard/QuickActions";
import ChecklistDock from "@/components/dashboard/ChecklistDock";
import MobileHandoff from "@/components/dashboard/MobileHandoff";
import FreeTastePaywall from "@/components/dashboard/FreeTastePaywall";
import CheckoutSuccessBanner from "@/components/dashboard/CheckoutSuccessBanner";

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
    .select("onboarding_completed, name, resume_url, keywords, location, job_type, platforms, salary_min, salary_max, salary_listed_only, search_radius_miles, skill_groups, skills_description")
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
  // Skills are "listed" once EITHER source exists: the generated grouping
  // (skill_groups) or the user's own description typed in Settings.
  const hasSkillsListed =
    (profile.skill_groups ?? []).length > 0 || !!(profile.skills_description ?? "").trim();

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/login");
  }

  // Fetch all dashboard data in parallel
  const [stats, jobs, campaign] = await Promise.allSettled([
    apiGet<StatsResponse>("/stats", token),
    apiGet<ApiJob[]>("/jobs", token),
    apiGet<CampaignStatusResponse>("/campaign/status", token),
  ]);

  const statsData = stats.status === "fulfilled" ? stats.value : null;
  const jobsData = (jobs.status === "fulfilled" ? jobs.value : []) as Job[];
  const campaignRunning = campaign.status === "fulfilled" ? campaign.value.running : false;
  const campaignData = campaign.status === "fulfilled" ? campaign.value : null;

  // Free taste exhausted → the paywall moment leads the page (free tier only;
  // fields are null for paid tiers and absent on a pre-feature backend).
  const freeTasteExhausted =
    statsData?.tier === "free" &&
    typeof statsData.free_limit === "number" &&
    (statsData.free_used ?? 0) >= statsData.free_limit;

  return (
    <DashboardLayout>
      {/* Post-payment confirmation — the redirect target used to say nothing. */}
      <CheckoutSuccessBanner tier={statsData?.tier ?? "free"} />

      {freeTasteExhausted && statsData && (
        <FreeTastePaywall
          freeUsed={statsData.free_used ?? statsData.free_limit ?? 0}
          freeLimit={statsData.free_limit ?? 0}
        />
      )}

      {/* Everything still worth doing, as a dock at the left edge instead of a stack
          of full-width cards on top of the dashboard (Igor, 09-19). Not just setup:
          stranded Tap swipes, thin keywords and half-connected platforms cost
          applications too, so they're items here — along with the Job platforms row
          (was PlatformsIndicator), Letter voice (was a row in QuickActions) and the
          usage line from the old UsageBanner card. */}
      <ChecklistDock
        onboardingComplete={!onboardingIncomplete}
        hasResume={!resumeMissing}
        hasKeywords={hasKeywords}
        hasSkills={hasSkillsListed}
        keywordCount={(profile.keywords ?? []).length}
        approvedWaiting={campaignData?.approved_waiting ?? 0}
        submitMode={campaignData?.submit_mode}
        tier={statsData?.tier ?? "free"}
        tierLabel={(statsData?.tier ?? "free").charAt(0).toUpperCase() + (statsData?.tier ?? "free").slice(1)}
        usedToday={statsData?.applications_today ?? 0}
        dailyLimit={statsData?.daily_limit ?? 0}
        freeUsed={statsData?.free_used}
        freeLimit={statsData?.free_limit}
      />

      {/* Phone visitors: honest hand-off — setup works here, applying runs on the computer */}
      <MobileHandoff campaignRunning={campaignRunning} />

      {/* Hidden unless localStorage hd_dev === "1" (set via /dashboard?dev=1). */}
      <DevPanel token={token} />

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

      <div className="space-y-6">
        <StatsCards
          totalJobs={statsData?.total_jobs ?? 0}
          totalApplications={statsData?.total_applications ?? 0}
          applicationsToday={statsData?.applications_today ?? 0}
        />

        <div id="jobs">
          <JobsTable jobs={jobsData} />
        </div>

        {/* The full record — applications by day, links, statuses, receipts, and the
            "couldn't submit these" hand-backs — now lives in its own History tab
            (/dashboard/history), not stacked under the dashboard. */}
        <a
          href="/dashboard/history"
          className="hd-glass block rounded-2xl p-4 text-sm text-text2 hover:text-text hover:border-accent/40 transition"
        >
          View your full application history, per day — with links &amp; proof of submission →
        </a>
      </div>
    </DashboardLayout>
  );
}
