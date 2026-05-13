import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ConnectClient from "./ConnectClient";

export const metadata = {
  title: "Connect Extension — JobFlow",
};

export default async function ConnectExtensionPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login?next=/extension/connect");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/login?next=/extension/connect");
  }

  return <ConnectClient token={token} email={user.email ?? ""} />;
}
