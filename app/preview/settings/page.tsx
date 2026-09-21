import PosterPanel from "@/components/dashboard/PosterPanel";

import SettingsPreviewClient from "./SettingsPreviewClient";

export const metadata = { title: "Settings rhythm — preview" };

// Logged-out look at the Settings page rhythm Igor asked for: a black-and-white
// panel, then a picture, then black-and-white, then a picture. The form fields are
// stand-ins (the real page needs a session); the poster blocks and the .hd-panel
// treatment are the real thing. `?dark=1` flips the shell.
export default async function SettingsRhythmPreview(
  { searchParams }: { searchParams: Promise<{ dark?: string }> }
) {
  const { dark } = await searchParams;
  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
        <div>
          <h2 className="text-xl font-bold text-text">Profile Settings</h2>
          <p className="mt-1 text-sm text-text2">Update your information and preferences.</p>
        </div>

        <section className="hd-panel space-y-4 p-6">
          <h3 className="font-semibold text-text">Personal Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {["First name", "Last name"].map(l => (
              <label key={l} className="block">
                <span className="text-sm font-medium text-text">{l}</span>
                <div className="mt-1.5 h-10 rounded-lg border border-border bg-background" />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-sm font-medium text-text">Email</span>
            <div className="mt-1.5 h-10 rounded-lg border border-border bg-background" />
          </label>
        </section>

        <PosterPanel
          title={<>Your search lives on the <em className="italic">dashboard</em>.</>}
          body="Keywords, location, job type, where to apply, whether we send or you tap, and how your letters sound — all of it sits next to the Start button, so a run always uses what you can see."
          image="/bg/poster-search.jpg"
        >
          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="rounded-xl bg-[#F2EFE9] px-5 py-2.5 text-[14px] font-semibold text-[#14101C]">
              Search &amp; apply settings
            </span>
            <span className="rounded-xl border border-white/25 px-4 py-2.5 text-[14px] font-medium text-white">
              Connect platforms
            </span>
          </div>
        </PosterPanel>

        <section className="hd-panel space-y-3 p-6">
          <h3 className="font-semibold text-text">Resume &amp; ATS</h3>
          <p className="text-sm text-text2">Manage which version employers receive.</p>
          <div className="rounded-xl border border-border bg-surface2/60 p-4">
            <p className="text-xs text-text2">Base resume for applications</p>
            <p className="text-sm font-semibold text-text">Your original resume</p>
          </div>
        </section>

        <SettingsPreviewClient />
      </div>
    </div>
  );
}
