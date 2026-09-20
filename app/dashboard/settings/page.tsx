"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ResumeATSPanel from "@/components/dashboard/ResumeATSPanel";
import BillingSection from "@/components/dashboard/BillingSection";
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
  street_address: "",
  city: "",
  state: "",
  postal_code: "",
  current_employer: "",
  current_title: "",
  work_authorized_us: null,
  needs_sponsorship: null,
  notice_period: "",
  english_level: "",
  resume_url: null,
  onboarding_completed: false,
};

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
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
          street_address: data.street_address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          current_employer: data.current_employer || "",
          current_title: data.current_title || "",
          work_authorized_us: data.work_authorized_us ?? null,
          needs_sponsorship: data.needs_sponsorship ?? null,
          notice_period: data.notice_period || "",
          english_level: data.english_level || "",
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
        // keywords / location / job_type / platforms / submit_mode belong to the
        // DASHBOARD (QuickActions → /profile/prefs). Saving them from here too is what let
        // a stale Settings tab overwrite the filters of a running campaign.
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
        street_address: profile.street_address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        current_employer: profile.current_employer,
        current_title: profile.current_title,
        work_authorized_us: profile.work_authorized_us,
        needs_sponsorship: profile.needs_sponsorship,
        notice_period: profile.notice_period,
        english_level: profile.english_level,
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
      {/* Quiet brand echo (M2 two-circles) behind the page header — barely there,
          both themes. Non-interactive, sits under the content. */}
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute -top-4 right-0 w-56 h-40 overflow-visible">
          <span className="absolute right-10 top-0 w-28 h-28 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(108,92,231,.22), transparent 70%)", filter: "blur(7px)" }} />
          <span className="absolute right-0 top-9 w-24 h-24 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,184,148,.18), transparent 70%)", filter: "blur(7px)" }} />
        </div>
      </div>
      <div className="relative max-w-2xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-text">Profile Settings</h2>
          <p className="text-sm text-text2 mt-1">Update your information and preferences.</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
        )}

        {/* Personal Info */}
        <section className="hd-panel p-6 space-y-4">
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

          {/* Current employment. "Current company / employer / job title" is the single
              biggest hand-back cause on application forms — 12 of the 21 required
              questions we'd otherwise leave blank on the 320-form measure. Filled
              honestly from here; blank means the job is handed back, never invented. */}
          <p className="text-sm font-medium text-text pt-2">Current employment</p>
          <p className="text-xs text-text-muted -mt-2">
            Many forms require your current (or most recent) employer and job title.
            Used only to fill those fields.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Current / most recent employer" value={profile.current_employer} onChange={(e) => update({ current_employer: e.target.value })} placeholder="e.g. Acme Corp" />
            <Input label="Current / most recent job title" value={profile.current_title} onChange={(e) => update({ current_title: e.target.value })} placeholder="e.g. Software Engineer" />
          </div>

          {/* Mailing address. ZipRecruiter's contact step labels these Optional and then
              refuses to advance while they are blank, so a missing address quietly costs
              applications. We never invent one — the filler leaves the field empty and
              hands the job back instead. */}
          <p className="text-sm font-medium text-text pt-2">Mailing address</p>
          <p className="text-xs text-text-muted -mt-2">
            Some application forms won’t submit without it. Used only to fill those fields.
          </p>
          <Input label="Street address" value={profile.street_address} onChange={(e) => update({ street_address: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" value={profile.city} onChange={(e) => update({ city: e.target.value })} />
            <Input label="State / region" value={profile.state} onChange={(e) => update({ state: e.target.value })} hint="e.g. FL" />
            <Input label="ZIP / postal code" value={profile.postal_code} onChange={(e) => update({ postal_code: e.target.value })} />
          </div>

          {/* Work eligibility — the most frequent required questions on application
              forms. Filled honestly from here; never guessed on a knockout question. */}
          <p className="text-sm font-medium text-text pt-2">Work eligibility</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Authorized to work in the US?"
              value={profile.work_authorized_us === null ? "" : profile.work_authorized_us ? "yes" : "no"}
              onChange={(e) => update({ work_authorized_us: e.target.value === "" ? null : e.target.value === "yes" })}
              placeholder="Select…"
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              hint="Answers the most common required application question."
            />
            <Select
              label="Do you require visa sponsorship?"
              value={profile.needs_sponsorship === null ? "" : profile.needs_sponsorship ? "yes" : "no"}
              onChange={(e) => update({ needs_sponsorship: e.target.value === "" ? null : e.target.value === "yes" })}
              placeholder="Select…"
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              hint="A knockout question — left blank if unset (never guessed)."
            />
            <Input label="Notice period" value={profile.notice_period} onChange={(e) => update({ notice_period: e.target.value })} hint='e.g. "2 weeks", "Immediate".' />
            <Select
              label="English level"
              value={profile.english_level}
              onChange={(e) => update({ english_level: e.target.value })}
              placeholder="Select…"
              options={[
                { value: "Native", label: "Native" },
                { value: "Fluent", label: "Fluent" },
                { value: "Professional", label: "Professional working" },
                { value: "Conversational", label: "Conversational" },
              ]}
            />
          </div>
          {saveBar()}
        </section>

        {/* Billing & Plan */}
        <BillingSection />

        {/* Settings stopped being a second control panel (Igor, 09-07: "на главной
            выбираются фильтры — пусть там и будет главный управляющий модуль").
            Keywords / location / job type, the platform list and the submit mode all
            steer a RUN, and a run is started from the dashboard. Editing them from two
            screens wasn't a convenience: this page saves the whole profile from whatever
            snapshot it loaded, so a Save here for an unrelated field silently reverted
            the filters a live campaign was started with. What's left in Settings is who
            you are — the things a form asks about you. */}
        <section className="hd-panel p-6">
          <h3 className="font-semibold text-text">Your search</h3>
          <p className="text-sm text-text2 mt-1.5 leading-relaxed">
            Keywords, location, job type, where to apply, whether we send or you tap, and
            how your letters sound — all of it sits on the dashboard, next to the Start
            button, so a run always uses what you can see.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-3.5">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs
                font-medium bg-text text-background hover:opacity-90 transition"
            >
              Search &amp; apply settings
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="/dashboard/platforms"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs
                font-medium border border-border text-text2 hover:text-text transition"
            >
              Connect platforms
            </a>
          </div>
        </section>

        {/* Resume & ATS */}
        <ResumeATSPanel />

        {/* Apply Mode moved to a launch-time picker (FitChoiceModal on Start) —
            no longer a Settings panel. */}

      </div>
    </DashboardLayout>
  );
}
