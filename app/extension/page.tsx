import { redirect } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import InstallFlow from "@/components/extension/InstallFlow";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Chrome Extension — HireDrop",
};

export default async function ExtensionPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/extension");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/login?next=/extension");

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text">Chrome Extension</h2>
          <p className="text-sm text-text2 mt-1">
            Auto-apply to jobs on Indeed with one click. The extension fills out forms, uploads your resume, and submits applications automatically.
          </p>
        </div>

        {/* What it does */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">What the extension does</h3>
          <ul className="space-y-3 text-sm text-text2">
            {[
              "Automatically fills out Indeed application forms (name, email, phone, work experience)",
              "Uploads your resume PDF to each application",
              "Pastes AI-generated cover letters tailored to each job",
              "Mimics human behavior (random delays, mouse movements) to avoid detection",
              "Up to 50 applications per day on Indeed",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Install flow — animated demo + CTA. Replaces the old 4-step text guide
            and the manual ZIP download button. Extension is now in the Chrome
            Web Store, so users install in one click and then just press
            Connect Account inside the popup. */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">Install in two clicks</h3>
          <InstallFlow />
        </div>

        <p className="text-xs text-text2">
          Requires Google Chrome. The extension is published on the Chrome Web
          Store. After install, open the popup and press{" "}
          <strong>Connect Account</strong> — you&apos;ll be redirected to{" "}
          <code>/extension/connect</code> which links your HireDrop account.
        </p>
      </div>
    </DashboardLayout>
  );
}
