// The onboarding steps, in order. One list: the progress row, the header art and the
// saved-progress snapshot all read it.
//
// `art` is the header image (public/onboarding/step-N.jpg, made by
// scripts/gen_onboarding.py --drop): Drop acting out that step. Step 4 draws its own
// header (platform logos), so it has no file.
export const STEPS = [
  { id: 1, title: "Profile", art: 1 },
  { id: 2, title: "Preferences", art: 2 },
  { id: 3, title: "Safety", art: 3 },
  { id: 4, title: "Platforms", art: 4 },
  { id: 5, title: "Resume", art: 5 },
  { id: 6, title: "ATS", art: 6 },
  { id: 7, title: "Answers", art: 7 },
  { id: 8, title: "Style", art: 8 },
  { id: 9, title: "Plan", art: 9 },
  { id: 10, title: "Connect", art: 10 },
  { id: 11, title: "Done", art: 11 },
] as const;

export const STEP = { ats: 6, answers: 7, connect: 10, done: 11 } as const;

// Bumped whenever a step is inserted, so a snapshot saved under the old numbering is
// translated instead of trusted.
export const SNAPSHOT_VERSION = 2;

/** Where a saved snapshot resumes. The extension step reloads the tab once, mid-wizard,
 *  and resumes from this number — a snapshot written before "Answers" existed says 9
 *  for Connect, which is Plan now. Everything from the insertion point on moves by one. */
export function resumeStep(saved: { v?: number; step?: number } | null): number | undefined {
  const step = saved?.step;
  if (typeof step !== "number" || !Number.isInteger(step) || step < 1) return undefined;
  const moved = saved?.v === SNAPSHOT_VERSION || step < STEP.answers ? step : step + 1;
  return Math.min(moved, STEPS.length);
}
