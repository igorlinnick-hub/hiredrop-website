"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepPersonalInfo from "./StepPersonalInfo";
import StepJobPreferences from "./StepJobPreferences";
import StepPlatforms from "./StepPlatforms";
import StepResume from "./StepResume";
import StepWritingStyle from "./StepWritingStyle";
import StepDone from "./StepDone";
import type { UserProfile } from "@/lib/types";

const STEPS = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Job Preferences" },
  { id: 3, title: "Platforms" },
  { id: 4, title: "Resume" },
  { id: 5, title: "Writing Style" },
  { id: 6, title: "Done" },
];

const initialProfile: UserProfile = {
  name: "",
  last_name: "",
  email: "",
  phone: "",
  keywords: [],
  location: "remote",
  job_type: "full-time",
  platforms: ["remoteok"],
  writing_style: "",
  resume_url: null,
  onboarding_completed: false,
};

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill email from auth user
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateProfile({
          email: user.email || "",
          name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
        });
      }
    }
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateProfile(updates: Partial<UserProfile>) {
    setProfile((prev) => ({ ...prev, ...updates }));
  }

  function next() {
    if (step < STEPS.length) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  async function finish() {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Upload resume if provided
    let resumeUrl = null;
    if (resumeFile) {
      const filePath = `${user.id}/${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, { upsert: true });

      if (!uploadError) {
        resumeUrl = filePath;
      }
    }

    // Save profile to Supabase
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        last_name: profile.last_name,
        phone: profile.phone,
        keywords: profile.keywords,
        location: profile.location,
        job_type: profile.job_type,
        platforms: profile.platforms,
        writing_style: profile.writing_style,
        resume_url: resumeUrl,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      console.error("Failed to save profile:", error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Logo + Sign out */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-2xl font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </span>
          <a
            href="/auth/signout"
            className="text-sm text-text2 hover:text-accent transition"
          >
            Sign out
          </a>
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center flex-1"
              >
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition",
                    step > s.id
                      ? "bg-green text-white"
                      : step === s.id
                      ? "bg-accent text-white"
                      : "bg-surface2 text-text2",
                  ].join(" ")}
                >
                  {step > s.id ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span className="text-xs text-text2 mt-1.5 hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-surface2 rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8">
          {step === 1 && (
            <StepPersonalInfo profile={profile} updateProfile={updateProfile} onNext={next} />
          )}
          {step === 2 && (
            <StepJobPreferences profile={profile} updateProfile={updateProfile} onNext={next} onBack={back} />
          )}
          {step === 3 && (
            <StepPlatforms profile={profile} updateProfile={updateProfile} onNext={next} onBack={back} />
          )}
          {step === 4 && (
            <StepResume
              resumeFile={resumeFile}
              setResumeFile={setResumeFile}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 5 && (
            <StepWritingStyle profile={profile} updateProfile={updateProfile} onNext={next} onBack={back} />
          )}
          {step === 6 && (
            <StepDone profile={profile} resumeFile={resumeFile} onBack={back} onFinish={finish} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );
}
