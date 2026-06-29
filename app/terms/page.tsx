import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
            <p>Last updated: March 2026</p>

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
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Subscription & Billing</h2>
              <p>Free accounts have limited features. Pro subscriptions are billed monthly at $16/month. You can cancel at any time. Refunds are handled on a case-by-case basis.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Limitation of Liability</h2>
              <p>HireDrop is provided &quot;as is&quot; without warranties. We are not liable for missed applications, rejected submissions, or job platform policy changes that may affect service functionality.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
              <p>For questions about these terms, contact us at support@hiredrop.io.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
