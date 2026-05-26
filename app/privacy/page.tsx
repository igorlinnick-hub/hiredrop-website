import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
            <p>Last updated: May 2026</p>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly: name, email, resume PDF, job preferences, and writing style samples. We also collect activity data such as which jobs you applied to, application timestamps, and per-platform application counts.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
              <p>Your data is used to: find matching jobs, generate personalized cover letters via the Anthropic Claude API, submit applications on your behalf, and surface usage statistics in your dashboard. We never sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. The HireDrop Chrome Extension</h2>
              <p>The HireDrop Chrome extension runs only on indeed.com and on the HireDrop dashboard domain. On indeed.com it reads job titles, company names, and form fields, then uses your stored profile to autofill the application; it submits an application only after you explicitly start a campaign in the extension popup or on the dashboard.</p>
              <p className="mt-2">The extension stores your Supabase session token in <code>chrome.storage.local</code> so it can authenticate API requests; this token never leaves your browser except when calling the HireDrop backend. Cached profile data is stored for 5 minutes to reduce API load. No data is shared with any third party other than the HireDrop backend, the Anthropic API (cover letters), and Supabase (storage).</p>
              <p className="mt-2">HireDrop is not affiliated with Indeed. Users are solely responsible for ensuring their use of automation tools complies with Indeed&apos;s terms of service and any other platform&apos;s terms they apply on.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Storage & Security</h2>
              <p>Your data is stored in Supabase with row-level security so each user can only access their own rows. Resume PDFs are stored in a private Supabase Storage bucket keyed by your user ID and downloaded only by the backend during application submissions. All transport is HTTPS.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Third-Party Services</h2>
              <p>We use Supabase (auth + Postgres + Storage), Anthropic Claude (cover letter generation), Google OAuth (optional sign-in), and the job platforms you connect (Indeed, RemoteOK, Wellfound). We share with each only the data needed for its function.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Your Rights</h2>
              <p>You can view, update, or delete your personal data at any time through your account settings or by emailing us. Account deletion removes your profile, resume, and stored sessions across all devices and extensions within 30 days.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact</h2>
              <p>Questions about this privacy policy or about data we hold on you: support@hiredrop.app.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
