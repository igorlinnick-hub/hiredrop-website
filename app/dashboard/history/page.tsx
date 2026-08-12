import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiGet, type ApiApplication } from "@/lib/api";
import type { Application } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import HistoryView from "@/components/dashboard/HistoryView";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

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
