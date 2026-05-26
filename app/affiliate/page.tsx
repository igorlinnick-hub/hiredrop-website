import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import Link from "next/link";

export default function AffiliatePage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Program</h1>
          <p className="text-gray-600 mb-10">Earn by sharing HireDrop with your audience.</p>

          <div className="space-y-8">
            <div className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How it works</h2>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <span className="w-7 h-7 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <p>Sign up for the affiliate program and get your unique referral link.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <p>Share your link with your audience — on social media, blogs, YouTube, or email.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <p>Earn 30% recurring commission for every Pro subscriber you refer.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 text-center">
                <p className="text-2xl font-bold text-accent">30%</p>
                <p className="text-xs text-gray-500 mt-1">Recurring commission</p>
              </div>
              <div className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 text-center">
                <p className="text-2xl font-bold text-accent">60 days</p>
                <p className="text-xs text-gray-500 mt-1">Cookie duration</p>
              </div>
              <div className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 text-center">
                <p className="text-2xl font-bold text-accent">Monthly</p>
                <p className="text-xs text-gray-500 mt-1">Payouts via PayPal</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                The affiliate program is launching soon. Sign up to be notified.
              </p>
              <Link
                href="/signup"
                className="inline-block bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-3.5 rounded-[10px] text-lg transition shadow-lg shadow-accent/25"
              >
                Join Waitlist
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
