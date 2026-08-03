import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// TEMPORARY preview route — public (not in middleware matcher) so the mandatory
// "Connect the extension" step (step 9) can be reviewed without walking the whole
// quiz. Safe to delete after review; do NOT ship.
export const metadata = {
  title: "Preview — Connect step",
};

export default function PreviewConnectPage() {
  return <OnboardingWizard initialStep={9} />;
}
