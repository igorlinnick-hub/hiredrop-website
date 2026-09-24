"use client";

/**
 * Ambassador — the Settings section that replaces the "Team" slot a solo
 * product has no use for (Igor 09-23: «вместо team можно ambassador и вставить
 * лендинг туда: описание и кнопку перехода»).
 *
 * The numbers here are the ones the public /affiliate page states — 30% of every
 * payment, a 60-day window, $25 minimum payout — so the two surfaces can't drift
 * into telling different stories. Nothing is claimed about earnings: the section
 * explains the deal and hands over to the page that takes applications.
 */

import PosterPanel from "@/components/dashboard/PosterPanel";

const FACTS: [string, string][] = [
  ["30%", "of every payment they make, every month they stay"],
  ["60 days", "your link keeps counting after the click"],
  ["$25", "minimum payout, sent monthly by PayPal"],
];

export default function AmbassadorSection() {
  return (
    <div className="space-y-3">
      <PosterPanel
        id="ambassador"
        testId="settings-ambassador"
        title={<>Share it, and get <em className="italic">paid</em> for it.</>}
        body="If people around you are job hunting, your link earns a cut of every subscription it brings in — for as long as they stay."
        image="/bg/poster-history-day.jpg"
        imageNight="/bg/poster-history-night.jpg"
      >
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href="/affiliate"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F2EFE9] px-5 py-2.5
              text-[14px] font-semibold text-[#14101C] transition hover:bg-white"
          >
            How the program works
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/affiliate/apply"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2.5
              text-[14px] font-medium text-white transition hover:border-white/50"
          >
            Ask for my link
          </a>
        </div>
      </PosterPanel>

      <div className="hd-sheet p-5 sm:p-6">
        <h3 className="hd-hist-sub-head">The deal</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {FACTS.map(([k, v]) => (
            <div key={k}>
              <dt className="hd-hist-num">{k}</dt>
              <dd className="hd-hist-sub mt-1.5 leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
