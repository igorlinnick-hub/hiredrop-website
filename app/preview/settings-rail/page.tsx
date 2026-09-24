"use client";

import { useState } from "react";
import SettingsRail, {
  IconPerson, IconForm, IconDoc, IconCard, IconShare, type SettingsSection,
} from "@/components/dashboard/SettingsRail";
import { AccountFields, FormFields } from "@/components/dashboard/SettingsProfileForm";
import AmbassadorSection from "@/components/dashboard/AmbassadorSection";
import BillingSection from "@/components/dashboard/BillingSection";
import PosterPanel from "@/components/dashboard/PosterPanel";
import type { UserProfile } from "@/lib/types";

/**
 * Design-review page for the re-organised Settings (Igor 09-23: «чтоб всё было
 * простроено как надо… billing у нас нет вообще… куча всего намешано»).
 *
 * Public and mock-only, like /preview/history-chips. It renders the REAL rail
 * and the REAL section components with a mock profile, so what you judge here
 * is what the dashboard ships. Billing renders without a session, which is
 * exactly the "no plan yet" state a new account sees.
 *
 * Résumé & skills is the one section not shown: ResumeATSPanel talks to the
 * backend for its own data and has nothing to draw without a login.
 */

const SECTIONS: SettingsSection[] = [
  { id: "account", label: "Account", hint: "Name · contact · links", icon: <IconPerson /> },
  { id: "forms", label: "Application details", hint: "What forms ask", icon: <IconForm /> },
  { id: "resume", label: "Résumé & skills", hint: "ATS + tailoring", icon: <IconDoc /> },
  { id: "billing", label: "Billing", hint: "Plan · invoices", icon: <IconCard /> },
  { id: "ambassador", label: "Ambassador", hint: "Refer · earn 30%", icon: <IconShare /> },
];

const MOCK: UserProfile = {
  name: "Igor", last_name: "Linnyk", email: "igor@example.com", phone: "+1 (713) 835-1446",
  keywords: [], location: "remote", job_type: "", platforms: ["indeed"], writing_style: "",
  linkedin_url: "https://linkedin.com/in/igor-lynnik", portfolio_url: "",
  street_address: "1200 Kailua Rd", city: "Kailua", state: "HI", postal_code: "96734",
  current_employer: "Hawaii Wellness Clinic", current_title: "Marketing Lead",
  work_authorized_us: true, needs_sponsorship: false, notice_period: "2 weeks",
  english_level: "Fluent", resume_url: null, onboarding_completed: true,
};

export default function PreviewSettingsRail() {
  const [dark, setDark] = useState(false);
  const [section, setSection] = useState("account");
  const [profile, setProfile] = useState<UserProfile>(MOCK);
  const [dirty, setDirty] = useState(false);

  const update = (u: Partial<UserProfile>) => { setProfile((p) => ({ ...p, ...u })); setDirty(true); };
  const saveBar = () => (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        onClick={() => setDirty(false)}
        disabled={!dirty}
        className={[
          "px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap",
          dirty ? "bg-accent text-white hover:opacity-90 shadow-sm" : "bg-surface2 text-text2/40 cursor-default",
        ].join(" ")}
      >
        Save changes
      </button>
    </div>
  );

  return (
    <div className={`hd-dash-root app-ui ${dark ? "dark" : ""} min-h-screen bg-background`}>
      <div className="max-w-5xl mx-auto p-6 sm:p-10">
        <header className="flex items-center justify-between gap-4 pb-8">
          <div>
            <h1 className="text-xl font-bold text-text">
              <span className="text-accent">Hire</span>Drop — settings, re-organised
            </h1>
            <p className="text-xs text-text2 mt-1">
              One subject at a time: account · application details · résumé · billing · ambassador
            </p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="theme-toggle text-xs font-medium text-text2 border border-border rounded-full px-3 py-1.5 hover:text-text"
          >
            {dark ? "☀︎ Day" : "☾ Night"}
          </button>
        </header>

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

          <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <SettingsRail sections={SECTIONS} active={section} onPick={setSection} />
            </aside>

            <div className="min-w-0 space-y-3">
              {section === "account" && (
                <AccountFields profile={profile} update={update} saveBar={saveBar} />
              )}
              {section === "forms" && (
                <>
                  <FormFields profile={profile} update={update} saveBar={saveBar} />
                  <PosterPanel
                    title={<>Your search lives on the <em className="italic">dashboard</em>.</>}
                    body="Keywords, location, job type, where to apply, whether we send or you tap, and how your letters sound — all of it sits next to the Start button."
                    image="/bg/poster-search.jpg"
                  />
                </>
              )}
              {section === "resume" && (
                <div className="hd-sheet p-6">
                  <h3 className="hd-hist-sub-head">Résumé &amp; skills</h3>
                  <p className="hd-hist-sub mt-2">
                    The real panel (upload, ATS score, tailoring, skills) needs a login to have
                    anything to show — judge it on the dashboard.
                  </p>
                </div>
              )}
              {section === "billing" && <BillingSection />}
              {section === "ambassador" && <AmbassadorSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
