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
import QuickActions from "@/components/dashboard/QuickActions";
import PlatformsIndicator from "@/components/dashboard/PlatformsIndicator";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import MobileHandoff from "@/components/dashboard/MobileHandoff";
import FreeTastePaywall from "@/components/dashboard/FreeTastePaywall";
import CoachOffer from "@/components/dashboard/CoachOffer";
import UsageBanner from "@/components/dashboard/UsageBanner";
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
  const [stats, jobs, campaign] = await Promise.allSettled([
    apiGet<StatsResponse>("/stats", token),
    apiGet<ApiJob[]>("/jobs", token),
    apiGet<CampaignStatusResponse>("/campaign/status", token),
  ]);

  const statsData = stats.status === "fulfilled" ? stats.value : null;
  const jobsData = (jobs.status === "fulfilled" ? jobs.value : []) as Job[];
  const campaignRunning = campaign.status === "fulfilled" ? campaign.value.running : false;

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

      {/* Usage + free-taste countdown, previously only mounted on /preview/free-taste —
          a free user got no warning before the paywall (jay hit 31/40 with zero signal).
          Hidden while the paywall itself leads the page: one message per moment. */}
      {statsData && !freeTasteExhausted && (
        <UsageBanner
          tier={statsData.tier}
          tierLabel={statsData.tier.charAt(0).toUpperCase() + statsData.tier.slice(1)}
          usedToday={statsData.applications_today}
          dailyLimit={statsData.daily_limit}
          remainingToday={statsData.remaining_today}
          platformCounts={statsData.platform_counts ?? {}}
          maxPerPlatform={statsData.max_per_platform}
          freeUsed={statsData.free_used}
          freeLimit={statsData.free_limit}
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

        {/* Sits right under the stats on purpose: the offer only makes sense next
            to the number that earns it ("N applications in"). */}
        <CoachOffer totalApplications={statsData?.total_applications ?? 0} />

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
