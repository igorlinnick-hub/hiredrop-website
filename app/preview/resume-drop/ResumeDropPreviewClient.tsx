"use client";

import { useState } from "react";
import ResumeEditor, { type ResumeStructure } from "@/components/dashboard/ResumeEditor";
import ResumeFileRow from "@/components/dashboard/ResumeFileRow";
import StepResume from "@/components/onboarding/StepResume";

// A structure with the kind of mistake the editor exists for: the generator read the
// middle initial into the surname and mangled one employer.
const SAMPLE: ResumeStructure = {
  name: "Jane R. Roesmith",
  title: "Registered Nurse",
  contact: { phone: "+1 808 555 0100", email: "jane@example.com", location: "Honolulu, HI", linkedin: "" },
  summary: "Critical care nurse with eight years in a level-one trauma center.",
  competencies: ["Triage", "Charting", "Patient education"],
  experience: [
    {
      title: "Charge Nurse",
      company: "Queen s Medical Ctr",
      location: "Honolulu, HI",
      dates: "2020 - Present",
      bullets: ["Ran a 24-bed unit across night shifts", "Cut handoff errors by a third"],
    },
  ],
  education: [{ degree: "BSN", school: "University of Hawaii", year: "2016" }],
  certifications: ["BLS", "ACLS"],
  languages: ["English (native)"],
  tech_skills: ["Epic", "Cerner"],
};

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
  const [structure, setStructure] = useState<ResumeStructure>(SAMPLE);
  const [editing, setEditing] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);

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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text2">Fix-it editor</h3>
          <p className="text-sm text-text2">
            The sample carries the kind of mistake this exists for: the generator glued the middle
            initial onto the surname and mangled the employer. Nothing is saved here.
          </p>
          <div className="rounded-xl border border-border bg-surface2 p-4">
            <p className="text-sm font-medium text-text">{structure.name}</p>
            <p className="text-xs text-text2">
              {structure.experience[0]?.company} · {structure.experience[0]?.dates}
            </p>
            <button
              data-testid="open-editor"
              onClick={() => setEditing(true)}
              className="mt-3 text-sm font-medium text-text underline underline-offset-2 hover:opacity-70"
            >
              Edit resume
            </button>
          </div>
          {editing && (
            <ResumeEditor
              initial={structure}
              saving={savingStructure}
              error={null}
              onSave={next => {
                setSavingStructure(true);
                // Stand-in for the re-render round-trip.
                setTimeout(() => {
                  setStructure(next);
                  setSavingStructure(false);
                  setEditing(false);
                }, 600);
              }}
              onClose={() => setEditing(false)}
            />
          )}
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
