import Link from "next/link";

/**
 * "N approved swipes are waiting — Auto won't apply them."
 *
 * The stranded-stack notice (#185). Swipes the user approved in Tap mode are consumed
 * ONLY by a tap run: the auto walk searches job boards and never reads approved rows.
 * So a user who swiped and then ran (or switched back to) Auto has a stack that nothing
 * will ever pick up, and until now no surface said so — found live 2026-09-11 on a real
 * free user whose 4 approved swipes had been sitting since 09-02.
 *
 * `/campaign/status` reports `approved_waiting` in EVERY mode on purpose; deciding what
 * it means is this surface's job. Shown unless the mode is definitively "tap", because
 * an unknown mode is not a reason to stay silent: a notice shown to a tap user is a link
 * to the deck they already wanted, while silence to an auto user is the bug itself.
 *
 * Colours come from the theme tokens, so day (amber, #144) and night (violet) both follow
 * with no hardcoded values — this is a call to action, not a fault, and it should read as
 * ordinary brand chrome rather than an alarm.
 */
export default function ApprovedWaitingBanner({
  count,
  submitMode,
}: {
  count: number;
  submitMode?: string | null;
}) {
  if (!count || count < 1) return null;
  if (submitMode === "tap") return null;

  const swipes = count === 1 ? "swipe" : "swipes";

  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-light px-4 py-3">
      <svg className="w-5 h-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8}
        viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text leading-snug">
          {count} approved {swipes} waiting — Auto won&apos;t apply {count === 1 ? "it" : "them"}
        </p>
        <p className="text-xs text-text2 leading-snug mt-0.5">
          You approved {count === 1 ? "this one" : "these"} on the Tap deck. Auto-apply searches job
          boards and never picks up approved swipes — open the deck to send {count === 1 ? "it" : "them"}.
        </p>
      </div>

      <Link
        href="/dashboard/tap"
        className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white
          hover:bg-accent-hover transition"
      >
        Open Tap deck
      </Link>
    </div>
  );
}
