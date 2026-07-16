import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const FAQS = [
  {
    q: "What is HireDrop?",
    a: "HireDrop is an AI job-application agent. It finds matching roles, tailors your resume and cover letter for each one, and applies from your own browser — the safe way, with you in control.",
  },
  {
    q: "Will this get my account banned?",
    a: "No. HireDrop applies from your own browser at a human pace — the way you would, just faster. We never crack captchas or run server bots that platforms flag, and built-in daily limits keep everything human-paced.",
  },
  {
    q: "How many applications can I send per day?",
    a: "There's a human-paced daily limit that protects your account — up to 30 applications a day (20 per platform). It's about applying to the right roles, not blasting hundreds.",
  },
  {
    q: "Which job platforms are supported?",
    a: "Indeed and ZipRecruiter today, plus thousands of company application forms via their ATS (Greenhouse, Lever, Workday, Ashby). More platforms are being added.",
  },
  {
    q: "How does the Chrome extension work?",
    a: "It reads matching listings, fills the application form with your profile, attaches your resume, writes a tailored cover letter, and submits — all from your own browser. By default you review each application before it sends.",
  },
  {
    q: "What are Apply Modes?",
    a: "You choose how selective the AI is: Broad, Standard, or Precise. Precise applies only to the best-matched roles — quality over volume, so you apply where you actually fit.",
  },
  {
    q: "Are the cover letters really personalized?",
    a: "Yes. Our AI (powered by Claude) analyzes your writing style, resume, and the specific job description to generate a cover letter that sounds like you wrote it — for every role.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We use Supabase with row-level security, encrypted storage for resumes, and never sell your personal data to third parties.",
  },
  {
    q: "How much does it cost?",
    a: "$9/week or $29/month — the full product on both plans, cancel anytime in one click. Weekly suits an active search; monthly is better value if it runs longer. Have a promo code? Enter it at signup for free access.",
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
