import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// TEMPORARY preview route — public (not in the middleware matcher), so the
// onboarding quiz (premium step headers + glide-in animation) can be reviewed
// without auth or the completed-user redirect. Safe to delete after review.
export const metadata = {
  title: "Preview — Onboarding",
};

export default function PreviewOnboardingPage() {
  return <OnboardingWizard />;
}
