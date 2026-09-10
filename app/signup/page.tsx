import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

import { FREE_APP_LIMIT } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign up — apply to your first 40 jobs free | HireDrop",
  description: `Create a HireDrop account and let it apply for you. Your first ${FREE_APP_LIMIT} applications are free, no card required.`,
  path: "/signup",
});

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your first 40 applications are free — no card required"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
      showcase
    >
      <SignupForm />
    </AuthLayout>
  );
}
