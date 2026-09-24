import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { apiGet, type ApiApplication } from "@/lib/api";
import type { Application } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import HistoryView from "@/components/dashboard/HistoryView";

export default async function HistoryPage() {
  const supabase = await createClient();
  const gate = await gateUser();
  if (gate.unreachable) return <AuthHiccup />;
  const user = gate.user;
  if (!user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login");

  const res = await apiGet<ApiApplication[]>("/applications/history", token).catch(() => []);
  const applications = (res as unknown as Application[]) || [];

  return (
    <DashboardLayout>
      <HistoryView applications={applications} />
    </DashboardLayout>
  );
}
