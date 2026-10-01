import Link from "next/link";
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

function FitChip({ job }: { job: Job }) {
  if (job.fit_current && typeof job.fit_score === "number") {
    const tone =
      job.fit_score >= 70 ? "bg-green/10 text-green border-green/25"
      : job.fit_score >= 55 ? "bg-accent/10 text-accent border-accent/25"
      : "bg-surface2 text-text2 border-border";
    return (
      <span
        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${tone}`}
        title="Fit judge's score for your current resume and preferences"
      >
        {job.fit_score} fit
      </span>
    );
  }
  return (
    <span
      className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-surface2 text-text2 border-border"
      title="Not judged ahead of time — the fit judge checks it the moment we apply, and skips it if it doesn't fit."
    >
      Fit checked when applying
    </span>
  );
}

export default function TodayList({
  jobs,
  fitsToday,
}: {
  jobs: Job[];
  /** null = the list could not be read; never shown as a 0. */
  fitsToday: number | null;
}) {
  const unjudged = jobs.length - (fitsToday ?? 0);
  return (
    <section className="hd-sheet overflow-hidden" data-testid="today-list">
      <header className="p-4 sm:p-5 border-b border-border flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-semibold text-text">
          {fitsToday === null ? (
            "Today's list"
          ) : (
            <>
              <span className="tabular-nums">{fitsToday}</span> {fitsToday === 1 ? "fits" : "fit"} you today
            </>
          )}
        </h3>
        <p className="text-xs text-text2">
          Freshest first — the order Auto and Tap apply in.
          {unjudged > 0 && ` ${unjudged} more get checked for fit as we apply.`}
        </p>
        {jobs.length > 0 && (
          <Link href="/dashboard/tap" className="sm:ml-auto text-xs font-medium text-accent hover:text-accent2">
            Swipe through them →
          </Link>
        )}
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
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
                    <FitChip job={job} />
                  </div>
                  {job.fit_current && job.fit_reason && (
                    <p className="mt-1.5 text-xs leading-snug text-text2 line-clamp-2" title={job.fit_reason}>
                      <span className="font-medium text-text">Judge&apos;s note: </span>
                      {job.fit_reason}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
