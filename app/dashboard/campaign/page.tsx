import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiGet, type CampaignStatusResponse } from "@/lib/api";
import CampaignView from "@/components/dashboard/CampaignView";

export const metadata = {
  title: "Campaign Live — HireDrop",
};

export default async function CampaignPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login");

  let running = false;
  try {
    const status = await apiGet<CampaignStatusResponse>("/campaign/status", token);
    running = status.running;
  } catch {}

  if (!running) redirect("/dashboard");

  return <CampaignView token={token} />;
}
