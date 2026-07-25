import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TapView from "@/components/dashboard/TapView";

export const metadata = {
  title: "Tap to apply — HireDrop",
};

export default async function TapPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login");

  // Unlike the auto campaign page, tap does NOT redirect when idle — this page is
  // where the user starts a tap session, so it must render whether or not one is live.
  return <TapView token={token} />;
}
