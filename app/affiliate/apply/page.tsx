import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// This URL is printed. The card's back QR points at /affiliate, but earlier
// material and any shared link may still land here, so it keeps working — it
// just stops being a separate form.
//
// Account first (Igor, 2026-09-24): the application now lives inside the
// account, which removes the failure where someone applies with one email and
// signs up with another, leaving an approved code attached to nobody.
export const metadata = {
  title: "Apply for an affiliate link — HireDrop",
  robots: { index: false, follow: true },
};

export default async function AffiliateApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  const source = (src || "").slice(0, 60);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard/affiliate");

  redirect(`/signup?affiliate=1${source ? `&src=${encodeURIComponent(source)}` : ""}`);
}
