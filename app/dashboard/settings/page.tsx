"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { PLATFORMS, LOCATIONS, JOB_TYPES } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";
import { TIER_BADGE_CLASS, TIER_LABEL } from "@/lib/pricing";

const emptyProfile: UserProfile = {
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

export default function SettingsPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile({
          name: data.name || "",
          last_name: data.last_name || "",
          email: user.email || "",
          phone: data.phone || "",
          keywords: data.keywords || [],
          location: data.location || "remote",
          job_type: data.job_type || "full-time",
          platforms: data.platforms || ["remoteok"],
          writing_style: data.writing_style || "",
          resume_url: data.resume_url || null,
          onboarding_completed: data.onboarding_completed || false,
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(updates: Partial<UserProfile>) {
    setProfile((prev) => ({ ...prev, ...updates }));
    setSaved(false);
  }

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const word = keywordInput.trim().replace(/,$/, "");
      if (word && !profile.keywords.includes(word)) {
        update({ keywords: [...profile.keywords, word] });
      }
      setKeywordInput("");
    }
  }

  function togglePlatform(id: string) {
    const current = profile.platforms;
    if (current.includes(id)) {
      if (current.length === 1) return;
      update({ platforms: current.filter((p) => p !== id) });
    } else {
      update({ platforms: [...current, id] });
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      update({ resume_url: filePath });
    }
  }

  async function handleRemoveResume() {
    if (!profile.resume_url) return;

    await supabase.storage.from("resumes").remove([profile.resume_url]);
    update({ resume_url: null });
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: saveError } = await supabase
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
        resume_url: profile.resume_url,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (saveError) {
      setError("Failed to save. Please try again.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-text2">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-text">Profile Settings</h2>
          <p className="text-sm text-text2 mt-1">Update your information and preferences.</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
        )}

        {/* Personal Info */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name" value={profile.name} onChange={(e) => update({ name: e.target.value })} />
            <Input label="Last name" value={profile.last_name} onChange={(e) => update({ last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={profile.email} disabled hint="Email cannot be changed here." />
          <Input label="Phone" type="tel" value={profile.phone} onChange={(e) => update({ phone: e.target.value })} />
        </section>

        {/* Job Preferences */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text">Job Preferences</h3>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">Keywords</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent text-sm rounded-full">
                  {kw}
                  <button type="button" onClick={() => update({ keywords: profile.keywords.filter((k) => k !== kw) })} className="hover:text-red">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={addKeyword}
              placeholder="Add keyword, press Enter"
            />
          </div>

          <Select
            label="Location"
            value={profile.location}
            onChange={(e) => update({ location: e.target.value })}
            options={LOCATIONS.map((l) => ({ value: l.value, label: l.label }))}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">Job type</label>
            <div className="flex gap-4">
              {JOB_TYPES.map((jt) => (
                <label key={jt.value} className="flex items-center gap-2 cursor-pointer text-sm text-text">
                  <input
                    type="radio"
                    name="job_type"
                    value={jt.value}
                    checked={profile.job_type === jt.value}
                    onChange={(e) => update({ job_type: e.target.value })}
                    className="accent-accent"
                  />
                  {jt.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text">Platforms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.filter((p) => p.status === "active").map((platform) => {
              const isSelected = profile.platforms.includes(platform.id);
              const tier = platform.costTier ?? "standard";
              return (
                <button
                  type="button"
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={[
                    "text-left p-3 rounded-lg border-2 transition text-sm",
                    isSelected ? "border-accent bg-accent/5" : "border-border hover:border-text2",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">{platform.name}</span>
                    <span
                      className={[
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                        TIER_BADGE_CLASS[tier],
                      ].join(" ")}
                    >
                      {TIER_LABEL[tier]}
                    </span>
                  </div>
                  <span className="text-xs text-text2 block mt-0.5">{platform.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Resume */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text">Resume</h3>
          {profile.resume_url ? (
            <div className="flex items-center justify-between p-3 bg-surface2 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-text">{profile.resume_url.split("/").pop()}</span>
              </div>
              <button className="text-sm text-red hover:underline" onClick={handleRemoveResume}>
                Remove
              </button>
            </div>
          ) : (
            <p className="text-sm text-text2">No resume uploaded. Upload a PDF to enable auto-apply.</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            className="hidden"
          />
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload New Resume
          </Button>
        </section>

        {/* Writing Style */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text">Writing Style</h3>
          <Textarea
            value={profile.writing_style}
            onChange={(e) => update({ writing_style: e.target.value })}
            rows={4}
            placeholder="Paste a sample of your writing..."
            hint="AI will match your tone in cover letters."
          />
        </section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-green">Saved successfully!</span>}
        </div>
      </div>
    </DashboardLayout>
  );
}
