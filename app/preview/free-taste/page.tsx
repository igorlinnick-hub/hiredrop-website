import UsageBanner from "@/components/dashboard/UsageBanner";
import FreeTastePaywall from "@/components/dashboard/FreeTastePaywall";

export const metadata = {
  title: "Preview — Free Taste UI",
};

/**
 * Design-review page for the free-taste dashboard states (same pattern as
 * /preview/illustrations). Not linked from anywhere; mock data only.
 */
export default function FreeTastePreview() {
  return (
    <div className="min-h-screen bg-bg p-6 sm:p-10 space-y-10 max-w-4xl mx-auto">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide">
          Mid-taste — 28 / 40 used
        </h2>
        <UsageBanner
          tier="free"
          tierLabel="Free"
          usedToday={12}
          dailyLimit={20}
          remainingToday={8}
          platformCounts={{ indeed: 9, ziprecruiter: 3 }}
          maxPerPlatform={20}
          freeUsed={28}
          freeLimit={40}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide">
          Almost out — 36 / 40 used
        </h2>
        <UsageBanner
          tier="free"
          tierLabel="Free"
          usedToday={16}
          dailyLimit={20}
          remainingToday={4}
          platformCounts={{ indeed: 12, ziprecruiter: 4 }}
          maxPerPlatform={20}
          freeUsed={36}
          freeLimit={40}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide">
          Exhausted — the paywall moment
        </h2>
        <FreeTastePaywall freeUsed={40} freeLimit={40} />
      </section>
    </div>
  );
}
