import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Sign Up — HireDrop",
};

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
