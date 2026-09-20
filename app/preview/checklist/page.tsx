import ChecklistCard from "@/components/dashboard/ChecklistCard";
import StatsCards from "@/components/dashboard/StatsCards";

export const metadata = { title: "Checklist — preview" };

// Logged-out look at the rail checklist, staged in a stand-in for the dashboard
// shell (the real one needs a session). The block is the real component, so with
// no session every row reads undone — that's the empty state, not a mock.
export default function ChecklistPreview() {
  return (
    <div className="min-h-screen bg-background hd-dash-root">
      <div className="flex min-h-screen">
        {/* Stand-in for the nav rail — the checklist block sits inside it */}
        <aside className="hd-sidenav hidden lg:flex flex-col w-[236px] shrink-0 sticky top-0 h-screen
          border-r border-border bg-surface/75 backdrop-blur-xl px-3 py-5">
          <span className="px-3.5 mb-7 text-lg font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </span>
          {["Dashboard", "History", "Platforms"].map((l, i) => (
            <span key={l} className={[
              "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium",
              i === 0 ? "nav-active bg-accent/10 text-accent" : "text-text2",
            ].join(" ")}>{l}</span>
          ))}
          <div className="mt-6">
            <ChecklistCard />
          </div>

          <div className="mt-auto flex flex-col gap-1">
            {["Extension", "Settings"].map((l) => (
              <span key={l} className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium text-text2">{l}</span>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="border-b border-border bg-surface">
            <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-end h-14 gap-3">
              <span className="text-sm text-text2">Balanced fit</span>
              <span className="w-8 h-8 rounded-full bg-surface2 border border-border" />
            </div>
          </header>

          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <p className="text-xs text-text2/70">
              Preview — the checklist in the rail is the real component; everything else is a
              stand-in for the dashboard.
            </p>

            {/* Where the search filters + Start live on the real page */}
            <div className="hd-glass rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {["product manager", "program manager", "remote"].map((k) => (
                  <span key={k} className="px-3 py-1.5 rounded-full bg-surface2 border border-border text-sm text-text2">{k}</span>
                ))}
              </div>
              <div className="h-11 rounded-xl bg-surface2 border border-border" />
              <div className="flex gap-3">
                <span className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold">Start applying</span>
                <span className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text2">Find jobs</span>
              </div>
            </div>

            <StatsCards totalJobs={719} totalApplications={128} applicationsToday={0} />

            <div className="hd-glass rounded-2xl p-5">
              <p className="text-sm font-semibold text-text mb-3">Your jobs</p>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-surface2/60 border border-border" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
