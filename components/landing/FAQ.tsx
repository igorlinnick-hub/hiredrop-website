"use client";

import { useState } from "react";

const QUESTIONS = [
  {
    q: "Will this get my account banned?",
    a: "No. HireDrop applies from your own browser at a human pace — the same way you would, just faster. We never crack captchas or run server bots that platforms flag, and built-in daily limits keep everything human-paced.",
  },
  {
    q: "How does auto-apply work?",
    a: "The Chrome extension reads matching listings, fills the application form with your profile, attaches your resume, and writes a tailored cover letter — then submits from your own browser. By default you review each one before it sends; switch to auto anytime.",
  },
  {
    q: "Which platforms are supported?",
    a: "Indeed and ZipRecruiter today, plus thousands of company application forms via their ATS (Greenhouse, Lever, Workday, Ashby). More platforms are being added.",
  },
  {
    q: "What are Apply Modes?",
    a: "You choose how selective the AI is: Broad (explore widely), Standard (focused by specialty), or Precise (only the best-matched roles). It's quality over volume — apply where you actually fit.",
  },
  {
    q: "Will my applications look spammy?",
    a: "No. A fresh resume and cover letter are tailored to each role and submitted one at a time at natural timing — not hundreds of identical blasts. Employers see a normal application, no HireDrop branding.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Data is stored on Supabase with row-level security and resumes are in encrypted storage. We never sell your data.",
  },
  {
    q: "How much does it cost?",
    a: "$9/week or $29/month — the full product on both, cancel anytime. Weekly is great while you're actively searching; monthly is better value if it runs longer. Have a promo code? Enter it at signup for free access.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#E8E8F0]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-medium text-[#1A1A2E] pr-4 group-hover:text-[#6C5CE7] transition-colors">
          {q}
        </span>
        <span
          className="shrink-0 w-6 h-6 flex items-center justify-center text-[#6B6B8A] transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "200px" : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="text-sm text-[#6B6B8A] leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20">
          {/* Left — title */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Frequently<br />asked<br />questions
            </h2>
            <p className="mt-4 text-[#6B6B8A]">
              Everything you need to know about HireDrop.
            </p>
          </div>

          {/* Right — accordion */}
          <div>
            {QUESTIONS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
