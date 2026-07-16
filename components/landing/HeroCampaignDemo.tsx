"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AIOrb from "./AIOrb";

/**
 * Hero visual — an animated "campaign running" story:
 *   idle → press Start → the AI orb activates → the agent fills a job
 *   application on the right while its reasoning appears as thoughts on the left
 *   → "Applied" → loops.
 * Replaces the old random-Q&A orb (which read as illogical).
 */

// step -1 = idle (Start button). 0..6 = running. 7 = done/hold, then reset.
const LAST = 6;
const TICK = 2600;      // slow enough to read each thought + watch each field fill
const IDLE_MS = 2000;
const DONE_MS = 3400;

const THOUGHTS: Record<number, string> = {
  0: "Analyzing your resume…",
  1: "Working at a human pace…",
  2: "Attaching the right resume…",
  3: "Writing your cover letter…",
  4: "Answering screening questions…",
  5: "Submitting — safely…",
  6: "Done — applied for you.",
};

export default function HeroCampaignDemo() {
  const [step, setStep] = useState(-1);

  // Self-driving loop: idle → run steps → hold → reset.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === -1) timer = setTimeout(() => setStep(0), IDLE_MS);
    else if (step <= LAST) timer = setTimeout(() => setStep(step + 1), TICK);
    else timer = setTimeout(() => setStep(-1), DONE_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const running = step >= 0 && step <= LAST;
  const done = step >= LAST;

  return (
    <div className="relative w-full max-w-[480px] min-h-[420px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {step === -1 ? (
          /* ── idle: just a Start button ── */
          <motion.button
            key="idle"
            type="button"
            onClick={() => setStep(0)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2.5 bg-accent text-white font-semibold px-7 py-4 rounded-2xl shadow-lg"
            style={{ boxShadow: "0 12px 32px rgba(108,92,231,0.3)" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start campaign
          </motion.button>
        ) : (
          /* ── running: orb + thoughts (left) · form fill (right) ── */
          <motion.div
            key="run"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="w-full rounded-3xl bg-white border border-[#EEE9FF] p-5 flex gap-4"
            style={{ boxShadow: "0 20px 50px rgba(108,92,231,0.14)" }}
          >
            {/* left — orb + reasoning, vertically centred against the form */}
            <div className="w-[128px] shrink-0 flex flex-col items-center justify-center">
              <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
                <AIOrb size={72} />
              </motion.div>
              <div className="mt-4 min-h-[64px] w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="bg-[#F5F3FF] rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] leading-snug text-[#4A3F8A]"
                  >
                    {THOUGHTS[Math.min(step, LAST)]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* right — the application filling in */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="relative flex h-2 w-2">
                  {!done && <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span className="text-xs font-medium text-[#1A1A2E]">Marketing Manager · Stripe</span>
              </div>

              <div className="space-y-2">
                <Row label="Name" value="Alex Morgan" show={step >= 0} active={step === 0} />
                <Row label="Email" value="alex.morgan@gmail.com" show={step >= 1} active={step === 1} />
                <FileRow show={step >= 2} active={step === 2} />
                <CoverRow show={step >= 3} active={step === 3} />
                <ScreenerRow show={step >= 4} />
              </div>

              <motion.div
                className={`mt-3 h-9 rounded-xl flex items-center justify-center text-xs font-semibold ${
                  done ? "bg-green text-white" : step >= 5 ? "bg-accent text-white" : "bg-accent/30 text-white"
                }`}
                animate={step === 5 && !done ? { scale: [1, 0.97, 1] } : {}}
              >
                {done ? "✓ Applied" : "Submit application"}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, show, active }: { label: string; value: string; show: boolean; active: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#6B6B8A] mb-0.5">{label}</p>
      <div className={`h-8 px-2.5 rounded-lg border flex items-center text-xs text-[#1A1A2E] transition-all duration-500 ${active ? "border-accent ring-2 ring-accent/15" : "border-[#E8E8F0]"} ${show ? "bg-white" : "bg-[#F7F7FB]"}`}>
        {show && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="truncate"
          >
            {value}
          </motion.span>
        )}
        {active && <span className="inline-block w-[2px] h-3.5 bg-accent ml-0.5 animate-pulse" />}
      </div>
    </div>
  );
}

function FileRow({ show, active }: { show: boolean; active: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#6B6B8A] mb-0.5">Resume</p>
      <div className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs transition-all duration-500 ${active ? "border-accent" : "border-[#E8E8F0]"} ${show ? "bg-white" : "bg-[#F7F7FB]"}`}>
        {show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="text-[#1A1A2E]">alex-resume.pdf</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CoverRow({ show, active }: { show: boolean; active: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[10px] text-[#6B6B8A]">Cover letter</p>
        {active && <span className="text-[9px] text-accent">writing…</span>}
      </div>
      <div className="rounded-lg border border-[#E8E8F0] bg-[#F7F7FB] p-2 space-y-1">
        {[0, 1, 2].map((r) => (
          <motion.div
            key={r}
            initial={{ width: 0, opacity: 0 }}
            animate={show ? { width: r === 2 ? "55%" : "100%", opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ delay: show ? r * 0.3 : 0, duration: 0.6, ease: "easeOut" }}
            className="h-1.5 rounded-full bg-[#D9D2F5]"
          />
        ))}
      </div>
    </div>
  );
}

function ScreenerRow({ show }: { show: boolean }) {
  return (
    <div className={`flex items-center justify-between transition-opacity ${show ? "opacity-100" : "opacity-40"}`}>
      <p className="text-[11px] text-[#1A1A2E]">Authorized to work in the US?</p>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${show ? "bg-green/10 text-green" : "text-[#6B6B8A]"}`}>
        {show ? "Yes" : "—"}
      </span>
    </div>
  );
}
