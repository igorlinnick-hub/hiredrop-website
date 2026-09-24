"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PosterPanel from "@/components/dashboard/PosterPanel";
import ResumeATSPanel from "@/components/dashboard/ResumeATSPanel";
import BillingSection from "@/components/dashboard/BillingSection";
import AmbassadorSection from "@/components/dashboard/AmbassadorSection";
import SettingsRail, {
  IconPerson, IconForm, IconDoc, IconCard, IconShare, type SettingsSection,
} from "@/components/dashboard/SettingsRail";
import { AccountFields, FormFields } from "@/components/dashboard/SettingsProfileForm";
import type { UserProfile } from "@/lib/types";

/* The sections of Settings, in the order a person needs them: who you are →
   what the forms ask about you → your résumé → what you pay → the referral
   deal. "Ambassador" takes the slot a team product would give to Team (Igor
   09-23) — a solo job seeker has no team, but they do have friends job
   hunting. */
const SECTIONS: SettingsSection[] = [
  { id: "account", label: "Account", hint: "Name · contact · links", icon: <IconPerson /> },
  { id: "forms", label: "Application details", hint: "What forms ask", icon: <IconForm /> },
  { id: "resume", label: "Résumé & skills", hint: "ATS + tailoring", icon: <IconDoc /> },
  { id: "billing", label: "Billing", hint: "Plan · invoices", icon: <IconCard /> },
  { id: "ambassador", label: "Ambassador", hint: "Refer · earn 30%", icon: <IconShare /> },
];

const emptyProfile: UserProfile = {
  name: "",
  last_name: "",
  email: "",
  phone: "",
  keywords: [],
  location: "remote",
  job_type: "",
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
  // Which section is open. The deep link from the "Upgrade →" banner (?tab=billing)
  // now opens a SECTION instead of scrolling a long page to an anchor.
  const [section, setSection] = useState("account");

  // Client component can't export `metadata`; set the tab title directly.
  useEffect(() => {
    document.title = "Settings — HireDrop";
  }, []);

  // Deep link: ?tab=<section>. Read window.location directly to avoid a
  // useSearchParams Suspense boundary. Written back on every pick so the open
  // section survives a reload and can be shared as a link.
  useEffect(() => {
    // Read it in a frame callback, not in the effect body: setting state
    // synchronously there is what the React compiler rules forbid, and reading
    // location during render would make the render impure (and mismatch SSR).
    const raf = requestAnimationFrame(() => {
      const want = new URLSearchParams(window.location.search).get("tab");
      if (want && SECTIONS.some((x) => x.id === want)) setSection(want);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function pickSection(id: string) {
    setSection(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
          // `?? ""` and NOT `|| "full-time"`: an empty/NULL job_type means "any type"
          // and must survive a page load. The old fallback made the picker claim
          // Full-time over a profile that had no type set at all — and a Save from that
          // screen then wrote the narrowing to the database, silently shrinking the
          // user's search to a filter they never chose.
          job_type: data.job_type ?? "",
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

  const activeLabel = SECTIONS.find((x) => x.id === section)?.label ?? "Settings";

  return (
    <DashboardLayout>
      {/* Same ground as History: the day page carries our regraded wallpaper and
          every block is a white sheet with ink type on it. */}
      <div className="hd-ground space-y-7">
        <div>
          <p className="hd-eyebrow">Settings</p>
          <h1 className="hd-hist-display mt-2">
            Everything about <em className="italic">you</em>.
          </h1>
          <p className="hd-hist-sub mt-2.5 max-w-xl leading-relaxed">
            What we tell employers, what we charge you, and what you earn for sending
            people our way — one subject at a time.
          </p>
        </div>

        {error && <div className="hd-sheet p-3 text-sm text-red">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SettingsRail sections={SECTIONS} active={section} onPick={pickSection} />
          </aside>

          <div className="min-w-0 space-y-3">
            {/* The open section's name, so the right-hand column is never an
                unlabelled slab of fields on a narrow screen. */}
            <p className="hd-eyebrow lg:hidden">{activeLabel}</p>

            {section === "account" && (
              <AccountFields profile={profile} update={update} saveBar={saveBar} />
            )}

            {section === "forms" && (
              <>
                <FormFields profile={profile} update={update} saveBar={saveBar} />
                {/* Settings stopped being a second control panel (Igor, 09-07: "на
                    главной выбираются фильтры — пусть там и будет главный управляющий
                    модуль"). Keywords / location / job type, the platform list and the
                    submit mode all steer a RUN, and a run is started from the dashboard.
                    Editing them from two screens wasn't a convenience: this page saves the
                    whole profile from whatever snapshot it loaded, so a Save here for an
                    unrelated field silently reverted the filters a live campaign was
                    started with. What's left in Settings is who you are. */}
                <PosterPanel
                  title={<>Your search lives on the <em className="italic">dashboard</em>.</>}
                  body="Keywords, location, job type, where to apply, whether we send or you tap, and how your letters sound — all of it sits next to the Start button, so a run always uses what you can see."
                  image="/bg/poster-search.jpg"
                >
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <a
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F2EFE9] px-5 py-2.5
                        text-[14px] font-semibold text-[#14101C] transition hover:bg-white"
                    >
                      Search &amp; apply settings
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    <a
                      href="/dashboard/platforms"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2.5
                        text-[14px] font-medium text-white transition hover:border-white/50"
                    >
                      Connect platforms
                    </a>
                  </div>
                </PosterPanel>
              </>
            )}

            {section === "resume" && <ResumeATSPanel />}
            {section === "billing" && <BillingSection />}
            {section === "ambassador" && <AmbassadorSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
