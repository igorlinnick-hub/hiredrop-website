import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const FAQS = [
  {
    q: "What is HireDrop?",
    a: "HireDrop is an AI-powered platform that automates your job search. It finds matching jobs across multiple platforms, writes personalized cover letters using AI, and auto-applies via our Chrome extension.",
  },
  {
    q: "How many applications can I send per day?",
    a: "Free users can send up to 5 applications per day on RemoteOK. Pro users can send up to 50 applications per day across all supported platforms.",
  },
  {
    q: "Which job platforms are supported?",
    a: "We currently support Indeed, RemoteOK, and Wellfound. More platforms are being added regularly. Free users have access to RemoteOK only.",
  },
  {
    q: "How does the Chrome extension work?",
    a: "Our Chrome extension automatically fills out job application forms, uploads your resume, and submits applications on Indeed. It runs in the background while you browse or sleep.",
  },
  {
    q: "Are the cover letters really personalized?",
    a: "Yes! Our AI (powered by Claude) analyzes your writing style, resume, and the specific job description to generate unique cover letters that sound like you wrote them.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, you can cancel your Pro subscription at any time from your account settings. Your account will revert to the free plan at the end of your billing period.",
  },
  {
    q: "Is my data safe?",
    a: "Absolutely. We use Supabase with row-level security, encrypted storage for resumes, and never sell your personal data to third parties.",
  },
  {
    q: "Do I need an invite code to sign up?",
    a: "Currently, yes. We're in early access and require an invite code to create an account. If you don't have one, you can join our waitlist and we'll notify you when spots open up.",
  },
];

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-600 mb-10">Everything you need to know about HireDrop.</p>

          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
