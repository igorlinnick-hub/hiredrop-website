// The part of the Start gate a Tap run must pass too — pure, so `node --test` can hold it.
//
// A Tap run used to start by posting HIREDROP_START_CAMPAIGN straight to the extension,
// never asking the server: the first-Approve auto-start and the progress dock's "Apply"
// both skipped GET /campaign/readiness, and the extension does not check the employer
// answers itself. So a person who deferred the questions past signup could still send
// applications that stop on "Most recent employer" at the last step.
//
// Only the checks the run cannot do without block it. The others (keywords, a run already
// marked running, the free quota) mean something else for a deck of approved cards, and
// the extension already guards the ones that matter there.
export const TAP_BLOCKING_CHECKS = ["onboarding", "us_only", "employer_answers", "resume"];

export interface GateCheck {
  id: string;
  ok: boolean;
  reason: string | null;
  fix?: string | null;
}

/** The server said no. Carries its failed checks; the message is for the person. */
export class TapStartRefused extends Error {
  checks: GateCheck[];
  constructor(checks: GateCheck[]) {
    const reasons = checks.map((c) => (c.reason || "").replace(/[.\s]+$/, "")).filter(Boolean);
    super(
      `${reasons.join(". ") || "Something is missing before we can apply"}. ` +
        "Press Apply approved in Tap to finish it.",
    );
    this.name = "TapStartRefused";
    this.checks = checks;
  }
}

/** The failed checks that stop a Tap run; empty = go. Anything unreadable (an older or
 *  broken response) is no refusal — the same fail-open the Start buttons use. */
export function tapRefusal(readiness: unknown): GateCheck[] {
  const checks = (readiness as { checks?: unknown } | null)?.checks;
  if (!Array.isArray(checks)) return [];
  return checks.filter(
    (c): c is GateCheck =>
      !!c && typeof c === "object" && (c as GateCheck).ok === false &&
      TAP_BLOCKING_CHECKS.includes((c as GateCheck).id),
  );
}
