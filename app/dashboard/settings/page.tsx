"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import ResumeATSPanel from "@/components/dashboard/ResumeATSPanel";
import ApplyModePanel from "@/components/dashboard/ApplyModePanel";
import BillingSection from "@/components/dashboard/BillingSection";
import { PLATFORMS, LOCATIONS, JOB_TYPES } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

const emptyProfile: UserProfile = {
  name: "",
  last_name: "",
  email: "",
  phone: "",
  keywords: [],
  location: "remote",
  job_type: "full-time",
  platforms: ["indeed"],
  writing_style: "",
  linkedin_url: "",
  portfolio_url: "",
  resume_url: null,
  onboarding_completed: false,
};

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false); // unsaved changes → the Save button lights up
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Client component can't export `metadata`; set the tab title directly.
  useEffect(() => {
    document.title = "Settings — HireDrop";
  }, []);

  // Deep-link from the "Upgrade →" banner lands on ?tab=billing — scroll to it.
  // Read window.location directly to avoid a useSearchParams Suspense boundary.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "billing") {
      document.getElementById("billing")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

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
          platforms: data.platforms || ["indeed"],
          writing_style: data.writing_style || "",
          linkedin_url: data.linkedin_url || "",
          portfolio_url: data.portfolio_url || "",
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
    setDirty(true);
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
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (saveError) {
      setError("Failed to save. Please try again.");
      return;
    }

    setSaved(true);
    setDirty(false);
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

  // Bottom-right save action for each editable card — lit up (accent) only when there are
  // unsaved changes, subtle/gray otherwise. Reused in every profile section.
  const saveBar = () => (
    <div className="flex items-center justify-end gap-2 pt-2">
      {saved && <span className="text-sm text-green whitespace-nowrap">Saved ✓</span>}
      <button
        onClick={handleSave}
        disabled={!dirty || saving}
        className={[
          "px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap",
          dirty && !saving
            ? "bg-accent text-white hover:opacity-90 shadow-sm"
            : "bg-surface2 text-text2/40 cursor-default",
        ].join(" ")}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="LinkedIn URL" type="url" value={profile.linkedin_url} onChange={(e) => update({ linkedin_url: e.target.value })} hint="Used to fill LinkedIn fields on company application forms." />
            <Input label="Portfolio / website URL" type="url" value={profile.portfolio_url} onChange={(e) => update({ portfolio_url: e.target.value })} hint="Used for portfolio/website fields." />
          </div>
          {saveBar()}
        </section>

        {/* Billing & Plan */}
        <BillingSection />

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
          {saveBar()}
        </section>

        {/* Platforms */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <h3 className="font-semibold text-text">Platforms</h3>

          {/* Auto-apply */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-green uppercase tracking-wide">Auto-apply</span>
              <span className="text-xs text-text2">Extension fills & submits the form</span>
            </div>
            {PLATFORMS.filter((p) => p.autoApply).map((platform) => {
              const isSelected = profile.platforms.includes(platform.id);
              return (
                <button type="button" key={platform.id} onClick={() => togglePlatform(platform.id)}
                  className={["text-left w-full p-3 rounded-lg border-2 transition text-sm", isSelected ? "border-accent bg-accent/5" : "border-border hover:border-text2"].join(" ")}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{platform.name}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green/10 text-green">Auto-apply</span>
                  </div>
                  <span className="text-xs text-text2">{platform.description}</span>
                </button>
              );
            })}
          </div>

          {/* Discovery */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">Discovery</span>
              <span className="text-xs text-text2">We find jobs, you apply via the listing</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLATFORMS.filter((p) => !p.autoApply).map((platform) => {
                const isSelected = profile.platforms.includes(platform.id);
                return (
                  <button type="button" key={platform.id} onClick={() => togglePlatform(platform.id)}
                    className={["text-left p-3 rounded-lg border-2 transition text-sm", isSelected ? "border-accent bg-accent/5" : "border-border hover:border-text2"].join(" ")}>
                    <span className="font-medium text-text block">{platform.name}</span>
                    <span className="text-xs text-text2">{platform.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {saveBar()}
        </section>

        {/* Resume & ATS */}
        <ResumeATSPanel />

        {/* Apply Mode */}
        <ApplyModePanel />

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
          {saveBar()}
        </section>
      </div>
    </DashboardLayout>
  );
}
