import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { apiGet, type CampaignStatusResponse } from "@/lib/api";
import CampaignView from "@/components/dashboard/CampaignView";

export const metadata = {
  title: "Campaign Live — HireDrop",
};

export default async function CampaignPage() {
  const supabase = await createClient();

  const gate = await gateUser();
  if (gate.unreachable) return <AuthHiccup />;
  const user = gate.user;
  if (!user) redirect("/login");

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
