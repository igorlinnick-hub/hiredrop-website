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
    // The page is cream. The form sits on it directly. The demo is a panel pressed into
    // the page from the bottom-right corner: it bleeds off the screen edge, and its
    // shadow falls inward so it reads as sunk into the background, not lying on top.
    <div className="hd-auth relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 p-4 sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10">
        {/* Left — form, straight on the cream page */}
        <div className="flex flex-col items-center justify-center px-2 py-8 sm:px-6">
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
      </div>

      {/* Right — live demo, pressed into the page from the bottom-right corner */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[78%] w-[52%] items-center justify-center overflow-hidden rounded-tl-[56px] lg:flex"
        style={{
          background: "radial-gradient(120% 90% at 30% 20%, #8A6248 0%, #5B3E2B 45%, #2E1F16 100%)",
          boxShadow:
            "inset 18px 18px 40px -12px rgba(20,12,6,0.55), inset 0 0 0 1px rgba(46,31,22,0.35), inset 0 0 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* The self-driving apply animation on a clean, flat backdrop */}
        <div className="pointer-events-auto relative z-10 flex flex-col items-center -translate-x-[8%] -translate-y-[6%]">
          <HeroCampaignDemo />
        </div>
      </div>
    </div>
  );
}
