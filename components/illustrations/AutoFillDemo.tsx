"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Auto-fill process animation for the signup showcase panel.
 * Demonstrates the product: HireDrop filling a job application field by field,
 * then submitting — the "watch how we apply" story, on-brand and ban-safe.
 */

const FIELDS = [
  { label: "Full name", value: "Alex Morgan" },
  { label: "Email", value: "alex.morgan@gmail.com" },
  { label: "Phone", value: "+1 (415) 555-0132" },
];

// timeline steps: 0..2 text fields, 3 resume, 4 cover letter, 5 screener, 6 submit, 7 done
const TOTAL = 8;
const TICK = 950;

export default function AutoFillDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (TOTAL + 1)), TICK);
    return () => clearInterval(t);
  }, []);

  const submitting = step >= 6;
  const done = step >= 7;

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center px-10 py-14"
      style={{ background: "linear-gradient(160deg, #EEE9FF 0%, #F7F7FB 55%, #ffffff 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* agent status */}
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-accent ${done ? "" : "animate-ping opacity-60"}`} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <span className="text-sm font-medium text-[#1A1A2E]">
            {done ? "Application submitted" : "HireDrop is applying…"}
          </span>
        </div>

        {/* application card */}
        <div className="rounded-2xl bg-white border border-[#EEE9FF] p-6" style={{ boxShadow: "0 20px 50px rgba(108,92,231,0.14)" }}>
          {/* job header */}
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#F0EEFA]">
            <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center text-accent font-bold text-sm">S</div>
            <div>
              <p className="text-sm font-semibold text-[#1A1A2E] leading-tight">Marketing Manager</p>
              <p className="text-xs text-[#6B6B8A]">Stripe · Remote</p>
            </div>
          </div>

          {/* text fields */}
          <div className="space-y-3">
            {FIELDS.map((f, i) => (
              <Field key={f.label} label={f.label} value={f.value} active={step === i} filled={step > i} />
            ))}

            {/* resume */}
            <div>
              <p className="text-[11px] text-[#6B6B8A] mb-1">Resume</p>
              <div className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors ${step >= 3 ? "border-[#E8E8F0] bg-[#F7F7FB]" : "border-dashed border-[#E8E8F0]"}`}>
                <AnimatePresence>
                  {step >= 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      <Check />
                      <span className="text-[#1A1A2E]">alex-resume.pdf</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* cover letter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-[#6B6B8A]">Cover letter</p>
                {step === 4 && <span className="text-[10px] text-accent">writing…</span>}
              </div>
              <div className="rounded-lg border border-[#E8E8F0] bg-[#F7F7FB] p-2.5 space-y-1.5 min-h-[46px]">
                {[0, 1, 2].map((r) => (
                  <motion.div
                    key={r}
                    initial={{ width: 0, opacity: 0 }}
                    animate={step >= 4 ? { width: r === 2 ? "60%" : "100%", opacity: 1 } : { width: 0, opacity: 0 }}
                    transition={{ delay: step >= 4 ? r * 0.18 : 0, duration: 0.35 }}
                    className="h-1.5 rounded-full bg-[#D9D2F5]"
                  />
                ))}
              </div>
            </div>

            {/* screener */}
            <div className={`flex items-center justify-between transition-opacity ${step >= 5 ? "opacity-100" : "opacity-40"}`}>
              <p className="text-xs text-[#1A1A2E]">Authorized to work in the US?</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${step >= 5 ? "bg-green/10 text-green" : "text-[#6B6B8A]"}`}>
                {step >= 5 ? "Yes" : "—"}
              </span>
            </div>
          </div>

          {/* submit */}
          <motion.div
            className={`mt-5 h-11 rounded-xl flex items-center justify-center text-sm font-semibold ${done ? "bg-green text-white" : submitting ? "bg-accent text-white" : "bg-accent/40 text-white"}`}
            animate={submitting && !done ? { scale: [1, 0.97, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            {done ? (
              <span className="flex items-center gap-2"><Check light /> Applied</span>
            ) : (
              "Submit application"
            )}
          </motion.div>
        </div>

        <p className="text-center text-xs text-[#6B6B8A] mt-4">
          From your own browser · at a human pace · you review first
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, active, filled }: { label: string; value: string; active: boolean; filled: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-[#6B6B8A] mb-1">{label}</p>
      <div className={`h-9 px-3 rounded-lg border flex items-center text-sm text-[#1A1A2E] transition-colors ${active ? "border-accent ring-2 ring-accent/15" : "border-[#E8E8F0]"} ${filled || active ? "bg-white" : "bg-[#F7F7FB]"}`}>
        <AnimatePresence mode="wait">
          {(filled || active) && (
            <motion.span key="v" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {value}
            </motion.span>
          )}
        </AnimatePresence>
        {active && <span className="inline-block w-[2px] h-4 bg-accent ml-0.5 animate-pulse" />}
      </div>
    </div>
  );
}

function Check({ light }: { light?: boolean }) {
  return (
    <svg className={`w-4 h-4 ${light ? "text-white" : "text-green"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
