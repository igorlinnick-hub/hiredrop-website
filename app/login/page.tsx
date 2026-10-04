import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import HeroCampaignDemo from "@/components/landing/HeroCampaignDemo";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Log in — HireDrop",
  description: "Sign in to your HireDrop account to manage your job-application campaign.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <div className="hd-auth min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#101014]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="text-[#6C5CE7]">Hire</span>Drop
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-[#101014]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h1>
            <p className="mt-2 text-sm text-[#5C574F]">Sign in to your HireDrop account</p>
          </div>

          <div className="bg-white border border-[#E7E0D2] rounded-xl p-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-[#5C574F]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#101014] underline-offset-4 hover:underline font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right — live "campaign running" demo (mirrors the Hero on the landing) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#EFE8D8] relative overflow-hidden px-8">
        {/* The self-driving apply animation on a clean, flat backdrop */}
        <div className="relative z-10 flex flex-col items-center">
          <HeroCampaignDemo />
          <p className="mt-6 text-sm text-[#5C574F] text-center max-w-sm">
            Applies from your own browser — your account stays safe
          </p>
        </div>
      </div>
    </div>
  );
}
