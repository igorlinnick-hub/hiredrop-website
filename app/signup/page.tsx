import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

import { FREE_APP_LIMIT } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign up — apply to your first 40 jobs free | HireDrop",
  description: `Create a HireDrop account and let it apply for you. Your first ${FREE_APP_LIMIT} applications are free, no card required.`,
  path: "/signup",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ affiliate?: string; email?: string }>;
}) {
  // An issued affiliate link lands here. Read server-side and passed down, so
  // the form stays free of useSearchParams and its Suspense boundary.
  const { affiliate = "", email = "" } = await searchParams;
  const affiliateCode = affiliate.slice(0, 39);

  return (
    <AuthLayout
      title={affiliateCode ? "Create your affiliate account" : "Create your account"}
      subtitle={
        affiliateCode
          ? `hiredrop.io/?ref=${affiliateCode} goes live the moment this account exists`
          : "Your first 40 applications are free — no card required"
      }
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
      showcase
    >
      <SignupForm affiliateCode={affiliateCode} prefillEmail={email.slice(0, 254)} />
    </AuthLayout>
  );
}
