import Link from "next/link";

import AffiliateHero from "@/components/affiliate/AffiliateHero";

/**
 * The affiliate program on the landing (Igor, 2026-10-03: "I don't see it at
 * all, even at the bottom" — the only way in was one grey footer link).
 *
 * It sits after the final signup CTA, not in the header or mid-page: the page
 * sells to job seekers first, and an earn-money offer above that CTA would pull
 * the main visitor sideways. Here it is the next thing a reader meets once they
 * have heard the whole pitch.
 *
 * Same panel as /affiliate and the dashboard (AffiliateHero) so the three read
 * as one program. Drop is deliberately absent: standing in front of the
 * circles it covered faces (Igor 10-03).
 */
export default function AffiliateBand() {
  return (
    <section id="affiliate" className="bg-[#0f0f17] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AffiliateHero
          headingAs="h2"
          eyebrow="Affiliate program"
          title={
            <>
              Everyone you know is <em className="italic">job hunting</em>. Get paid for the tip.
            </>
          }
          body="Share your link and earn 30% of every payment the people you refer make — every month they stay. Paid automatically through Stripe."
          smartCta={{ label: "Get your link" }}
          note={
            <>
              No audience needed — a class group chat counts.{" "}
              <Link href="/affiliate" className="text-white/70 underline underline-offset-4 hover:text-white">
                How it works
              </Link>
            </>
          }
        />
      </div>
    </section>
  );
}
