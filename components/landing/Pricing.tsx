import Link from "next/link";

import {
  MONTHLY_PRICE,
  MONTHLY_SAVING_NOTE,
  WEEKLY_EQUIVALENT_NOTE,
  WEEKLY_PRICE,
} from "@/lib/pricing";

import ScrollReveal from "./ScrollReveal";
import DropCameo from "./DropCameo";

const INCLUDED = [
  "Ban-safe auto-apply — Indeed, ZipRecruiter & company ATS",
  "Cover letters written in your voice, per role",
  "ATS resume tailored to each job",
  "Handles complex ATS — Greenhouse, Lever & Ashby",
  "Up to 30 applications a day, human-paced",
  "You review before anything sends",
];

const PLANS = [
  {
    name: "Weekly",
    price: WEEKLY_PRICE,
    period: "/week",
    // We do the arithmetic for the reader instead of hiding it behind a per-week number
    // computed on a different billing period — the trick that makes competitor tables
    // impossible to compare.
    compare: WEEKLY_EQUIVALENT_NOTE,
    note: "Pay only while you're actively searching.",
    highlighted: false,
  },
  {
    name: "Monthly",
    price: MONTHLY_PRICE,
    period: "/month",
    compare: MONTHLY_SAVING_NOTE,
    note: "Best value if your search runs a little longer.",
    highlighted: true,
    badge: "Best value",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#101014] pb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Try it free. Pay while you search.
          </h2>
          <p className="mt-4 text-lg text-[#5C574F] max-w-xl mx-auto">
            Your first 40 applications are free — no card, no catch. After that, one simple
            plan, weekly or monthly. Cancel anytime in one click.
          </p>
        </ScrollReveal>

        {/* Free taste — the top of the funnel, deliberately NOT styled as a third plan */}
        <ScrollReveal>
          <div className="max-w-2xl mx-auto mb-8 sm:mb-24 rounded-2xl border-2 border-dashed border-[#101014]/25 bg-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#101014] uppercase tracking-wide">Start here — free</p>
              <p className="mt-1.5 text-2xl font-bold text-[#101014]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Your first 40 applications, on us
              </p>
              <p className="mt-2 text-sm text-[#5C574F]">
                Full auto-apply + tailored cover letters. No credit card. See real applications go
                out before you spend a dollar. (ATS resume tailoring stays a paid feature.)
              </p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 bg-[#101014] hover:bg-[#26262F] text-white font-semibold px-7 py-3 rounded-[10px] text-center shadow-lg shadow-black/15 transition"
            >
              Apply to 40 jobs free
            </Link>
          </div>
        </ScrollReveal>

        {/* Two plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.12}>
              <div
                className={[
                  "card-lift relative rounded-2xl p-7 bg-white h-full flex flex-col",
                  plan.highlighted
                    ? "border-2 border-[#101014] shadow-xl shadow-black/5"
                    : "border border-[#E7E0D2]",
                ].join(" ")}
              >
                {/* Drop sits on the edge of the monthly card, legs over the front */}
                {plan.highlighted && (
                  <DropCameo pose="sit" width={96} enter="down" delay={0.3} className="hidden sm:block absolute -top-[100px] right-6 z-20" />
                )}
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#101014] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className="text-sm font-semibold text-[#101014]">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#101014]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {plan.price}
                  </span>
                  <span className="text-[#5C574F]">{plan.period}</span>
                </div>
                {/* The honest comparison, stated rather than hidden: weekly shown as its
                    monthly cost, monthly shown as what it saves. No countdown, no
                    strikethrough anchor, no third tier that exists to flatter another. */}
                <p className="mt-1 text-xs text-[#5C574F]/80">{plan.compare}</p>
                <p className="mt-2 text-sm text-[#5C574F] flex-1">{plan.note}</p>
                <Link
                  href="/signup"
                  className={[
                    "btn-primary mt-6 block text-center py-3 px-6 rounded-[10px] font-semibold",
                    plan.highlighted
                      ? "bg-[#101014] hover:bg-[#26262F] text-white shadow-lg shadow-black/15"
                      : "border border-[#E7E0D2] hover:border-[#101014] text-[#101014]",
                  ].join(" ")}
                >
                  Start applying
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Shared feature list — identical on both plans */}
        <ScrollReveal>
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E7E0D2] p-6 sm:p-7">
            <p className="text-sm font-semibold text-[#101014] mb-4">Everything is included on both plans</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#101014]">
                  <svg className="w-5 h-5 text-[#00B894] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
