"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Plan-selection interstitial (pre-billing stub).
 *
 * Stripe isn't wired yet, so nobody is charged — the step exists to (a) set
 * the expectation that HireDrop is paid, and (b) record which plan each user
 * picks (user_metadata.selected_plan) so we have real conversion data before
 * checkout ships. Copy stays honest: early access is free, we email before
 * billing starts. Swap the Continue handler for Stripe Checkout when billing
 * lands.
 */
const PLANS = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$9",
    period: "/week",
    note: "Sprint mode — cancel the moment you sign an offer.",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$29",
    period: "/month",
    note: "Best value for a full search — about $1 a day.",
    highlight: true,
  },
];

export default function StepPlan({ onNext, onBack }: Props) {
  const supabase = createClient();
  const [selected, setSelected] = useState("monthly");
  const [saving, setSaving] = useState(false);

  async function continueWithPlan() {
    setSaving(true);
    // Best-effort: the choice is analytics, not a gate — never block onboarding on it.
    try {
      await supabase.auth.updateUser({ data: { selected_plan: selected } });
    } catch {
      // ignore
    }
    setSaving(false);
    onNext();
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 text-center"
    >
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-2xl font-bold text-text leading-tight">Pick your plan</h2>
        <p className="text-sm text-text2 max-w-md mx-auto">
          One simple plan, two ways to pay. Full product on both — cancel anytime in one click.
        </p>
      </motion.div>

      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <motion.button
              key={plan.id}
              type="button"
              variants={item}
              onClick={() => setSelected(plan.id)}
              className={[
                "relative rounded-2xl p-6 bg-surface text-left transition h-full flex flex-col",
                isSelected
                  ? "border-2 border-accent shadow-lg shadow-accent/10"
                  : "border border-border hover:border-accent/40",
              ].join(" ")}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Best value
                </span>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text">{plan.name}</p>
                <span
                  className={[
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    isSelected ? "border-accent bg-accent" : "border-border",
                  ].join(" ")}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text">{plan.price}</span>
                <span className="text-text2 text-sm">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-text2 flex-1">{plan.note}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="p-3.5 rounded-xl bg-green/10 border border-green/20 text-left flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-green/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-green" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-text">
          <span className="font-semibold">Early access — it&apos;s free for now.</span>{" "}
          You won&apos;t be charged today. We&apos;ll email you before paid plans go live, and you can cancel then.
        </p>
      </motion.div>

      <motion.div variants={item} className="flex justify-between items-center pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="button" onClick={continueWithPlan} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
