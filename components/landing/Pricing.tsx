import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

const INCLUDED = [
  "Ban-safe auto-apply — Indeed, ZipRecruiter & company ATS",
  "AI cover letters written in your voice, per role",
  "ATS resume tailored to each job",
  "Handles complex ATS — Workday, Greenhouse, Lever",
  "Up to 30 applications a day, human-paced",
  "You review before anything sends",
];

const PLANS = [
  {
    name: "Weekly",
    price: "$9",
    period: "/week",
    note: "Pay only while you're actively searching.",
    highlighted: false,
  },
  {
    name: "Monthly",
    price: "$29",
    period: "/month",
    note: "Best value if your search runs a little longer.",
    highlighted: true,
    badge: "Best value",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F7F7FB]">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] pb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Pay while you search
          </h2>
          <p className="mt-4 text-lg text-[#6B6B8A] max-w-xl mx-auto">
            One simple plan — weekly or monthly. Full product, no free-trial games. Cancel anytime in one click.
          </p>
        </ScrollReveal>

        {/* Two plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.12}>
              <div
                className={[
                  "card-lift relative rounded-2xl p-7 bg-white h-full flex flex-col",
                  plan.highlighted
                    ? "border-2 border-accent shadow-xl shadow-accent/10"
                    : "border border-[#E8E8F0]",
                ].join(" ")}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className="text-sm font-semibold text-[#1A1A2E]">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {plan.price}
                  </span>
                  <span className="text-[#6B6B8A]">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-[#6B6B8A] flex-1">{plan.note}</p>
                <Link
                  href="/signup"
                  className={[
                    "btn-primary mt-6 block text-center py-3 px-6 rounded-[10px] font-semibold",
                    plan.highlighted
                      ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25"
                      : "border border-[#E8E8F0] hover:border-accent text-[#1A1A2E]",
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
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E8E8F0] p-6 sm:p-7">
            <p className="text-sm font-semibold text-[#1A1A2E] mb-4">Everything is included on both plans</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#1A1A2E]">
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
