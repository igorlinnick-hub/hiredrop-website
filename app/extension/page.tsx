import { redirect } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DownloadButton from "@/components/extension/DownloadButton";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Chrome Extension — HireDrop",
};

const STEPS = [
  {
    step: 1,
    title: "Download the extension",
    description: 'Click the button below to download the extension as a ZIP file.',
  },
  {
    step: 2,
    title: "Open Chrome Extensions",
    description: 'Navigate to chrome://extensions in your browser, or go to Menu → Extensions → Manage Extensions.',
  },
  {
    step: 3,
    title: "Enable Developer Mode",
    description: 'Toggle the "Developer mode" switch in the top right corner of the extensions page.',
  },
  {
    step: 4,
    title: 'Load the extension',
    description: 'Click "Load unpacked" and select the extracted extension folder. The HireDrop icon will appear in your toolbar.',
  },
];

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
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Automatically fills out Indeed application forms (name, email, phone, work experience)
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Uploads your resume PDF to each application
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Pastes AI-generated cover letters tailored to each job
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Mimics human behavior (random delays, mouse movements) to avoid detection
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Up to 50 applications per day on Indeed
            </li>
          </ul>
        </div>

        {/* Installation steps */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-text mb-4">Installation</h3>
          <div className="space-y-6">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-text text-sm">{s.title}</p>
                  <p className="text-sm text-text2 mt-0.5">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DownloadButton token={token} />

        <p className="text-xs text-text2 mt-3">
          Requires Google Chrome. The extension is not yet published to the Chrome Web Store — install manually using the steps above. After loading the unpacked extension, open it and click <strong>Connect Account</strong>; you&apos;ll be redirected to <code>/extension/connect</code> which links your account.
        </p>
      </div>
    </DashboardLayout>
  );
}
