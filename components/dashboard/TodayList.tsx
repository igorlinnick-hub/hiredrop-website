import { PLATFORMS } from "@/lib/constants";
import type { Job } from "@/lib/types";

// Today's list on the dashboard — the SAME list Tap swipes and auto applies in
// (GET /jobs/deck, daily-30). Until 09-30 this spot was the archive (GET /jobs: every row
// ever harvested, under every keyword set ever tried), so the dashboard, the deck and the
// run each showed a different "your jobs". Igor, 09-30: the user sees today's list, not
// the archive; freshest first; the headline counts only what the fit judge passed — no
// "of 30" and no pool size. Applications live in History, not here.

const BRAND: Record<string, string> = {
  indeed: "#2557a7",
  greenhouse: "#1f7a54",
  lever: "#5522e8",
  ashby: "#4b4ef0",
};

function age(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const hours = Math.max(0, Math.round((Date.now() - t) / 3_600_000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function TodayList({
  jobs,
  fitsToday,
}: {
  jobs: Job[];
  /** null = the list could not be read; never shown as a 0. */
  fitsToday: number | null;
}) {
  return (
    <section className="hd-sheet overflow-hidden" data-testid="today-list">
      <header className="p-4 sm:p-5 border-b border-border">
        <h3 className="font-semibold text-text">
          {fitsToday === null ? (
            "Today's list"
          ) : (
            <>
              <span className="tabular-nums">{fitsToday}</span> {fitsToday === 1 ? "fits" : "fit"} you today
            </>
          )}
        </h3>
      </header>

      {fitsToday === null ? (
        <p className="px-5 py-8 text-center text-sm text-text2">
          Couldn&apos;t load today&apos;s list — refresh in a moment.
        </p>
      ) : jobs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-text2">
          Nothing fits today yet. Scan jobs above, or widen your search.
        </p>
      ) : (
        <ol className="max-h-[72vh] overflow-auto hd-scroll divide-y divide-border">
          {jobs.map((job) => {
            const name = PLATFORMS.find((p) => p.id === job.platform)?.name || job.platform;
            const brand = BRAND[job.platform] || "#6C5CE7";
            return (
              <li key={job.id} className="px-4 sm:px-5 py-3.5 flex items-start gap-3">
                <span
                  aria-label={name}
                  title={name}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0 select-none mt-0.5"
                  style={{ backgroundColor: `${brand}22`, color: brand }}
                >
                  {name ? name[0].toUpperCase() : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-medium text-text hover:text-accent truncate"
                  >
                    {job.title || "Untitled role"}
                  </a>
                  <p className="text-xs text-text2 truncate">
                    {job.company || "—"} · {name}
                    {job.date_found && <span className="text-text2/70"> · {age(job.date_found)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
