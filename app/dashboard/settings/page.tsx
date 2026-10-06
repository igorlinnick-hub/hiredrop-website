import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { profileFromRow } from "@/lib/settings/profile";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SettingsView from "@/components/dashboard/SettingsView";

export const metadata = {
  title: "Settings — HireDrop",
};

/* The profile is read here, on the server, instead of after hydration: the page
   paints with the person's data, with no "Loading profile..." screen. Everything
   interactive lives in SettingsView (which also re-reads the row in the background,
   since Back/Forward can show this render long after it was made). */
export default async function SettingsPage() {
  const supabase = await createClient();
  const gate = await gateUser();
  if (gate.unreachable) return <AuthHiccup />;
  const user = gate.user;
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // A failed read must not render as an empty form: one Save from there would
  // write the blanks over the real profile. The dashboard error boundary offers
  // a retry instead. (No row at all never gets here — the layout's onboarding
  // gate sends that person to the quiz.)
  if (error) throw new Error(`Settings couldn't read your profile: ${error.message}`);

  const profile = profileFromRow(data, user.email);

  return (
    <DashboardLayout>
      <SettingsView initialProfile={profile} />
    </DashboardLayout>
  );
}
