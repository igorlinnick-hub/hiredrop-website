import Link from "next/link";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

import ChoicesClient from "./ChoicesClient";

export const metadata = {
  title: "Your Privacy Choices — HireDrop",
  description: "Opt out of ad measurement on HireDrop (sharing for cross-context behavioral advertising).",
  // A settings page, not content — nothing here for search to show.
  robots: { index: false, follow: true },
};

export default function PrivacyChoicesPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Privacy Choices</h1>

          <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
            <p>
              We advertise HireDrop on Meta (Facebook, Instagram) and Google, and our public pages
              load their tags so we can tell which ads lead to a sign-up or a purchase. Under
              California law that can count as &ldquo;sharing&rdquo; your personal information, even
              though we don&apos;t sell it for money. Opting out stops those tags in this browser,
              and if you are signed in, it also stops our server from reporting your account&apos;s
              conversions (first application, purchase) to Meta. Your resume and job applications
              are never sent to ad platforms either way.
            </p>

            <ChoicesClient />

            <p>
              Details are in our{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>{" "}
              (sections 6 and 7). Questions: support@hiredrop.io.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
