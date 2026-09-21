"use client";

import { useState } from "react";
import ResumeFileRow from "@/components/dashboard/ResumeFileRow";
import StepResume from "@/components/onboarding/StepResume";

/**
 * Both resume drop targets side by side, with the upload stubbed out — the Settings
 * row needs a session, and /preview/onboarding can't reach the resume step because
 * the wizard redirects a logged-out visitor to /login.
 */
export default function ResumeDropPreviewClient({ dark }: { dark: boolean }) {
  const [hasResume, setHasResume] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  function fakeUpload(file: File) {
    setError(null);
    setUploading(true);
    setAccepted(`${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
    // Stand-in for the storage round-trip, so the "Uploading…" state is reviewable.
    setTimeout(() => {
      setUploading(false);
      setHasResume(true);
    }, 900);
  }

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="mx-auto max-w-2xl space-y-10 px-6 py-12">
        <div>
          <h2 className="text-xl font-bold text-text">Resume drag &amp; drop — preview</h2>
          <p className="mt-1 text-sm text-text2">
            Drag a file onto either target. Nothing is uploaded here. Add <code>?dark=1</code> for the night theme.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text2">Settings row</h3>
          {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>}
          {accepted && !error && (
            <div className="p-3 rounded-lg bg-green/10 border border-green/20 text-green text-sm">
              Accepted: {accepted}
            </div>
          )}
          <ResumeFileRow
            hasResume={hasResume}
            uploading={uploading}
            onFile={fakeUpload}
            onReject={setError}
          />
          <div className="flex gap-3 text-xs text-text2">
            <button className="underline" onClick={() => { setHasResume(!hasResume); setAccepted(null); }}>
              toggle “no resume yet”
            </button>
            <button className="underline" onClick={() => { setError(null); setAccepted(null); }}>
              clear messages
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text2">Onboarding step</h3>
          <StepResume
            resumeFile={resumeFile}
            setResumeFile={setResumeFile}
            onNext={() => {}}
            onBack={() => {}}
          />
        </section>
      </div>
    </div>
  );
}
