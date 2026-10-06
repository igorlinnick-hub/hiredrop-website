import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import type { UserProfile } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SettingsView from "@/components/dashboard/SettingsView";

export const metadata = {
  title: "Settings — HireDrop",
};

/* The profile is read here, on the server, instead of after hydration: the page
   paints with the person's data, with no "Loading profile..." screen and no extra
   client round-trip. Everything interactive lives in SettingsView. */
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

  const profile: UserProfile = {
    name: data?.name || "",
    last_name: data?.last_name || "",
    email: data ? user.email || "" : "",
    phone: data?.phone || "",
    keywords: data?.keywords || [],
    location: data?.location || "remote",
    // `?? ""` and NOT `|| "full-time"`: an empty/NULL job_type means "any type"
    // and must survive a page load. The old fallback made the picker claim
    // Full-time over a profile that had no type set at all — and a Save from that
    // screen then wrote the narrowing to the database, silently shrinking the
    // user's search to a filter they never chose.
    job_type: data?.job_type ?? "",
    platforms: data?.platforms || ["indeed"],
    writing_style: data?.writing_style || "",
    linkedin_url: data?.linkedin_url || "",
    portfolio_url: data?.portfolio_url || "",
    street_address: data?.street_address || "",
    city: data?.city || "",
    state: data?.state || "",
    postal_code: data?.postal_code || "",
    current_employer: data?.current_employer || "",
    current_title: data?.current_title || "",
    school: data?.school || "",
    degree: data?.degree || "",
    salary_expectation: data?.salary_expectation || "",
    work_authorized_us: data?.work_authorized_us ?? null,
    needs_sponsorship: data?.needs_sponsorship ?? null,
    notice_period: data?.notice_period || "",
    english_level: data?.english_level || "",
    resume_url: data?.resume_url || null,
    onboarding_completed: data?.onboarding_completed || false,
  };

  return (
    <DashboardLayout>
      <SettingsView initialProfile={profile} />
    </DashboardLayout>
  );
}
