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
    // The page is cream; one white frame holds both halves, split by a hairline.
    <div className="hd-auth min-h-screen flex items-center justify-center bg-background p-4 sm:p-8 lg:p-10">
    <div className="w-full max-w-6xl flex min-h-[640px] rounded-3xl bg-white border border-[#E7E0D2] overflow-hidden"
      style={{ boxShadow: "0 24px 60px -32px rgba(58,44,18,0.22)" }}>
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#101014]" style={{ fontFamily: "var(--hd-font-display), sans-serif" }}>
              <span className="text-[#6C5CE7]">Hire</span>Drop
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-[#101014]" style={{ fontFamily: "var(--hd-font-display), sans-serif" }}>Welcome back</h1>
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
      <div
        className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden px-8 border-l border-[#E7E0D2]"
        style={{ background: "radial-gradient(120% 90% at 30% 20%, #8A6248 0%, #5B3E2B 45%, #2E1F16 100%)" }}
      >
        {/* The self-driving apply animation on a clean, flat backdrop */}
        <div className="relative z-10 flex flex-col items-center">
          <HeroCampaignDemo />
        </div>
      </div>
    </div>
    </div>
  );
}
