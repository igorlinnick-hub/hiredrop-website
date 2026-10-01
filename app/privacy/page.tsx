import Link from "next/link";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy — HireDrop",
  description:
    "How HireDrop collects, uses, and protects your data: resume and profile information, application history, and your rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
            <p>Last updated: September 30, 2026</p>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly: name, email, resume PDF, job preferences, and writing style samples. We also collect activity data such as which jobs you applied to, application timestamps, and per-platform application counts.</p>
              <p className="mt-2">When you arrive from a link or an ad, we record the campaign details in that link (for example <code>utm_source</code>, a referral code, or an ad click ID such as <code>fbclid</code> or <code>gclid</code>) and store them with your account when you sign up, together with the advertising cookie IDs described in section 6.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
              <p>Your data is used to: find matching jobs, generate personalized cover letters via the Anthropic Claude API, submit applications on your behalf, and surface usage statistics in your dashboard, and measure which of our ads bring people who sign up and subscribe (section 6).</p>
              <p className="mt-2">We do not sell your personal data for money. Ad measurement may count as &ldquo;sharing&rdquo; personal information under California law &mdash; you can opt out on our <Link href="/privacy/choices" className="text-accent hover:underline">Your Privacy Choices</Link> page (section 7).</p>
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
              <p>We use Supabase (auth + Postgres + Storage), Anthropic Claude (cover letter generation), Google OAuth (optional sign-in), Vercel (website hosting and cookieless, aggregate analytics), Resend (transactional email such as password resets), Stripe (payment processing when you purchase a subscription), Meta and Google (advertising measurement, see section 6), and the job platforms and application systems you apply through (Indeed, ZipRecruiter, and company applicant-tracking systems such as Greenhouse, Lever, and Ashby). We share with each only the data needed for its function.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Advertising and Ad Measurement</h2>
              <p>We advertise HireDrop on Meta (Facebook and Instagram) and Google Search. To learn which ads bring people who sign up and buy, our public pages &mdash; the home page, guides, comparisons, FAQ, affiliate page, and the sign-up and log-in pages &mdash; load the Meta Pixel and the Google Ads tag. These tags set cookies on our site and send Meta and Google the page you viewed, the ad click ID in the link you arrived from, and technical data such as your IP address and browser type.</p>
              <p className="mt-2">The tags are not loaded in the product dashboard or onboarding, which hold your resume and applications. Two events can still come from there. When you create an account, the first page you see afterwards reports that a sign-up happened, tagged with a random internal ID so it is never counted twice; it carries no name, email, or other account content. And if a tag is already running in your browser tab because you came from one of our public pages, starting a Stripe checkout reports that a checkout began and the plan price.</p>
              <p className="mt-2">If you arrived from a Meta ad, our server also reports two later events to Meta through the Meta Conversions API: your first application and a purchase (with its amount). These reports include your email address in hashed (SHA-256) form, the Meta cookie IDs (<code>_fbp</code>/<code>_fbc</code>), and your browser&apos;s user-agent string, so Meta can match them to the ad. We never send your resume, job preferences, the jobs you applied to, cover letters, or application answers to any advertising platform.</p>
              <p className="mt-2">Meta and Google use this information under their own terms and privacy policies (<a href="https://www.facebook.com/privacy/policy/" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Meta</a>, <a href="https://policies.google.com/privacy" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Google</a>) to measure and deliver ads.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Your Privacy Choices (California and other U.S. states)</h2>
              <p>Under the California Consumer Privacy Act as amended by the CPRA, letting ad platforms use this information for cross-context behavioral advertising can count as &ldquo;sharing&rdquo; your personal information, even though no money changes hands. You can opt out at any time on our <Link href="/privacy/choices" className="text-accent hover:underline">Your Privacy Choices</Link> page: the tags stop loading in that browser, and if you are signed in when you opt out, our server stops reporting your account&apos;s conversions too.</p>
              <p className="mt-2">We honor Global Privacy Control automatically. If your browser sends a GPC signal, we treat it as an opt-out and the advertising tags do not load. We will not treat you differently for exercising any of these choices.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Your Rights</h2>
              <p>You can view and update your personal data at any time through your account settings. To delete your account and personal data, email support@hiredrop.io from your account email address. We will erase your profile, resume, application history, and stored sessions within 30 days, except where retention is required by law (for example, billing records).</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Signing In With Google</h2>
              <p>Signing in with Google is optional; you can always use an email and password instead. If you choose it, Google shares with HireDrop only your basic profile: your name, email address, profile picture, and Google account ID (the <code>openid</code>, <code>email</code>, and <code>profile</code> scopes). We do not request access to Gmail, Google Drive, Google Calendar, contacts, or any other Google data.</p>
              <p className="mt-2">We use this information to create your HireDrop account and sign you in, and to pre-fill your name during onboarding, where you can change it. Your email address then serves as your account email, the same as if you had typed it in: for messages you request, such as password resets, and in hashed form for the ad measurement described in section 6, which you can opt out of (section 7). We do not use your profile picture.</p>
              <p className="mt-2">We do not sell data received from Google, do not use it to train AI models, and do not share it with anyone other than the service providers that run HireDrop (Supabase stores your account). HireDrop&apos;s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>
              <p className="mt-2">You can disconnect HireDrop from your Google account at any time at <a href="https://myaccount.google.com/connections" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">myaccount.google.com/connections</a>; to delete the data itself, follow section 8.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Contact</h2>
              <p>Questions about this privacy policy or about data we hold on you: support@hiredrop.io.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
