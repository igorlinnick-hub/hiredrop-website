import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Sign Up — HireDrop",
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start automating your job search in minutes"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
    >
      <SignupForm />
    </AuthLayout>
  );
}
