import DashboardLayout from "@/components/dashboard/DashboardLayout";

/**
 * Instant loading state for every /dashboard/* route.
 *
 * Without it, a client navigation into a dashboard page kept the PREVIOUS page on
 * screen until the server finished rendering — and these pages await Railway
 * (/stats, /jobs, /campaign/status, /applications/history). Leaving the deck felt
 * like the back button had swallowed the click (Igor 09-19). With a loading
 * fallback the shell swaps immediately and the data streams in behind it.
 *
 * It renders the real DashboardLayout, so the rail, the top bar and the checklist
 * stay put — only the content area is a skeleton. A bare full-screen spinner would
 * have thrown the whole chrome away for a second, which reads as a page flash.
 */
export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
        <div className="h-8 w-48 rounded-lg bg-surface2" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface2 border border-border" />
          ))}
        </div>

        <div className="h-32 rounded-2xl bg-surface2 border border-border" />

        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface2/70 border border-border" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
