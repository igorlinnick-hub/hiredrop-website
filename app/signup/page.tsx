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
  // Two different arrivals, one parameter. `affiliate=<code>` is an issued
  // link whose code is reserved for that email — the invite we send. Plain
  // `affiliate=1` is someone off the landing page who has no code yet and is
  // here to ask for one; they get the affiliate wording and the affiliate
  // destination, but nothing is promised to them.
  const { affiliate = "", email = "" } = await searchParams;
  const raw = affiliate.slice(0, 39);
  const affiliateIntent = raw.length > 0;
  const affiliateCode = raw === "1" || raw === "yes" ? "" : raw;

  return (
    <AuthLayout
      title={affiliateIntent ? "Create your affiliate account" : "Create your account"}
      subtitle={
        affiliateCode
          ? `hiredrop.io/?ref=${affiliateCode} goes live the moment this account exists`
          : affiliateIntent
            ? "Then four questions, and a person reads them — usually within a day or two"
            : "Your first 40 applications are free — no card required"
      }
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
      showcase
    >
      <SignupForm
        affiliateCode={affiliateCode}
        affiliateIntent={affiliateIntent}
        prefillEmail={email.slice(0, 254)}
      />
    </AuthLayout>
  );
}
