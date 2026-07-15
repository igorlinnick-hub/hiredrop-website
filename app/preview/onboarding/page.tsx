import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// TEMPORARY preview route — public (not in middleware matcher) so the onboarding
// UI can be reviewed without auth. Safe to delete after review; do NOT ship.
export const metadata = {
  title: "Preview — Onboarding",
};

export default function PreviewOnboardingPage() {
  return <OnboardingWizard />;
}
