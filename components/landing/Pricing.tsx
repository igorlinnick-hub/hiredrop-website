"use client";

import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try HireDrop, no card required",
    features: [
      "Job discovery across boards",
      "10 applications per day",
      "Basic cover letters",
      "ATS keyword match",
    ],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "Full automation for serious job seekers",
    features: [
      "Everything in Free",
      "Indeed auto-apply (Chrome Extension)",
      "All platforms",
      "50 applications per day",
      "AI cover letters in your voice",
      "Email response monitoring",
    ],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$29",
    period: "/month",
    description: "Maximum interview rate",
    features: [
      "Everything in Pro",
      "AI resume tailored to each job",
      "ATS-optimized, per-application",
      "Priority support",
    ],
    cta: "Go Premium",
    href: "/signup?plan=premium",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Syne', sans-serif" }}>
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-[#6B6B8A] max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready to automate your entire job search.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.15}>
              <div
                className={[
                  "relative rounded-[10px] p-8 flex flex-col h-full",
                  plan.highlighted
                    ? "bg-white border-2 border-accent shadow-xl shadow-accent/10 scale-105"
                    : "bg-white border border-[#E8E8F0] shadow-[var(--shadow)]",
                ].join(" ")}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#1A1A2E]">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Syne', sans-serif" }}>{plan.price}</span>
                    {plan.period && (
                      <span className="text-[#6B6B8A]">{plan.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#6B6B8A]">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#6B6B8A]">
                      <svg className="w-5 h-5 text-[#00B894] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={[
                    "btn-primary block text-center py-3 px-6 rounded-[10px] font-medium",
                    plan.highlighted
                      ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25"
                      : "border border-[#E8E8F0] hover:border-accent text-[#1A1A2E]",
                  ].join(" ")}
                >
                  {plan.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
