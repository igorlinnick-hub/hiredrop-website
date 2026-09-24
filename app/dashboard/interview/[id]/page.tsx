import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gateUser } from "@/lib/supabase/gate";
import AuthHiccup from "@/components/auth/AuthHiccup";
import { getInterviewKit, type InterviewKitResponse } from "@/lib/api";
import InterviewRoom from "@/components/dashboard/InterviewRoom";

/** The prep sheet gets read next to a live conversation, so it deliberately renders
 *  outside DashboardLayout — no sidebar, no nav, nothing competing with the material. */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const gate = await gateUser();
  if (gate.unreachable) return <AuthHiccup />;
  const user = gate.user;
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login");

  // GET never generates, so this page load costs nothing even for applications the
  // user only glanced at. A failed read degrades to the "build it" state.
  const kit: InterviewKitResponse = await getInterviewKit(id, token).catch(() => ({
    ready: false,
    can_generate: true,
  }));

  return (
    <InterviewRoom
      applicationId={id}
      token={token}
      initial={kit}
      title={kit.title || "Interview prep"}
      company={kit.company || ""}
      link={kit.link || ""}
    />
  );
}
