/**
 * Pricing model for HireDrop credit system.
 *
 * 1 credit = 1 cent (USD). Keeps mental math trivial — 100 credits = $1.
 *
 * NUMBERS ARE PLACEHOLDERS until the cost ledger backend ships.
 * Real per-call costs will live in the `usage_ledger` table; see
 * BILLING_LEDGER_TASKS.md for the migration plan.
 */

export type SourceTier = "free" | "standard" | "premium";

export interface JobSource {
  id: string;
  name: string;
  tier: SourceTier;
  /** Cost per job sourced (in credits = cents). Estimate, refined post-ledger. */
  sourceCostCredits: number;
  description: string;
}

export const JOB_SOURCES: JobSource[] = [
  {
    id: "greenhouse",
    name: "Greenhouse",
    tier: "free",
    sourceCostCredits: 0,
    description: "Tech companies, YC startups. Official API.",
  },
  {
    id: "lever",
    name: "Lever",
    tier: "free",
    sourceCostCredits: 0,
    description: "Tech ATS. Official API.",
  },
  {
    id: "ashby",
    name: "Ashby",
    tier: "free",
    sourceCostCredits: 0,
    description: "Modern ATS, AI-forward orgs. Official API.",
  },
  {
    id: "workable",
    name: "Workable",
    tier: "free",
    sourceCostCredits: 0,
    description: "SMB / European reach. Official API.",
  },
  {
    id: "wwr",
    name: "We Work Remotely",
    tier: "free",
    sourceCostCredits: 0,
    description: "Remote-first roles. Public RSS.",
  },
  {
    id: "google_jobs",
    name: "Google Jobs",
    tier: "standard",
    sourceCostCredits: 2,
    description: "Indeed, LinkedIn, Workday via Google. Paid aggregator.",
  },
  {
    id: "theirstack",
    name: "TheirStack",
    tier: "premium",
    sourceCostCredits: 4,
    description: "315k+ sources. Fallback when free tier gap-coverage.",
  },
];

/** Per-application LLM and submission costs (credits = cents). Stub estimates. */
export const PER_APPLICATION_COSTS = {
  scoring: 1, // Haiku-class scoring of the JD against profile
  coverLetter: 3, // Sonnet-class personalized cover letter
  submit: 1, // Form-fill compute + light vision
} as const;

export const FIXED_PER_APP_COST =
  PER_APPLICATION_COSTS.scoring +
  PER_APPLICATION_COSTS.coverLetter +
  PER_APPLICATION_COSTS.submit; // 5 credits today

/** Default markup applied to internal cost to derive user-facing credit price. */
export const MARKUP_MULTIPLIER = 4;

export interface CostBreakdown {
  applications: number;
  /** Weighted source cost per application, based on the picked mix. */
  sourceCostPerApp: number;
  /** Total internal cost per application (source + LLM + submit). */
  internalCostPerApp: number;
  /** User-facing price per application (with markup). */
  pricePerApp: number;
  /** Total user-facing price across all applications. */
  totalPrice: number;
  /** Components — for the UI breakdown. */
  components: {
    source: number;
    scoring: number;
    coverLetter: number;
    submit: number;
  };
}

/**
 * Estimate cost for N applications given a source mix.
 *
 * `sourceMix` is a record of sourceId -> share (0-1). Shares should sum to 1
 * but we normalize defensively in case the caller is sloppy.
 */
export function estimateCost(
  applications: number,
  sourceMix: Record<string, number>,
): CostBreakdown {
  const totalShare = Object.values(sourceMix).reduce((s, v) => s + v, 0) || 1;
  const weightedSourceCost = JOB_SOURCES.reduce((acc, src) => {
    const share = (sourceMix[src.id] ?? 0) / totalShare;
    return acc + share * src.sourceCostCredits;
  }, 0);

  const internalPerApp = weightedSourceCost + FIXED_PER_APP_COST;
  const pricePerApp = internalPerApp * MARKUP_MULTIPLIER;

  return {
    applications,
    sourceCostPerApp: weightedSourceCost,
    internalCostPerApp: internalPerApp,
    pricePerApp,
    totalPrice: pricePerApp * applications,
    components: {
      source: weightedSourceCost * MARKUP_MULTIPLIER,
      scoring: PER_APPLICATION_COSTS.scoring * MARKUP_MULTIPLIER,
      coverLetter: PER_APPLICATION_COSTS.coverLetter * MARKUP_MULTIPLIER,
      submit: PER_APPLICATION_COSTS.submit * MARKUP_MULTIPLIER,
    },
  };
}

/** Format credits (cents) as a dollar string: 2350 -> "$23.50". */
export function formatUsd(credits: number): string {
  const dollars = credits / 100;
  if (dollars >= 100) return `$${dollars.toFixed(0)}`;
  return `$${dollars.toFixed(2)}`;
}

export const TIER_LABEL: Record<SourceTier, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
};

export const TIER_BADGE_CLASS: Record<SourceTier, string> = {
  free: "bg-green/10 text-green",
  standard: "bg-accent/10 text-accent",
  premium: "bg-yellow/15 text-yellow",
};
