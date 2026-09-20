import SetupDock from "@/components/dashboard/SetupDock";

export const metadata = { title: "Setup dock — preview" };

// Logged-out preview of the left-edge setup dock (the checklist that replaced the
// stack of full-width cards at the top of the dashboard). No session here, so the
// live probes resolve to "not installed / not connected" and every server step
// comes from the props below.
export default function SetupDockPreview() {
  return (
    <div className="min-h-screen bg-background p-8 hd-dash-root">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-text">Setup dock</h1>
        <p className="text-sm text-text2">
          The checklist now lives bottom-left as a collapsible popup. It also holds
          Job platforms and Letter voice, which used to sit loose in the dashboard flow,
          and the plan/usage line from the old full-width usage card.
        </p>
        <div className="hd-glass rounded-2xl p-6 text-sm text-text2">
          Page content sits here, undisturbed — the dock floats over it.
        </div>
      </div>

      <SetupDock
        onboardingComplete
        hasResume
        hasKeywords
        hasSkills={false}
        tier="admin"
        tierLabel="Admin"
        usedToday={0}
        dailyLimit={0}
      />
    </div>
  );
}
