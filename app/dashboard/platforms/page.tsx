import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PlatformConnections from "@/components/dashboard/PlatformConnections";

export const metadata = {
  title: "Platforms — HireDrop",
};

// Dedicated Platforms tab. The full connection manager (log in / sign up / live
// status per platform) moved here off the main dashboard, which now shows only a
// compact status pill — keeping the dashboard focused on filters + campaign.
export default async function PlatformsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Job platforms</h1>
        <p className="text-sm text-text2 mt-1 max-w-2xl">
          HireDrop applies from your own browser, as you — so it needs you logged into each
          platform. Connect your accounts here; the extension reports live status and the
          dashboard shows how many are ready.
        </p>
      </div>
      <PlatformConnections />
    </DashboardLayout>
  );
}
