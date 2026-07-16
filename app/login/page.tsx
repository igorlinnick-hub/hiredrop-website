import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import HeroCampaignDemo from "@/components/landing/HeroCampaignDemo";

export const metadata = {
  title: "Log In — HireDrop",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="text-[#6C5CE7]">Hire</span>Drop
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h1>
            <p className="mt-2 text-sm text-[#6B6B8A]">Sign in to your HireDrop account</p>
          </div>

          <div className="bg-white border border-[#E8E8F0] rounded-xl p-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-[#6B6B8A]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6C5CE7] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right — live "campaign running" demo (mirrors the Hero on the landing) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#f0f4ff] relative overflow-hidden px-8">
        {/* The self-driving apply animation on a clean, flat backdrop */}
        <div className="relative z-10 flex flex-col items-center">
          <HeroCampaignDemo />
          <p className="mt-6 text-sm text-[#6B6B8A] text-center max-w-sm">
            Applies from your own browser — your account stays safe
          </p>
        </div>
      </div>
    </div>
  );
}
