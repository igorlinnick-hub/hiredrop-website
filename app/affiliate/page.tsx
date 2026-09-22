import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import AffiliateHero from "@/components/affiliate/AffiliateHero";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Affiliate Program — HireDrop",
  description:
    "Earn 30% recurring commission for every subscriber you refer. Share HireDrop's AI job-application agent with your audience.",
  path: "/affiliate",
});

const STEPS = [
  {
    n: "1",
    title: "Ask for your link",
    body: "A short form — who you'd share it with and the link name you want. A person reads it, usually the same day.",
  },
  {
    n: "2",
    title: "Share it",
    body: "hiredrop.io/?ref=yourname. A post, a class group chat, a newsletter, a QR on a card. Anyone who opens it is yours for 60 days.",
  },
  {
    n: "3",
    title: "Get paid monthly",
    body: "30% of every payment they make, every month they stay subscribed. Sent by PayPal once you're over $25.",
  },
];

const FACTS = [
  ["30%", "Of every payment, not just the first"],
  ["60 days", "Your link keeps counting after the click"],
  ["$25", "Minimum payout, sent monthly by PayPal"],
];

export default function AffiliatePage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <AffiliateHero
            eyebrow="HireDrop affiliate program"
            title={
              <>
                Everyone you know is <em className="italic">job hunting</em>. Get paid for the tip.
              </>
            }
            body="30% of every payment the people you refer make — every month they stay, not just the first one. Paid by PayPal."
            cta={{ label: "Apply for your link", href: "/affiliate/apply" }}
            note="Approved links appear under Affiliate in your HireDrop dashboard, with your opens, referrals and earnings next to them."
          />

          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              How it works
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="bg-white rounded-[14px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-7"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {FACTS.map(([big, small]) => (
              <div
                key={big}
                className="bg-white rounded-[14px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-7"
              >
                <p className="text-3xl font-bold text-accent" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {big}
                </p>
                <p className="mt-2 text-sm text-gray-600">{small}</p>
              </div>
            ))}
          </section>

          {/* Said plainly and early, because every one of these is a reason
              someone walks away later feeling misled. */}
          <section className="mt-12 rounded-[14px] border border-gray-100 bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <h2 className="text-[17px] font-semibold text-gray-900">The honest small print</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
              <li>
                <span className="font-medium text-gray-900">You earn from payments, not signups.</span>{" "}
                A referral who never subscribes is worth $0 — to us and to you.
              </li>
              <li>
                <span className="font-medium text-gray-900">Refunds come back out.</span> If someone
                you referred gets refunded inside 30 days, that commission is reversed. It's why
                payouts wait out the refund window.
              </li>
              <li>
                <span className="font-medium text-gray-900">Links are issued by hand.</span> We read
                who you are before your link can earn. It keeps the program small and the payouts real.
              </li>
              <li>
                <span className="font-medium text-gray-900">You must disclose it.</span> &ldquo;I get
                a cut if you sign up&rdquo; or #ad, every time you share. That&apos;s an FTC rule, not
                our preference.
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
