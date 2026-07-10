"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { redeemPromoCode } from "@/lib/promo";
import StepPersonalInfo from "./StepPersonalInfo";
import StepJobPreferences from "./StepJobPreferences";
import StepReassurance from "./StepReassurance";
import StepPlatforms from "./StepPlatforms";
import StepResume from "./StepResume";
import StepATSCheck from "./StepATSCheck";
import StepWritingStyle from "./StepWritingStyle";
import StepDone from "./StepDone";
import type { UserProfile } from "@/lib/types";

const STEPS = [
  { id: 1, title: "Profile" },
  { id: 2, title: "Preferences" },
  { id: 3, title: "Safety" },
  { id: 4, title: "Platforms" },
  { id: 5, title: "Resume" },
  { id: 6, title: "ATS" },
  { id: 7, title: "Style" },
  { id: 8, title: "Done" },
];

const initialProfile: UserProfile = {
  name: "",
  last_name: "",
  email: "",
  phone: "",
  keywords: [],
  location: "remote",
  job_type: "full-time",
  platforms: ["indeed"],
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [promoTier, setPromoTier] = useState<string | null>(null);

  function updateProfile(updates: Partial<UserProfile>) {
    setProfile((prev) => ({ ...prev, ...updates }));
  }

  // Pre-fill email from auth user + redeem any promo code carried from signup.
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      updateProfile({
        email: user.email || "",
        name: user.user_metadata?.first_name || "",
        last_name: user.user_metadata?.last_name || "",
      });

      const promo = user.user_metadata?.promo_code;
      if (promo) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const result = await redeemPromoCode(promo, session.access_token);
          if (result.ok && result.tier) setPromoTier(result.tier);
        }
      }
    }
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function back() {
    if (step > 1) setStep(step - 1);
  }

  async function nextFromResume() {
    setSaving(true);
    setSaveError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (resumeFile) {
      const filePath = `${user.id}/resume.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, { upsert: true });

      if (uploadError) {
        setSaving(false);
        setSaveError("Resume upload failed. Please try again.");
        return;
      }

      await supabase.from("profiles").update({ resume_url: filePath }).eq("user_id", user.id);
    }

    setSaving(false);
    setStep(6); // → ATS Check
  }

  function next() {
    if (step < STEPS.length) setStep(step + 1);
  }

  async function finish() {
    setSaving(true);
    setSaveError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

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
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      setSaveError("Something went wrong saving your profile. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="app-ui min-h-screen bg-background">
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

        {/* Promo unlocked banner */}
        {promoTier && (
          <div className="mb-6 p-3.5 rounded-xl bg-green/10 border border-green/20 flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-green/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-text">
              <span className="font-semibold capitalize">{promoTier} access unlocked</span>
              {" — "}HireDrop is free for you. Enjoy.
            </p>
          </div>
        )}

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
            <StepReassurance onNext={next} onBack={back} />
          )}
          {step === 4 && (
            <StepPlatforms profile={profile} updateProfile={updateProfile} onNext={next} onBack={back} />
          )}
          {step === 5 && (
            <>
              {saveError && (
                <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">
                  {saveError}
                </div>
              )}
              <StepResume
                resumeFile={resumeFile}
                setResumeFile={setResumeFile}
                onNext={nextFromResume}
                onBack={back}
                uploading={saving}
              />
            </>
          )}
          {step === 6 && (
            <StepATSCheck onNext={next} onBack={back} hasResume={!!resumeFile} />
          )}
          {step === 7 && (
            <StepWritingStyle profile={profile} updateProfile={updateProfile} onNext={next} onBack={back} />
          )}
          {step === 8 && (
            <>
              {saveError && (
                <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">
                  {saveError}
                </div>
              )}
              <StepDone profile={profile} resumeFile={resumeFile} onBack={back} onFinish={finish} saving={saving} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
