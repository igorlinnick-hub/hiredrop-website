import { PRICE_SENTENCE } from "@/lib/pricing";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service — HireDrop",
  description:
    "The terms that govern your use of HireDrop's AI-powered job application service: accounts, subscriptions, and acceptable use.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
            <p>Last updated: August 2026</p>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
              <p>By using HireDrop, you agree to these terms. If you do not agree, please do not use our service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Service Description</h2>
              <p>HireDrop is an AI-powered job search automation platform that finds jobs, generates cover letters, and submits applications on your behalf. We do not guarantee employment or interview outcomes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. User Responsibilities</h2>
              <p>You are responsible for providing accurate information in your profile and resume. You agree not to use the service for spam or to misrepresent your qualifications.</p>
              <p className="mt-2">HireDrop automates actions on third-party job platforms on your instruction. You are responsible for ensuring that your use of automation complies with the terms of the platforms you apply through, and you accept the risk that a platform may restrict or suspend your account on that platform in response to automated activity.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Subscription & Billing</h2>
              <p>HireDrop is billed at {PRICE_SENTENCE} — the full product on either plan. Subscriptions renew automatically at the end of each billing period until you cancel. You can cancel at any time in Settings → Billing (&quot;Manage subscription / cancel&quot;); cancellation takes effect at the end of the current billing period. Refunds are handled on a case-by-case basis.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. User Content & Copyright (DMCA)</h2>
              <p>You retain ownership of the content you upload (resume, writing samples, profile information) and grant us a license to use it solely to provide the service. You agree not to upload content you do not have the right to use.</p>
              <p className="mt-2">If you believe content on HireDrop infringes your copyright, send a takedown notice to support@hiredrop.io with the material identified and your contact information. We will remove or disable access to infringing content and may terminate accounts of repeat infringers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
              <p>HireDrop is provided &quot;as is&quot; without warranties of any kind. We do not guarantee employment, interviews, or responses from employers. We are not liable for missed applications, rejected submissions, actions taken by job platforms (including account restrictions), or job platform policy changes that may affect service functionality.</p>
              <p className="mt-2">To the maximum extent permitted by law, HireDrop&apos;s total liability for any claims arising out of or relating to the service shall not exceed the amount you paid to HireDrop in the twelve (12) months preceding the claim. In no event shall HireDrop be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits or lost employment opportunities.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Indemnification</h2>
              <p>You agree to indemnify and hold HireDrop and its operators harmless from any claims, damages, or expenses (including reasonable attorneys&apos; fees) arising from content you upload, your violation of these terms, or your use of the service in violation of applicable law or third-party rights.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Governing Law</h2>
              <p>These terms are governed by the laws of the State of Hawaii, USA, without regard to its conflict-of-law provisions. Nothing in this section deprives you of mandatory consumer protections of the jurisdiction in which you reside.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
              <p>For questions about these terms, contact us at support@hiredrop.io.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
