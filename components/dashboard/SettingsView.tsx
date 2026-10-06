"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session-user";
import PosterPanel from "@/components/dashboard/PosterPanel";
import DropCameo from "@/components/landing/DropCameo";
import SettingsRail, {
  IconPerson, IconForm, IconDoc, IconCard, IconShare, type SettingsSection,
} from "@/components/dashboard/SettingsRail";
import { AccountFields, FormFields } from "@/components/dashboard/SettingsProfileForm";
import { profileFromRow, settingsPatch } from "@/lib/settings/profile";
import type { UserProfile } from "@/lib/types";

/* One section is open at a time, so the three heavy ones load when picked
   instead of riding along with every Settings visit. */
const SectionLoading = () => <div className="hd-sheet min-h-[240px]" aria-busy="true" />;
const ResumeATSPanel = dynamic(() => import("@/components/dashboard/ResumeATSPanel"), { loading: SectionLoading });
const BillingSection = dynamic(() => import("@/components/dashboard/BillingSection"), { loading: SectionLoading });
const AmbassadorSection = dynamic(() => import("@/components/dashboard/AmbassadorSection"), { loading: SectionLoading });

/* The sections of Settings, in the order a person needs them: who you are →
   what the forms ask about you → your résumé → what you pay → the referral
   deal. "Ambassador" takes the slot a team product would give to Team (Igor
   09-23) — a solo job seeker has no team, but they do have friends job
   hunting. */
const SECTIONS: SettingsSection[] = [
  { id: "account", label: "Account", icon: <IconPerson /> },
  { id: "forms", label: "Application details", icon: <IconForm /> },
  { id: "resume", label: "Résumé & skills", icon: <IconDoc /> },
  { id: "billing", label: "Billing", icon: <IconCard /> },
  { id: "ambassador", label: "Ambassador", icon: <IconShare /> },
];

/** The profile arrives from the server (app/dashboard/settings/page.tsx), so the
    page paints with the person's data instead of a "Loading profile..." screen.

    That payload can be OLD: Back/Forward reuses the page as first rendered. So the
    view re-reads the row once in the background and takes it while nothing has
    been typed — and a Save only ever sends the fields typed on this screen
    (settingsPatch), so an old screen can't write back over newer answers. */
export default function SettingsView({ initialProfile }: { initialProfile: UserProfile }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  // What the two opt-out-able answers were when the page loaded (see the save).
  const loaded = useRef({
    school: initialProfile.school || "",
    salary_expectation: initialProfile.salary_expectation || "",
  });
  // Fields edited on this screen since the last save — the only ones a Save sends.
  const touched = useRef(new Set<string>());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false); // unsaved changes → the Save button lights up
  const [error, setError] = useState("");
  // Which section is open. The deep link from the "Upgrade →" banner (?tab=billing)
  // now opens a SECTION instead of scrolling a long page to an anchor.
  const [section, setSection] = useState("account");

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await sessionUser();
      if (!user) return;
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      // Keep what is on screen if the read failed or the person already started typing.
      if (!alive || readError || !data || touched.current.size > 0) return;
      const fresh = profileFromRow(data, user.email);
      setProfile(fresh);
      loaded.current = { school: fresh.school || "", salary_expectation: fresh.salary_expectation || "" };
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  function update(updates: Partial<UserProfile>) {
    for (const k of Object.keys(updates)) touched.current.add(k);
    setProfile((prev) => ({ ...prev, ...updates }));
    setSaved(false);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const user = await sessionUser();
    if (!user) {
      setSaving(false);
      setError("Your session expired — refresh the page and save again.");
      return;
    }

    // Only what was typed here (see settingsPatch) — dashboard-owned filters never.
    const sent = new Set(touched.current);
    const patch = settingsPatch(profile, sent, loaded.current);
    const { error: saveError } = Object.keys(patch).length
      ? await supabase.from("profiles").update(patch).eq("user_id", user.id)
      : { error: null };

    setSaving(false);

    if (saveError) {
      setError("Failed to save. Please try again.");
      return;
    }

    // Only a save that landed moves the baseline the opt-out comparison uses.
    loaded.current = {
      school: profile.school || "",
      salary_expectation: profile.salary_expectation || "",
    };
    for (const k of sent) touched.current.delete(k);
    setSaved(true);
    setDirty(touched.current.size > 0); // typed while the save was in flight → still unsaved
    setTimeout(() => setSaved(false), 3000);
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
    /* Same ground as History: the day page carries our regraded wallpaper and
       every block is a white sheet with ink type on it. */
    <div className="hd-ground space-y-7">
      <div className="relative">
        <p className="hd-eyebrow">Settings</p>
        <h1 className="hd-hist-display mt-2">
          Everything about <em className="italic">you</em>.
        </h1>
        {/* Drop sits on the header's right edge — one per page, desktop only */}
        <DropCameo pose="sit" width={132} enter="up" className="hidden md:block absolute right-2 -top-4" />
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
  );
}
