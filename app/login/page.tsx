import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

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
            <Link href="/" className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Syne', sans-serif" }}>
              <span className="text-[#6C5CE7]">Hire</span>Drop
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Syne', sans-serif" }}>Welcome back</h1>
            <p className="mt-2 text-sm text-[#6B6B8A]">Sign in to your HireDrop account</p>
          </div>

          <div className="bg-white border border-[#E8E8F0] rounded-xl p-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-[#6B6B8A]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6C5CE7] hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* Right — cloud visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#f0f4ff] relative overflow-hidden">
        {/* Morphing blob */}
        <div
          className="absolute w-[400px] h-[400px]"
          style={{
            background: "linear-gradient(135deg, #c4b5fd, #ddd6fe, #ede9fe)",
            animation: "morphBlob 8s ease infinite alternate",
            borderRadius: "60% 40% 70% 30% / 30% 60% 40% 70%",
          }}
        />

        {/* Content inside blob area */}
        <div className="relative z-10 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-5 border border-white/50" style={{ boxShadow: "0 8px 32px rgba(108,92,231,0.1)" }}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#6B6B8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[#1A1A2E] text-sm">
                Find your next job...
                <span className="inline-block w-[2px] h-4 bg-[#6C5CE7] ml-1 align-middle animate-pulse" />
              </span>
            </div>
          </div>
          <p className="mt-6 text-sm text-[#6B6B8A]">Applies from your own browser — your account stays safe</p>
        </div>
      </div>
    </div>
  );
}
